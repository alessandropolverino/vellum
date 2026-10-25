//! Live session server: a local HTTP + WebSocket server that lets players join from their
//! phones, optionally exposed to the internet through a Cloudflare quick tunnel (`cloudflared`).
//!
//! The DM's desktop app stays the source of truth. The server only relays messages the app
//! pushes through `live_broadcast`; anything sent here reaches every connected player, so the
//! frontend must pass already-filtered payloads (never hidden HP, DM notes, ...).

use std::net::SocketAddr;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse};
use axum::routing::get;
use axum::Router;
use futures_util::{SinkExt, StreamExt};
use rand::distributions::Alphanumeric;
use rand::Rng;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter, Manager, State as TauriState};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::net::TcpListener;
use tokio::process::{Child, Command};
use tokio::sync::{broadcast, oneshot, Mutex};

const PLAYER_PAGE: &str = include_str!("live_player.html");

#[derive(Clone)]
struct ServerShared {
    token: String,
    tx: broadcast::Sender<String>,
    clients: Arc<AtomicUsize>,
    app: AppHandle,
}

struct Running {
    token: String,
    port: u16,
    lan_url: Option<String>,
    tunnel_url: Arc<Mutex<Option<String>>>,
    tx: broadcast::Sender<String>,
    clients: Arc<AtomicUsize>,
    shutdown: Option<oneshot::Sender<()>>,
    tunnel: Option<Child>,
}

#[derive(Default)]
pub struct LiveState {
    inner: Mutex<Option<Running>>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct LiveInfo {
    pub running: bool,
    pub token: String,
    pub port: u16,
    pub lan_url: Option<String>,
    pub tunnel_url: Option<String>,
    pub clients: usize,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
struct TunnelEvent {
    status: &'static str, // "starting" | "ready" | "error"
    url: Option<String>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct WsQuery {
    token: String,
}

fn random_token(len: usize) -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(len)
        .map(char::from)
        .collect()
}

fn token_matches(expected: &str, given: &str) -> bool {
    // Constant-time comparison: the URL is public once the tunnel is up.
    expected.len() == given.len()
        && expected
            .bytes()
            .zip(given.bytes())
            .fold(0u8, |acc, (a, b)| acc | (a ^ b))
            == 0
}

async fn join_page(State(s): State<ServerShared>, Path(token): Path<String>) -> impl IntoResponse {
    if !token_matches(&s.token, &token) {
        return (StatusCode::NOT_FOUND, Html("Not found".to_string())).into_response();
    }
    Html(PLAYER_PAGE.replace("__TOKEN__", &s.token)).into_response()
}

async fn ws_handler(
    State(s): State<ServerShared>,
    Query(q): Query<WsQuery>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    if !token_matches(&s.token, &q.token) {
        return StatusCode::NOT_FOUND.into_response();
    }
    ws.on_upgrade(move |socket| client_loop(socket, s)).into_response()
}

fn emit_clients(s: &ServerShared) {
    let _ = s.app.emit("live://clients", s.clients.load(Ordering::SeqCst));
}

async fn client_loop(socket: WebSocket, s: ServerShared) {
    s.clients.fetch_add(1, Ordering::SeqCst);
    emit_clients(&s);

    let (mut sink, mut stream) = socket.split();
    let mut rx = s.tx.subscribe();

    let _ = sink
        .send(Message::Text(r#"{"type":"hello"}"#.to_string()))
        .await;

    loop {
        tokio::select! {
            msg = rx.recv() => match msg {
                Ok(text) => {
                    if sink.send(Message::Text(text)).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(_)) => continue,
                Err(_) => break,
            },
            incoming = stream.next() => match incoming {
                Some(Ok(Message::Close(_))) | None | Some(Err(_)) => break,
                // Player -> DM messages arrive in a later phase; ignore for now.
                Some(Ok(_)) => {}
            },
        }
    }

    s.clients.fetch_sub(1, Ordering::SeqCst);
    emit_clients(&s);
}

fn cloudflared_candidates() -> Vec<PathBuf> {
    let name = if cfg!(windows) { "cloudflared.exe" } else { "cloudflared" };
    let mut out = Vec::new();
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            out.push(dir.join("bin").join(name));
            out.push(dir.join(name));
            // `tauri dev`: exe lives in src-tauri/target/debug
            out.push(dir.join("../../../bin").join(name));
        }
    }
    out
}

fn find_cloudflared() -> PathBuf {
    cloudflared_candidates()
        .into_iter()
        .find(|p| p.is_file())
        // Fall back to PATH lookup.
        .unwrap_or_else(|| PathBuf::from(if cfg!(windows) { "cloudflared.exe" } else { "cloudflared" }))
}

/// Pulls the first `https://<words>.trycloudflare.com` URL out of a cloudflared log line.
fn extract_tunnel_url(line: &str) -> Option<String> {
    let end = line.find(".trycloudflare.com")? + ".trycloudflare.com".len();
    let start = line[..end].rfind("https://")?;
    Some(line[start..end].to_string())
}

async fn spawn_tunnel(
    app: AppHandle,
    port: u16,
    url_slot: Arc<Mutex<Option<String>>>,
) -> Result<Child, String> {
    let bin = find_cloudflared();
    let mut cmd = Command::new(&bin);
    cmd.args([
        "tunnel",
        "--no-autoupdate",
        "--url",
        &format!("http://127.0.0.1:{port}"),
    ])
    .stdin(Stdio::null())
    .stdout(Stdio::null())
    .stderr(Stdio::piped())
    .kill_on_drop(true);
    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW: no console flash.
        cmd.creation_flags(0x0800_0000);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Could not start cloudflared ({}): {e}", bin.display()))?;
    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "cloudflared produced no log output".to_string())?;

    // cloudflared logs the public URL on stderr; keep draining so the pipe never fills.
    tauri::async_runtime::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        let mut announced = false;
        while let Ok(Some(line)) = lines.next_line().await {
            if !announced {
                if let Some(url) = extract_tunnel_url(&line) {
                    announced = true;
                    *url_slot.lock().await = Some(url.clone());
                    let _ = app.emit(
                        "live://tunnel",
                        TunnelEvent { status: "ready", url: Some(url), error: None },
                    );
                }
            }
        }
        if !announced {
            let _ = app.emit(
                "live://tunnel",
                TunnelEvent {
                    status: "error",
                    url: None,
                    error: Some("cloudflared exited before publishing a URL".into()),
                },
            );
        }
    });

    Ok(child)
}

fn info_of(r: &Running, tunnel_url: Option<String>) -> LiveInfo {
    LiveInfo {
        running: true,
        token: r.token.clone(),
        port: r.port,
        lan_url: r.lan_url.clone(),
        tunnel_url,
        clients: r.clients.load(Ordering::SeqCst),
    }
}

#[tauri::command]
pub async fn live_start(
    app: AppHandle,
    state: TauriState<'_, LiveState>,
    use_tunnel: bool,
) -> Result<LiveInfo, String> {
    let mut guard = state.inner.lock().await;
    if let Some(r) = guard.as_ref() {
        let url = r.tunnel_url.lock().await.clone();
        return Ok(info_of(r, url));
    }

    let token = random_token(24);
    let (tx, _) = broadcast::channel::<String>(64);
    let clients = Arc::new(AtomicUsize::new(0));
    let shared = ServerShared {
        token: token.clone(),
        tx: tx.clone(),
        clients: clients.clone(),
        app: app.clone(),
    };

    let listener = TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], 0)))
        .await
        .map_err(|e| format!("Could not open the live server port: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let router = Router::new()
        .route("/join/:token", get(join_page))
        .route("/ws", get(ws_handler))
        .with_state(shared);

    let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();
    tauri::async_runtime::spawn(async move {
        let _ = axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = shutdown_rx.await;
            })
            .await;
    });

    let lan_url = local_ip_address::local_ip()
        .ok()
        .map(|ip| format!("http://{ip}:{port}/join/{token}"));

    let tunnel_url = Arc::new(Mutex::new(None));
    let mut tunnel = None;
    if use_tunnel {
        let _ = app.emit(
            "live://tunnel",
            TunnelEvent { status: "starting", url: None, error: None },
        );
        match spawn_tunnel(app.clone(), port, tunnel_url.clone()).await {
            Ok(child) => tunnel = Some(child),
            Err(error) => {
                let _ = app.emit(
                    "live://tunnel",
                    TunnelEvent { status: "error", url: None, error: Some(error) },
                );
            }
        }
    }

    let running = Running {
        token,
        port,
        lan_url,
        tunnel_url,
        tx,
        clients,
        shutdown: Some(shutdown_tx),
        tunnel,
    };
    let info = info_of(&running, None);
    *guard = Some(running);
    Ok(info)
}

#[tauri::command]
pub async fn live_stop(state: TauriState<'_, LiveState>) -> Result<(), String> {
    let mut guard = state.inner.lock().await;
    if let Some(mut r) = guard.take() {
        if let Some(tx) = r.shutdown.take() {
            let _ = tx.send(());
        }
        if let Some(mut child) = r.tunnel.take() {
            let _ = child.kill().await;
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn live_status(state: TauriState<'_, LiveState>) -> Result<Option<LiveInfo>, String> {
    let guard = state.inner.lock().await;
    match guard.as_ref() {
        Some(r) => {
            let url = r.tunnel_url.lock().await.clone();
            Ok(Some(info_of(r, url)))
        }
        None => Ok(None),
    }
}

/// Sends an already-filtered JSON payload to every connected player.
#[tauri::command]
pub async fn live_broadcast(
    state: TauriState<'_, LiveState>,
    payload: String,
) -> Result<usize, String> {
    let guard = state.inner.lock().await;
    let r = guard.as_ref().ok_or("Live session is not running")?;
    Ok(r.tx.send(payload).unwrap_or(0))
}

/// Make sure the tunnel process dies with the app.
pub fn shutdown_on_exit(app: &AppHandle) {
    if let Some(state) = app.try_state::<LiveState>() {
        if let Ok(mut guard) = state.inner.try_lock() {
            if let Some(mut r) = guard.take() {
                if let Some(tx) = r.shutdown.take() {
                    let _ = tx.send(());
                }
                if let Some(child) = r.tunnel.as_mut() {
                    let _ = child.start_kill();
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_tunnel_url() {
        let line = "2026-10-25T10:00:00Z INF |  https://quiet-river-1234.trycloudflare.com  |";
        assert_eq!(
            extract_tunnel_url(line).as_deref(),
            Some("https://quiet-river-1234.trycloudflare.com")
        );
        assert_eq!(extract_tunnel_url("no url here"), None);
    }

    #[test]
    fn token_comparison() {
        assert!(token_matches("abc", "abc"));
        assert!(!token_matches("abc", "abd"));
        assert!(!token_matches("abc", "abcd"));
    }
}
