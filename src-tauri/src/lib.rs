use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct BackupEntry {
    pub filename: String,
    pub path: String,
    pub size_bytes: u64,
    pub created_at: String,
    pub is_automatic: bool,
}

fn get_base_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to resolve app_data_dir: {}", e))?;
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    }
    Ok(base_dir)
}

fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = get_base_dir(app)?;
    Ok(base_dir.join("dnd5e-db.json"))
}

fn get_backups_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = get_base_dir(app)?;
    let backups_dir = base_dir.join("backups");
    if !backups_dir.exists() {
        fs::create_dir_all(&backups_dir)
            .map_err(|e| format!("Failed to create backups directory: {}", e))?;
    }
    Ok(backups_dir)
}

fn get_media_audio_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = get_base_dir(app)?;
    let media_dir = base_dir.join("media").join("audio");
    if !media_dir.exists() {
        fs::create_dir_all(&media_dir)
            .map_err(|e| format!("Failed to create media audio directory: {}", e))?;
    }
    Ok(media_dir)
}

/// Helper to format system time into readable ISO-like string
fn format_system_time(time: SystemTime) -> String {
    let duration = time.duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let days = secs / 86400;
    let rem_secs = secs % 86400;
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;
    let s = rem_secs % 60;

    let mut y = 1970i64;
    let mut d = days as i64;
    loop {
        let leap = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) { 1 } else { 0 };
        let year_days = 365 + leap;
        if d < year_days { break; }
        d -= year_days;
        y += 1;
    }
    let leap = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) { 1 } else { 0 };
    let month_days = [31, 28 + leap, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut m = 0;
    while m < 12 && d >= month_days[m] {
        d -= month_days[m];
        m += 1;
    }
    format!(
        "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
        y,
        m + 1,
        d + 1,
        hours,
        mins,
        s
    )
}

fn get_timestamp_slug() -> String {
    let duration = SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default();
    let secs = duration.as_secs();
    let days = secs / 86400;
    let rem_secs = secs % 86400;
    let hours = rem_secs / 3600;
    let mins = (rem_secs % 3600) / 60;
    let s = rem_secs % 60;

    let mut y = 1970i64;
    let mut d = days as i64;
    loop {
        let leap = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) { 1 } else { 0 };
        let year_days = 365 + leap;
        if d < year_days { break; }
        d -= year_days;
        y += 1;
    }
    let leap = if (y % 4 == 0 && y % 100 != 0) || (y % 400 == 0) { 1 } else { 0 };
    let month_days = [31, 28 + leap, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let mut m = 0;
    while m < 12 && d >= month_days[m] {
        d -= month_days[m];
        m += 1;
    }
    format!(
        "{:04}{:02}{:02}_{:02}{:02}{:02}",
        y,
        m + 1,
        d + 1,
        hours,
        mins,
        s
    )
}

/// Atomically write payload by writing to a temporary file, flushing, and renaming
fn atomic_write_file(target: &Path, content: &str) -> Result<(), String> {
    let parent = target
        .parent()
        .ok_or_else(|| "Target file has no parent directory".to_string())?;
    let tmp_path = parent.join(format!(
        ".{}.tmp.{}",
        target.file_name().unwrap_or_default().to_string_lossy(),
        get_timestamp_slug()
    ));

    {
        let mut file = fs::File::create(&tmp_path)
            .map_err(|e| format!("Failed to create temporary file: {}", e))?;
        file.write_all(content.as_bytes())
            .map_err(|e| format!("Failed to write to temporary file: {}", e))?;
        file.sync_all()
            .map_err(|e| format!("Failed to flush temporary file: {}", e))?;
    }

    if let Err(e) = fs::rename(&tmp_path, target) {
        if fs::copy(&tmp_path, target).is_ok() {
            let _ = fs::remove_file(&tmp_path);
            Ok(())
        } else {
            let _ = fs::remove_file(&tmp_path);
            Err(format!("Failed to atomically replace target file: {}", e))
        }
    } else {
        Ok(())
    }
}

/// Keep the newest N backups and prune older ones
fn prune_backups(backups_dir: &Path, max_keep: usize) {
    if let Ok(entries) = fs::read_dir(backups_dir) {
        let mut files: Vec<PathBuf> = entries
            .filter_map(|e| e.ok())
            .map(|e| e.path())
            .filter(|p| {
                p.is_file()
                    && p.extension().map(|ext| ext == "json").unwrap_or(false)
            })
            .collect();

        files.sort_by(|a, b| {
            let time_a = fs::metadata(a).and_then(|m| m.modified()).unwrap_or(UNIX_EPOCH);
            let time_b = fs::metadata(b).and_then(|m| m.modified()).unwrap_or(UNIX_EPOCH);
            time_b.cmp(&time_a)
        });

        if files.len() > max_keep {
            for old_file in &files[max_keep..] {
                let _ = fs::remove_file(old_file);
            }
        }
    }
}

/// Creates a backup snapshot from the current database file
fn create_backup_internal(
    app: &tauri::AppHandle,
    prefix: &str,
    is_automatic: bool,
) -> Result<BackupEntry, String> {
    let db_path = get_db_path(app)?;
    if !db_path.exists() {
        return Err("Cannot create backup: database file does not exist yet".to_string());
    }

    let meta = fs::metadata(&db_path).map_err(|e| format!("Failed to read db metadata: {}", e))?;
    if meta.len() == 0 {
        return Err("Cannot create backup: database file is empty".to_string());
    }

    let backups_dir = get_backups_dir(app)?;
    let clean_prefix = prefix
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>();
    let slug = get_timestamp_slug();
    let filename = format!("vellum-{}-{}.json", clean_prefix, slug);
    let target_backup_path = backups_dir.join(&filename);

    fs::copy(&db_path, &target_backup_path)
        .map_err(|e| format!("Failed to copy database to backup: {}", e))?;

    prune_backups(&backups_dir, 20);

    let backup_meta = fs::metadata(&target_backup_path)
        .map_err(|e| format!("Failed to read backup metadata: {}", e))?;
    let created_at = backup_meta
        .modified()
        .map(format_system_time)
        .unwrap_or_else(|_| format_system_time(SystemTime::now()));

    Ok(BackupEntry {
        filename,
        path: target_backup_path.to_string_lossy().to_string(),
        size_bytes: backup_meta.len(),
        created_at,
        is_automatic,
    })
}

#[tauri::command]
fn load_local_database(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let db_path = get_db_path(&app)?;
    if db_path.exists() {
        let meta = fs::metadata(&db_path).map_err(|e| format!("Failed to inspect database: {}", e))?;
        if meta.len() == 0 {
            let backups_dir = get_backups_dir(&app)?;
            if let Ok(entries) = fs::read_dir(&backups_dir) {
                let mut backups: Vec<PathBuf> = entries
                    .filter_map(|e| e.ok())
                    .map(|e| e.path())
                    .filter(|p| p.is_file() && p.extension().map(|x| x == "json").unwrap_or(false))
                    .collect();
                backups.sort_by(|a, b| {
                    let time_a = fs::metadata(a).and_then(|m| m.modified()).unwrap_or(UNIX_EPOCH);
                    let time_b = fs::metadata(b).and_then(|m| m.modified()).unwrap_or(UNIX_EPOCH);
                    time_b.cmp(&time_a)
                });
                if let Some(newest_backup) = backups.first() {
                    let recovered = fs::read_to_string(newest_backup)
                        .map_err(|e| format!("Failed to recover from backup: {}", e))?;
                    let _ = atomic_write_file(&db_path, &recovered);
                    return Ok(Some(recovered));
                }
            }
            return Ok(None);
        }

        let content = fs::read_to_string(&db_path)
            .map_err(|e| format!("Failed to read local database: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn save_local_database(app: tauri::AppHandle, payload: String) -> Result<String, String> {
    let db_path = get_db_path(&app)?;

    if db_path.exists() {
        if let Ok(meta) = fs::metadata(&db_path) {
            if meta.len() > 0 {
                let backups_dir = get_backups_dir(&app)?;
                let should_backup = if let Ok(entries) = fs::read_dir(&backups_dir) {
                    let mut recent_auto_exists = false;
                    let now = SystemTime::now();
                    for entry in entries.filter_map(|e| e.ok()) {
                        let path = entry.path();
                        let fname = path.file_name().unwrap_or_default().to_string_lossy();
                        if fname.starts_with("vellum-auto-") {
                            if let Ok(m) = fs::metadata(&path) {
                                if let Ok(modified) = m.modified() {
                                    if let Ok(diff) = now.duration_since(modified) {
                                        if diff.as_secs() < 900 {
                                            recent_auto_exists = true;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    !recent_auto_exists
                } else {
                    true
                };

                if should_backup {
                    let _ = create_backup_internal(&app, "auto", true);
                }
            }
        }
    }

    atomic_write_file(&db_path, &payload)?;
    Ok(db_path.to_string_lossy().to_string())
}

#[tauri::command]
fn create_database_backup(
    app: tauri::AppHandle,
    label: Option<String>,
) -> Result<BackupEntry, String> {
    let prefix = label
        .as_deref()
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .unwrap_or("manual");
    create_backup_internal(&app, prefix, false)
}

#[tauri::command]
fn list_database_backups(app: tauri::AppHandle) -> Result<Vec<BackupEntry>, String> {
    let backups_dir = get_backups_dir(&app)?;
    let mut result = Vec::new();

    if let Ok(entries) = fs::read_dir(&backups_dir) {
        for entry in entries.filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.is_file() && path.extension().map(|x| x == "json").unwrap_or(false) {
                if let Ok(meta) = fs::metadata(&path) {
                    let filename = path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let created_at = meta
                        .modified()
                        .map(format_system_time)
                        .unwrap_or_else(|_| format_system_time(SystemTime::now()));
                    let is_automatic = filename.starts_with("vellum-auto-");

                    result.push(BackupEntry {
                        filename,
                        path: path.to_string_lossy().to_string(),
                        size_bytes: meta.len(),
                        created_at,
                        is_automatic,
                    });
                }
            }
        }
    }

    result.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(result)
}

#[tauri::command]
fn restore_database_backup(
    app: tauri::AppHandle,
    backup_filename: String,
) -> Result<String, String> {
    if backup_filename.contains("..") || backup_filename.contains('/') || backup_filename.contains('\\') {
        return Err("Invalid backup filename".to_string());
    }

    let backups_dir = get_backups_dir(&app)?;
    let backup_file = backups_dir.join(&backup_filename);
    if !backup_file.exists() {
        return Err(format!("Backup file '{}' not found", backup_filename));
    }

    let db_path = get_db_path(&app)?;
    if db_path.exists() {
        let _ = create_backup_internal(&app, "prerestore", true);
    }

    let content = fs::read_to_string(&backup_file)
        .map_err(|e| format!("Failed to read backup file: {}", e))?;

    atomic_write_file(&db_path, &content)?;
    Ok(content)
}

#[tauri::command]
fn open_data_folder(app: tauri::AppHandle) -> Result<String, String> {
    let base_dir = get_base_dir(&app)?;
    let path_str = base_dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&base_dir)
            .spawn()
            .map_err(|e| format!("Failed to launch file explorer: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&base_dir)
            .spawn()
            .map_err(|e| format!("Failed to launch finder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&base_dir)
            .spawn()
            .map_err(|e| format!("Failed to launch file manager: {}", e))?;
    }

    Ok(path_str)
}

#[tauri::command]
fn save_audio_media(
    app: tauri::AppHandle,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    let media_dir = get_media_audio_dir(&app)?;
    let safe_name: String = filename
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect();
    let safe_name = if safe_name.is_empty() {
        format!("audio_{}.mp3", get_timestamp_slug())
    } else {
        safe_name
    };
    let target = media_dir.join(&safe_name);
    fs::write(&target, data).map_err(|e| format!("Failed to write audio file: {}", e))?;
    Ok(format!("media://audio/{}", safe_name))
}

#[tauri::command]
fn read_audio_media(
    app: tauri::AppHandle,
    filename: String,
) -> Result<Vec<u8>, String> {
    let safe_name: String = filename
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '.' || *c == '-' || *c == '_')
        .collect();
    let media_dir = get_media_audio_dir(&app)?;
    let target = media_dir.join(&safe_name);
    if !target.exists() {
        return Err(format!("Audio file '{}' not found", safe_name));
    }
    fs::read(&target).map_err(|e| format!("Failed to read audio file: {}", e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            load_local_database,
            save_local_database,
            create_database_backup,
            list_database_backups,
            restore_database_backup,
            open_data_folder,
            save_audio_media,
            read_audio_media
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
