//! Live session server: a local HTTP + WebSocket server that lets players join from their
//! phones, optionally exposed to the internet through a Cloudflare quick tunnel (`cloudflared`).
//!
//! The DM's desktop app stays the source of truth. The server only relays messages the app
//! pushes through `live_broadcast`; anything sent here reaches every connected player, so the
//! frontend must pass already-filtered payloads (never hidden HP, DM notes, ...).

use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex as StdMutex};

use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, Query, State};
use axum::http::header;
use base64::Engine;
use axum::http::StatusCode;
use axum::response::{Html, IntoResponse};
use axum::Json;
use axum::routing::{get, post};
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

/// A message for the players. `None` targets everyone, `Some(character_id)` only that
/// character's phones.
type Outgoing = (Option<String>, String);

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RosterEntry {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub subtitle: String,
}

#[derive(Default)]
struct PlayerData {
    roster: Vec<RosterEntry>,
    /// player token -> character id
    claims: HashMap<String, String>,
    /// character id -> latest sheet payload (already filtered by the frontend)
    views: HashMap<String, String>,
    /// character id -> nickname the player typed when picking it
    nicknames: HashMap<String, String>,
    /// kind ("combat", "shown") -> latest payload for every player; replayed to late joiners
    shared: HashMap<String, String>,
    /// character id -> (mime type, image bytes) used as the small icon on phones
    portraits: HashMap<String, (String, Vec<u8>)>,
}

#[derive(Serialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ClaimInfo {
    pub character_id: String,
    pub nickname: String,
}

/// Players type their own nickname: keep it short, single-line and free of control characters.
fn sanitize_nickname(raw: &str) -> String {
    raw.chars()
        .filter(|c| !c.is_control())
        .collect::<String>()
        .trim()
        .chars()
        .take(30)
        .collect()
}

impl PlayerData {
    fn claimed_ids(&self) -> Vec<String> {
        let mut ids: Vec<String> = self.claims.values().cloned().collect();
        ids.sort();
        ids.dedup();
        ids
    }

    fn claim_infos(&self) -> Vec<ClaimInfo> {
        self.claimed_ids()
            .into_iter()
            .map(|id| ClaimInfo {
                nickname: self.nicknames.get(&id).cloned().unwrap_or_default(),
                character_id: id,
            })
            .collect()
    }
}

type SharedData = Arc<StdMutex<PlayerData>>;

#[derive(Clone)]
struct ServerShared {
    token: String,
    tx: broadcast::Sender<Outgoing>,
    clients: Arc<AtomicUsize>,
    data: SharedData,
    app: AppHandle,
}

fn emit_claims(app: &AppHandle, data: &SharedData) {
    let claims = data.lock().map(|d| d.claim_infos()).unwrap_or_default();
    let _ = app.emit("live://claims", claims);
}

struct Running {
    token: String,
    port: u16,
    lan_url: Option<String>,
    tunnel_url: Arc<Mutex<Option<String>>>,
    tx: broadcast::Sender<Outgoing>,
    clients: Arc<AtomicUsize>,
    data: SharedData,
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
    pub claimed: Vec<ClaimInfo>,
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
    p: String,
}

#[derive(Deserialize)]
struct SessionQuery {
    s: String,
}

#[derive(Deserialize)]
struct PortraitQuery {
    s: String,
}

#[derive(Deserialize)]
struct PlayerQuery {
    p: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ClaimBody {
    s: String,
    character_id: String,
    nickname: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RosterItem {
    id: String,
    name: String,
    subtitle: String,
    claimed: bool,
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

async fn roster_handler(
    State(s): State<ServerShared>,
    Query(q): Query<SessionQuery>,
) -> impl IntoResponse {
    if !token_matches(&s.token, &q.s) {
        return StatusCode::NOT_FOUND.into_response();
    }
    let d = s.data.lock().unwrap();
    let claimed = d.claimed_ids();
    let items: Vec<RosterItem> = d
        .roster
        .iter()
        .map(|r| RosterItem {
            id: r.id.clone(),
            name: r.name.clone(),
            subtitle: r.subtitle.clone(),
            claimed: claimed.contains(&r.id),
        })
        .collect();
    Json(items).into_response()
}

async fn claim_handler(
    State(s): State<ServerShared>,
    Json(body): Json<ClaimBody>,
) -> impl IntoResponse {
    if !token_matches(&s.token, &body.s) {
        return StatusCode::NOT_FOUND.into_response();
    }
    let nickname = sanitize_nickname(&body.nickname);
    if nickname.is_empty() {
        return StatusCode::BAD_REQUEST.into_response();
    }
    let player_token = random_token(32);
    {
        let mut d = s.data.lock().unwrap();
        if !d.roster.iter().any(|r| r.id == body.character_id) {
            return StatusCode::NOT_FOUND.into_response();
        }
        if d.claims.values().any(|id| *id == body.character_id) {
            return StatusCode::CONFLICT.into_response();
        }
        d.claims.insert(player_token.clone(), body.character_id.clone());
        d.nicknames.insert(body.character_id.clone(), nickname);
    }
    emit_claims(&s.app, &s.data);
    Json(serde_json::json!({
        "playerToken": player_token,
        "characterId": body.character_id,
    }))
    .into_response()
}

async fn me_handler(
    State(s): State<ServerShared>,
    Query(q): Query<PlayerQuery>,
) -> impl IntoResponse {
    let d = s.data.lock().unwrap();
    let Some(character_id) = d.claims.get(&q.p) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    let name = d
        .roster
        .iter()
        .find(|r| &r.id == character_id)
        .map(|r| r.name.clone())
        .unwrap_or_default();
    Json(serde_json::json!({ "characterId": character_id, "name": name })).into_response()
}

async fn portrait_handler(
    State(s): State<ServerShared>,
    Path(id): Path<String>,
    Query(q): Query<PortraitQuery>,
) -> impl IntoResponse {
    if !token_matches(&s.token, &q.s) {
        return StatusCode::NOT_FOUND.into_response();
    }
    let found = s.data.lock().unwrap().portraits.get(&id).cloned();
    match found {
        Some((mime, bytes)) => (
            [
                (header::CONTENT_TYPE, mime),
                // The URL carries a version query, so a changed portrait gets a new URL.
                (header::CACHE_CONTROL, "private, max-age=86400".to_string()),
            ],
            bytes,
        )
            .into_response(),
        None => StatusCode::NOT_FOUND.into_response(),
    }
}

async fn ws_handler(
    State(s): State<ServerShared>,
    Query(q): Query<WsQuery>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    let character_id = {
        let d = s.data.lock().unwrap();
        d.claims.get(&q.p).cloned()
    };
    let Some(character_id) = character_id else {
        return StatusCode::NOT_FOUND.into_response();
    };
    ws.on_upgrade(move |socket| client_loop(socket, s, character_id))
        .into_response()
}

fn emit_clients(s: &ServerShared) {
    let _ = s.app.emit("live://clients", s.clients.load(Ordering::SeqCst));
}

async fn client_loop(socket: WebSocket, s: ServerShared, character_id: String) {
    s.clients.fetch_add(1, Ordering::SeqCst);
    emit_clients(&s);

    let (mut sink, mut stream) = socket.split();
    let mut rx = s.tx.subscribe();

    let initial: Vec<String> = {
        let d = s.data.lock().unwrap();
        d.views
            .get(&character_id)
            .into_iter()
            .chain(d.shared.values())
            .cloned()
            .collect()
    };
    for text in initial {
        let _ = sink.send(Message::Text(text)).await;
    }

    loop {
        tokio::select! {
            msg = rx.recv() => match msg {
                Ok((target, text)) => {
                    if target.as_deref().is_some_and(|t| t != character_id) {
                        continue;
                    }
                    let release = target.is_some() && text.contains(r#""type":"released""#);
                    if sink.send(Message::Text(text)).await.is_err() || release {
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

/// Accepts only small raster images; anything else (svg, html, ...) is refused so the
/// portrait endpoint can never serve active content.
fn parse_data_url(data_url: &str) -> Option<(String, Vec<u8>)> {
    let rest = data_url.strip_prefix("data:")?;
    let (meta, body) = rest.split_once(',')?;
    let mime = meta.strip_suffix(";base64")?;
    if !matches!(mime, "image/png" | "image/jpeg" | "image/webp") {
        return None;
    }
    let bytes = base64::engine::general_purpose::STANDARD.decode(body).ok()?;
    if bytes.len() > 2 * 1024 * 1024 {
        return None;
    }
    Some((mime.to_string(), bytes))
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
        claimed: r.data.lock().map(|d| d.claim_infos()).unwrap_or_default(),
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
    let (tx, _) = broadcast::channel::<Outgoing>(64);
    let data: SharedData = Arc::new(StdMutex::new(PlayerData::default()));
    let clients = Arc::new(AtomicUsize::new(0));
    let shared = ServerShared {
        token: token.clone(),
        tx: tx.clone(),
        clients: clients.clone(),
        data: data.clone(),
        app: app.clone(),
    };

    let listener = TcpListener::bind(SocketAddr::from(([0, 0, 0, 0], 0)))
        .await
        .map_err(|e| format!("Could not open the live server port: {e}"))?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    let router = Router::new()
        .route("/join/:token", get(join_page))
        .route("/api/roster", get(roster_handler))
        .route("/api/claim", post(claim_handler))
        .route("/api/me", get(me_handler))
        .route("/api/portrait/:id", get(portrait_handler))
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
        data,
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
    Ok(r.tx.send((None, payload)).unwrap_or(0))
}

/// Replaces the list of characters players can pick from on their phones.
#[tauri::command]
pub async fn live_set_roster(
    app: AppHandle,
    state: TauriState<'_, LiveState>,
    entries: Vec<RosterEntry>,
) -> Result<(), String> {
    let guard = state.inner.lock().await;
    let r = guard.as_ref().ok_or("Live session is not running")?;
    r.data.lock().map_err(|e| e.to_string())?.roster = entries;
    emit_claims(&app, &r.data);
    Ok(())
}

/// Stores the latest filtered sheet payload for a character and pushes it to that
/// character's phones.
#[tauri::command]
pub async fn live_set_view(
    state: TauriState<'_, LiveState>,
    character_id: String,
    payload: String,
) -> Result<(), String> {
    let guard = state.inner.lock().await;
    let r = guard.as_ref().ok_or("Live session is not running")?;
    r.data
        .lock()
        .map_err(|e| e.to_string())?
        .views
        .insert(character_id.clone(), payload.clone());
    let _ = r.tx.send((Some(character_id), payload));
    Ok(())
}

/// Stores a payload every player should see (combat order, content shown by the DM) under
/// `kind`, replacing the previous one, and pushes it to all connected phones. Late joiners
/// get the latest payload of each kind when they connect.
#[tauri::command]
pub async fn live_set_shared(
    state: TauriState<'_, LiveState>,
    kind: String,
    payload: String,
) -> Result<(), String> {
    let guard = state.inner.lock().await;
    let r = guard.as_ref().ok_or("Live session is not running")?;
    r.data
        .lock()
        .map_err(|e| e.to_string())?
        .shared
        .insert(kind, payload.clone());
    let _ = r.tx.send((None, payload));
    Ok(())
}

/// Registers the (already downscaled) data URL used as a character's icon on phones.
#[tauri::command]
pub async fn live_set_portrait(
    state: TauriState<'_, LiveState>,
    character_id: String,
    data_url: String,
) -> Result<(), String> {
    let (mime, bytes) = parse_data_url(&data_url).ok_or("Unsupported portrait format")?;
    let guard = state.inner.lock().await;
    let r = guard.as_ref().ok_or("Live session is not running")?;
    r.data
        .lock()
        .map_err(|e| e.to_string())?
        .portraits
        .insert(character_id, (mime, bytes));
    Ok(())
}

/// Frees a character so another phone can claim it (the current phone is disconnected).
#[tauri::command]
pub async fn live_release(
    app: AppHandle,
    state: TauriState<'_, LiveState>,
    character_id: String,
) -> Result<(), String> {
    let guard = state.inner.lock().await;
    let r = guard.as_ref().ok_or("Live session is not running")?;
    {
        let mut d = r.data.lock().map_err(|e| e.to_string())?;
        d.claims.retain(|_, id| *id != character_id);
        d.nicknames.remove(&character_id);
    }
    let _ = r.tx.send((Some(character_id), r#"{"type":"released"}"#.to_string()));
    emit_claims(&app, &r.data);
    Ok(())
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
    fn nickname_is_sanitized() {
        assert_eq!(sanitize_nickname("  Ale
	  "), "Ale");
        assert_eq!(sanitize_nickname(&"x".repeat(80)).chars().count(), 30);
        assert_eq!(sanitize_nickname("
 	"), "");
    }

    #[test]
    fn data_url_parsing_is_strict() {
        let ok = parse_data_url("data:image/png;base64,aGVsbG8=");
        assert_eq!(ok.map(|(m, b)| (m, b)), Some(("image/png".to_string(), b"hello".to_vec())));
        assert!(parse_data_url("data:image/svg+xml;base64,aGVsbG8=").is_none());
        assert!(parse_data_url("data:image/png,hello").is_none());
        assert!(parse_data_url("https://example.com/a.png").is_none());
    }

    #[test]
    fn token_comparison() {
        assert!(token_matches("abc", "abc"));
        assert!(!token_matches("abc", "abd"));
        assert!(!token_matches("abc", "abcd"));
    }
}
