import { DndDatabase } from '../types/dnd';
import { SEED_DATABASE } from '../data/seedData';

export interface StorageSaveResult {
  adapter: 'tauri-fs' | 'local-disk-api' | 'browser-storage';
  location: string;
  savedAt: string;
}

export interface IStorageRepository {
  loadDatabase(): Promise<{ db: DndDatabase; source: string }>;
  saveDatabase(db: DndDatabase): Promise<StorageSaveResult>;
  exportToJsonFile(db: DndDatabase): void;
  importFromJsonString(rawJson: string): DndDatabase;
}

const LOCAL_STORAGE_KEY = 'vellum_db_v1';

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

  async loadDatabase(): Promise<{ db: DndDatabase; source: string }> {
    // 1. Try Tauri native file system first if running inside Tauri desktop shell
    if (this.isTauri()) {
      try {
        const raw = (await window.__TAURI_INTERNALS__!.invoke('load_local_database')) as string | null;
        if (raw) {
          const parsed = JSON.parse(raw) as DndDatabase;
          return { db: parsed, source: 'Local Disk (Tauri AppData)' };
        }
      } catch (err) {
        console.warn('Tauri FS fallback:', err);
      }
    }

    // 2. Try local disk endpoint (/api/local-db -> ./data/dnd5e-db.json)
    try {
      const res = await fetch('/api/local-db', { method: 'GET' });
      if (res.ok) {
        const parsed = (await res.json()) as DndDatabase;
        if (parsed && Array.isArray(parsed.adventures)) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(parsed));
          return { db: parsed, source: 'Local Disk (./data/dnd5e-db.json)' };
        }
      }
    } catch {
      // Offline or static bundle fallback
    }

    // 3. Try browser localStorage fallback
    try {
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as DndDatabase;
        if (parsed && Array.isArray(parsed.adventures)) {
          return { db: parsed, source: 'Browser LocalStorage' };
        }
      }
    } catch {
      // Ignore parse errors
    }

    // 4. First launch: initialize with SEED_DATABASE and persist immediately to disk
    const initialDb: DndDatabase = structuredClone(SEED_DATABASE);
    await this.saveDatabase(initialDb);
    return { db: initialDb, source: 'Initial Database (Saved to Disk)' };
  }

  async saveDatabase(db: DndDatabase): Promise<StorageSaveResult> {
    const updated: DndDatabase = {
      ...db,
      lastSavedAt: new Date().toISOString(),
    };
    const payload = JSON.stringify(updated, null, 2);

    // Always keep a fast mirror in localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, payload);
    } catch {
      // Ignore quota errors if large custom audio is attached
    }

    // 1. Tauri native disk write
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

    // 2. Local project disk write (./data/dnd5e-db.json)
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
      location: 'Indexed/LocalStorage',
      savedAt: updated.lastSavedAt,
    };
  }

  exportToJsonFile(db: DndDatabase): void {
    const payload = JSON.stringify(db, null, 2);
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
    const parsed = JSON.parse(rawJson) as DndDatabase;
    if (
      !parsed ||
      !Array.isArray(parsed.adventures) ||
      !Array.isArray(parsed.characters) ||
      !Array.isArray(parsed.playInstances)
    ) {
      throw new Error('Invalid JSON database format for Vellum.');
    }
    return parsed;
  }
}

export const storageRepository: IStorageRepository = new LocalFirstRepository();
