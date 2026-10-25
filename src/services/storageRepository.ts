import { DndDatabase } from '../types/dnd';
import { SEED_DATABASE } from '../data/seedData';
import {
  migrateDatabase,
  normalizeDatabase,
  integrateDatabaseBackup,
  IntegrationSummary,
} from './schemaMigration';

export interface StorageSaveResult {
  adapter: 'tauri-fs' | 'local-disk-api' | 'browser-storage';
  location: string;
  savedAt: string;
  mtimeMs?: number;
}

export interface ExternalCheckResult {
  hasChanged: boolean;
  db?: DndDatabase;
  source?: string;
  mtimeMs?: number;
}

export interface BackupEntry {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  isAutomatic: boolean;
}

export interface IStorageRepository {
  loadDatabase(): Promise<{ db: DndDatabase; source: string; migrated?: boolean; mtimeMs?: number }>;
  saveDatabase(db: DndDatabase): Promise<StorageSaveResult>;
  checkExternalUpdate(knownMtimeMs: number): Promise<ExternalCheckResult>;
  exportToJsonFile(db: DndDatabase): void;
  importFromJsonString(rawJson: string): DndDatabase;
  listBackups(): Promise<BackupEntry[]>;
  createBackup(label?: string): Promise<BackupEntry>;
  restoreBackup(filename: string): Promise<DndDatabase>;
  integrateBackup(filename: string, currentDb: DndDatabase): Promise<{ db: DndDatabase; summary: IntegrationSummary }>;
  integrateFromJsonString(rawJson: string, currentDb: DndDatabase): { db: DndDatabase; summary: IntegrationSummary };
  openDataFolder(): Promise<string>;
  canOpenFolder(): boolean;
  saveAudioMedia(file: File): Promise<string>;
  resolveAudioUrl(url: string): Promise<string>;
}

const LOCAL_STORAGE_KEY = 'vellum_db_v1';
const LOCAL_STORAGE_BACKUPS_KEY = 'vellum_backups_meta_v1';

declare global {
  interface Window {
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

export class LocalFirstRepository implements IStorageRepository {
  private isTauri(): boolean {
    return typeof window !== 'undefined' && Boolean(window.__TAURI_INTERNALS__?.invoke);
  }

  canOpenFolder(): boolean {
    return this.isTauri() || typeof window !== 'undefined';
  }

  async loadDatabase(): Promise<{ db: DndDatabase; source: string; migrated?: boolean; mtimeMs?: number }> {
    // 1. Try Tauri native file system first if running inside Tauri desktop shell
    if (this.isTauri()) {
      try {
        const updateCheck = (await window.__TAURI_INTERNALS__!.invoke('check_database_update', {
          knownMtimeMs: 0,
        })) as { hasChanged: boolean; mtimeMs: number; payload?: string | null };
        if (updateCheck.hasChanged && updateCheck.payload) {
          const parsed = JSON.parse(updateCheck.payload);
          const { db, migrated } = migrateDatabase(parsed);
          if (migrated) {
            await this.saveDatabase(db);
          }
          return { db, source: 'Local Disk (Tauri AppData)', migrated, mtimeMs: updateCheck.mtimeMs };
        }
      } catch (err) {
        console.warn('Tauri check_database_update error, checking fallbacks:', err);
        try {
          const raw = (await window.__TAURI_INTERNALS__!.invoke('load_local_database')) as string | null;
          if (raw) {
            const parsed = JSON.parse(raw);
            const { db, migrated } = migrateDatabase(parsed);
            if (migrated) {
              await this.saveDatabase(db);
            }
            return { db, source: 'Local Disk (Tauri AppData)', migrated, mtimeMs: Date.now() };
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Try local disk endpoint (/api/local-db -> ./data/vellum-db.json)
    try {
      const res = await fetch('/api/local-db', { method: 'GET' });
      if (res.ok) {
        const mtimeHeader = res.headers.get('x-mtime');
        const mtimeMs = mtimeHeader ? Number(mtimeHeader) : Date.now();
        const parsed = await res.json();
        if (parsed && typeof parsed === 'object' && !parsed.empty) {
          const { db, migrated } = migrateDatabase(parsed);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
          if (migrated) {
            await this.saveDatabase(db);
          }
          return { db, source: 'Local Disk (./data/vellum-db.json)', migrated, mtimeMs };
        }
      }
    } catch {
      // Offline or static bundle fallback
    }

    // 3. Try browser localStorage fallback
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const { db, migrated } = migrateDatabase(parsed);
        return { db, source: 'Browser LocalStorage', migrated, mtimeMs: Date.now() };
      }
    } catch {
      // Ignore parse errors
    }

    // 4. First launch: initialize with normalized SEED_DATABASE and persist immediately to disk
    const initialDb: DndDatabase = normalizeDatabase(structuredClone(SEED_DATABASE));
    await this.saveDatabase(initialDb);
    return { db: initialDb, source: 'Initial Database (Saved to Disk)', mtimeMs: Date.now() };
  }

  async checkExternalUpdate(knownMtimeMs: number): Promise<ExternalCheckResult> {
    if (this.isTauri()) {
      try {
        const res = (await window.__TAURI_INTERNALS__!.invoke('check_database_update', {
          knownMtimeMs,
        })) as { hasChanged: boolean; mtimeMs: number; payload?: string | null };
        if (res.hasChanged && res.payload) {
          const parsed = JSON.parse(res.payload);
          const { db } = migrateDatabase(parsed);
          return {
            hasChanged: true,
            db,
            source: 'Local Disk (Tauri AppData)',
            mtimeMs: res.mtimeMs,
          };
        }
        return { hasChanged: false, mtimeMs: res.mtimeMs };
      } catch (err) {
        console.warn('Tauri checkExternalUpdate error:', err);
        return { hasChanged: false };
      }
    }

    try {
      const res = await fetch(`/api/local-db/check?since=${knownMtimeMs}`);
      if (res.ok) {
        const data = await res.json();
        if (data.hasChanged && data.payload) {
          const parsed = JSON.parse(data.payload);
          const { db } = migrateDatabase(parsed);
          return {
            hasChanged: true,
            db,
            source: 'Local Disk (./data/vellum-db.json)',
            mtimeMs: data.mtimeMs,
          };
        }
        return { hasChanged: false, mtimeMs: data.mtimeMs };
      }
    } catch {
      // offline
    }

    return { hasChanged: false };
  }

  async saveDatabase(db: DndDatabase): Promise<StorageSaveResult> {
    const updated: DndDatabase = {
      ...normalizeDatabase(db),
      lastSavedAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(updated, null, 2);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, payload);
    } catch {
      // Ignore quota errors if large custom audio is attached
    }

    // 1. Tauri native disk write (atomic + auto backup)
    if (this.isTauri()) {
      try {
        const rawRes = await window.__TAURI_INTERNALS__!.invoke('save_local_database', {
          payload,
        });
        const savedPath =
          typeof rawRes === 'object' && rawRes !== null && 'path' in rawRes
            ? (rawRes as any).path
            : (rawRes as string);
        const mtimeMs =
          typeof rawRes === 'object' && rawRes !== null && 'mtimeMs' in rawRes
            ? (rawRes as any).mtimeMs
            : Date.now();

        return {
          adapter: 'tauri-fs',
          location: savedPath,
          savedAt: updated.lastSavedAt,
          mtimeMs,
        };
      } catch (err) {
        console.warn('Tauri FS write error, falling back to local API:', err);
      }
    }

    // 2. Local project disk write (./data/vellum-db.json with atomic + auto backup)
    try {
      const res = await fetch('/api/local-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });
      if (res.ok) {
        const info = await res.json();
        return {
          adapter: 'local-disk-api',
          location: info.path || './data/vellum-db.json',
          savedAt: updated.lastSavedAt,
          mtimeMs: info.mtimeMs || Date.now(),
        };
      }
    } catch {
      // Fallback to browser storage
    }

    return {
      adapter: 'browser-storage',
      location: 'Browser Indexed/LocalStorage',
      savedAt: updated.lastSavedAt,
      mtimeMs: Date.now(),
    };
  }

  async listBackups(): Promise<BackupEntry[]> {
    if (this.isTauri()) {
      try {
        const res = (await window.__TAURI_INTERNALS__!.invoke('list_database_backups')) as BackupEntry[];
        return Array.isArray(res) ? res : [];
      } catch (err) {
        console.warn('Tauri list_database_backups error:', err);
      }
    }

    try {
      const res = await fetch('/api/local-db/backups');
      if (res.ok) {
        return (await res.json()) as BackupEntry[];
      }
    } catch {
      // Fallback to local storage meta
    }

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_BACKUPS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async createBackup(label?: string): Promise<BackupEntry> {
    if (this.isTauri()) {
      const entry = (await window.__TAURI_INTERNALS__!.invoke('create_database_backup', {
        label: label || 'manual',
      })) as BackupEntry;
      return entry;
    }

    try {
      const res = await fetch('/api/local-db/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label || 'manual' }),
      });
      if (res.ok) {
        return (await res.json()) as BackupEntry;
      }
    } catch (err) {
      console.warn('Local API createBackup failed:', err);
    }

    // Browser localStorage fallback backup
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY) || '{}';
    const now = new Date();
    const filename = `vellum-${label || 'manual'}-${now.getTime()}.json`;
    const entry: BackupEntry = {
      filename,
      path: `localStorage://${filename}`,
      sizeBytes: cached.length,
      createdAt: now.toISOString(),
      isAutomatic: false,
    };
    try {
      localStorage.setItem(`vellum_snap_${filename}`, cached);
      const existing = await this.listBackups();
      localStorage.setItem(LOCAL_STORAGE_BACKUPS_KEY, JSON.stringify([entry, ...existing].slice(0, 10)));
    } catch {
      // Quota exceeded
    }
    return entry;
  }

  async restoreBackup(filename: string): Promise<DndDatabase> {
    if (this.isTauri()) {
      const raw = (await window.__TAURI_INTERNALS__!.invoke('restore_database_backup', {
        backupFilename: filename,
      })) as string;
      const parsed = JSON.parse(raw);
      return normalizeDatabase(parsed);
    }

    try {
      const res = await fetch('/api/local-db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        const parsed = await res.json();
        return normalizeDatabase(parsed);
      }
    } catch (err) {
      console.warn('Local API restoreBackup failed:', err);
    }

    const snapshotRaw = localStorage.getItem(`vellum_snap_${filename}`);
    if (snapshotRaw) {
      const parsed = JSON.parse(snapshotRaw);
      const db = normalizeDatabase(parsed);
      await this.saveDatabase(db);
      return db;
    }

    throw new Error(`Failed to restore backup '${filename}'`);
  }

  async integrateBackup(
    filename: string,
    currentDb: DndDatabase
  ): Promise<{ db: DndDatabase; summary: IntegrationSummary }> {
    let backupRaw: string | null = null;
    if (this.isTauri()) {
      // To read without replacing current db, read through restore_database_backup
      // But safety: save current DB first!
      backupRaw = (await window.__TAURI_INTERNALS__!.invoke('restore_database_backup', {
        backupFilename: filename,
      })) as string;
    } else {
      const res = await fetch('/api/local-db/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      if (res.ok) {
        backupRaw = await res.text();
      }
    }

    if (!backupRaw) {
      throw new Error(`Could not load backup content for ${filename}`);
    }

    const { db: integratedDb, summary } = this.integrateFromJsonString(backupRaw, currentDb);
    await this.saveDatabase(integratedDb);
    return { db: integratedDb, summary };
  }

  integrateFromJsonString(
    rawJson: string,
    currentDb: DndDatabase
  ): { db: DndDatabase; summary: IntegrationSummary } {
    const parsed = JSON.parse(rawJson);
    return integrateDatabaseBackup(currentDb, parsed);
  }

  async openDataFolder(): Promise<string> {
    if (this.isTauri()) {
      return (await window.__TAURI_INTERNALS__!.invoke('open_data_folder')) as string;
    }

    try {
      const res = await fetch('/api/local-db/open-folder', { method: 'POST' });
      if (res.ok) {
        const info = await res.json();
        return info.path || 'data/';
      }
    } catch {
      // ignore
    }

    return 'data/';
  }

  exportToJsonFile(db: DndDatabase): void {
    const payload = JSON.stringify(normalizeDatabase(db), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateTag = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `vellum-backup-${dateTag}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importFromJsonString(rawJson: string): DndDatabase {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON format.');
    }
    return normalizeDatabase(parsed);
  }

  async saveAudioMedia(file: File): Promise<string> {
    if (this.isTauri()) {
      try {
        const buffer = await file.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        const res = (await window.__TAURI_INTERNALS__!.invoke('save_audio_media', {
          filename: file.name,
          data: bytes,
        })) as string;
        return res;
      } catch (err) {
        console.warn('Tauri save_audio_media failed, falling back to local API:', err);
      }
    }

    try {
      const res = await fetch('/api/media/audio', {
        method: 'POST',
        headers: { 'x-filename': encodeURIComponent(file.name) },
        body: file,
      });
      if (res.ok) {
        const info = await res.json();
        return info.url;
      }
    } catch {
      // Fallback to data url
    }

    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async resolveAudioUrl(url: string): Promise<string> {
    if (!url || !url.trim()) return '';
    if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/api/')) {
      return url;
    }

    if (url.startsWith('media://audio/')) {
      const filename = url.replace('media://audio/', '');
      if (this.isTauri()) {
        try {
          const bytes = (await window.__TAURI_INTERNALS__!.invoke('read_audio_media', {
            filename,
          })) as number[];
          const ext = filename.split('.').pop()?.toLowerCase();
          const mime = ext === 'wav' ? 'audio/wav' : ext === 'ogg' ? 'audio/ogg' : 'audio/mpeg';
          const blob = new Blob([new Uint8Array(bytes)], { type: mime });
          return URL.createObjectURL(blob);
        } catch (err) {
          console.warn('Failed to read audio media via Tauri command:', err);
        }
      }
      return `/api/media/audio/${encodeURIComponent(filename)}`;
    }

    return url;
  }
}

export const storageRepository: IStorageRepository = new LocalFirstRepository();
