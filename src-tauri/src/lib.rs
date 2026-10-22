use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Impossibile risolvere app_data_dir: {}", e))?;
    if !base_dir.exists() {
        fs::create_dir_all(&base_dir)
            .map_err(|e| format!("Impossibile creare directory dati: {}", e))?;
    }
    Ok(base_dir.join("dnd5e-db.json"))
}

#[tauri::command]
fn load_local_database(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let db_path = get_db_path(&app)?;
    if db_path.exists() {
        let content = fs::read_to_string(&db_path)
            .map_err(|e| format!("Errore lettura DB locale: {}", e))?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn save_local_database(app: tauri::AppHandle, payload: String) -> Result<String, String> {
    let db_path = get_db_path(&app)?;
    fs::write(&db_path, payload)
        .map_err(|e| format!("Errore salvataggio DB locale: {}", e))?;
    Ok(db_path.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            load_local_database,
            save_local_database
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
