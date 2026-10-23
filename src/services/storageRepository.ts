import { DndDatabase } from '../types/dnd';
import { SEED_DATABASE } from '../data/seedData';
import { migrateDatabase, normalizeDatabase } from './schemaMigration';

export interface StorageSaveResult {
  adapter: 'tauri-fs' | 'local-disk-api' | 'browser-storage';
  location: string;
  savedAt: string;
}

export interface BackupEntry {
  filename: string;
  path: string;
  sizeBytes: number;
  createdAt: string;
  isAutomatic: boolean;
}

export interface IStorageRepository {
  loadDatabase(): Promise<{ db: DndDatabase; source: string; migrated?: boolean }>;
  saveDatabase(db: DndDatabase): Promise<StorageSaveResult>;
  exportToJsonFile(db: DndDatabase): void;
  importFromJsonString(rawJson: string): DndDatabase;
  listBackups(): Promise<BackupEntry[]>;
  createBackup(label?: string): Promise<BackupEntry>;
  restoreBackup(filename: string): Promise<DndDatabase>;
  openDataFolder(): Promise<string>;
  canOpenFolder(): boolean;
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

  async loadDatabase(): Promise<{ db: DndDatabase; source: string; migrated?: boolean }> {
    // 1. Try Tauri native file system first if running inside Tauri desktop shell
    if (this.isTauri()) {
      try {
        const raw = (await window.__TAURI_INTERNALS__!.invoke('load_local_database')) as string | null;
        if (raw) {
          const parsed = JSON.parse(raw);
          const { db, migrated } = migrateDatabase(parsed);
          // If migrated schema, save the normalized state back to disk
          if (migrated) {
            await this.saveDatabase(db);
          }
          return { db, source: 'Local Disk (Tauri AppData)', migrated };
        }
      } catch (err) {
        console.warn('Tauri FS load error, checking fallbacks:', err);
      }
    }

    // 2. Try local disk endpoint (/api/local-db -> ./data/dnd5e-db.json)
    try {
      const res = await fetch('/api/local-db', { method: 'GET' });
      if (res.ok) {
        const parsed = await res.json();
        if (parsed && typeof parsed === 'object' && !parsed.empty) {
          const { db, migrated } = migrateDatabase(parsed);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
          if (migrated) {
            await this.saveDatabase(db);
          }
          return { db, source: 'Local Disk (./data/dnd5e-db.json)', migrated };
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
        return { db, source: 'Browser LocalStorage', migrated };
      }
    } catch {
      // Ignore parse errors
    }

    // 4. First launch: initialize with normalized SEED_DATABASE and persist immediately to disk
    const initialDb: DndDatabase = normalizeDatabase(structuredClone(SEED_DATABASE));
    await this.saveDatabase(initialDb);
    return { db: initialDb, source: 'Initial Database (Saved to Disk)' };
  }

  async saveDatabase(db: DndDatabase): Promise<StorageSaveResult> {
    const updated: DndDatabase = {
      ...normalizeDatabase(db),
      lastSavedAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(updated, null, 2);

    // Always keep a fast mirror in localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, payload);
    } catch {
      // Ignore quota errors if large custom audio is attached
    }

    // 1. Tauri native disk write (atomic + auto backup)
    if (this.isTauri()) {
      try {
        const savedPath = (await window.__TAURI_INTERNALS__!.invoke('save_local_database', {
          payload,
        })) as string;
        return {
          adapter: 'tauri-fs',
          location: savedPath,
          savedAt: updated.lastSavedAt,
        };
      } catch (err) {
        console.warn('Tauri FS write error, falling back to local API:', err);
      }
    }

    // 2. Local project disk write (./data/dnd5e-db.json with atomic + auto backup)
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
          location: info.path || './data/dnd5e-db.json',
          savedAt: updated.lastSavedAt,
        };
      }
    } catch {
      // Fallback to browser storage
    }

    return {
      adapter: 'browser-storage',
      location: 'Browser Indexed/LocalStorage',
      savedAt: updated.lastSavedAt,
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

    // Browser localStorage fallback restore
    const snapshotRaw = localStorage.getItem(`vellum_snap_${filename}`);
    if (snapshotRaw) {
      const parsed = JSON.parse(snapshotRaw);
      const db = normalizeDatabase(parsed);
      await this.saveDatabase(db);
      return db;
    }

    throw new Error(`Failed to restore backup '${filename}'`);
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
}

export const storageRepository: IStorageRepository = new LocalFirstRepository();
