#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[cfg(windows)]
extern "system" {
    fn AttachConsole(dw_process_id: u32) -> i32;
}

#[cfg(windows)]
const ATTACH_PARENT_PROCESS: u32 = 0xFFFFFFFF;

fn is_cli_subcommand(arg: &str) -> bool {
    let lower = arg.to_lowercase();
    matches!(
        lower.as_str(),
        "db" | "story"
            | "stories"
            | "character"
            | "characters"
            | "pg"
            | "campaign"
            | "campaigns"
            | "party"
            | "parties"
            | "encounter"
            | "encounters"
            | "instance"
            | "instances"
            | "agent-guide"
            | "help"
            | "--help"
            | "-h"
            | "--version"
            | "-v"
            | "version"
            | "validate"
            | "backup"
            | "stats"
            | "sfx"
    )
}

fn find_cli_script() -> Option<std::path::PathBuf> {
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // 1. Installed: $INSTDIR/bin/vellum.mjs
            let candidate1 = exe_dir.join("bin").join("vellum.mjs");
            if candidate1.exists() {
                return Some(candidate1);
            }
            // 2. Installed fallback: $INSTDIR/_up_/bin/vellum.mjs
            let candidate2 = exe_dir.join("_up_").join("bin").join("vellum.mjs");
            if candidate2.exists() {
                return Some(candidate2);
            }
            // 3. Local dev relative paths
            let candidate3 = exe_dir.join("../../bin/vellum.mjs");
            if candidate3.exists() {
                return Some(candidate3);
            }
            let candidate4 = exe_dir.join("../../../bin/vellum.mjs");
            if candidate4.exists() {
                return Some(candidate4);
            }
        }
    }
    let cwd_candidate = std::path::PathBuf::from("bin/vellum.mjs");
    if cwd_candidate.exists() {
        return Some(cwd_candidate);
    }
    None
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    // If subcommands or CLI flags are provided, route to the Vellum CLI runner
    if args.len() > 1 && is_cli_subcommand(&args[1]) {
        #[cfg(windows)]
        unsafe {
            AttachConsole(ATTACH_PARENT_PROCESS);
        }

        if let Some(cli_path) = find_cli_script() {
            match std::process::Command::new("node")
                .arg(&cli_path)
                .args(&args[1..])
                .status()
            {
                Ok(status) => std::process::exit(status.code().unwrap_or(0)),
                Err(err) if err.kind() == std::io::ErrorKind::NotFound => {
                    eprintln!("[Vellum CLI] Error: Node.js was not found in PATH.");
                    eprintln!("Please install Node.js from https://nodejs.org to use Vellum CLI commands.");
                    std::process::exit(1);
                }
                Err(err) => {
                    eprintln!("[Vellum CLI] Failed to execute CLI: {}", err);
                    std::process::exit(1);
                }
            }
        } else {
            eprintln!("[Vellum CLI] Error: Could not locate vellum.mjs CLI bundle.");
            std::process::exit(1);
        }
    }

    vellum_lib::run()
}
