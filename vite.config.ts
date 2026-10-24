import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

function localDiskDbPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dbFile = path.join(dataDir, 'vellum-db.json');
  const legacyDbFile = path.join(dataDir, 'dnd5e-db.json');
  const backupsDir = path.join(dataDir, 'backups');
  const mediaAudioDir = path.join(dataDir, 'media', 'audio');

  function ensureDirs() {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    // Backward compatibility: migrate dnd5e-db.json to vellum-db.json if new file doesn't exist
    if (!fs.existsSync(dbFile) && fs.existsSync(legacyDbFile)) {
      try {
        fs.renameSync(legacyDbFile, dbFile);
      } catch {
        fs.copyFileSync(legacyDbFile, dbFile);
        try {
          fs.unlinkSync(legacyDbFile);
        } catch {
          // ignore
        }
      }
    }
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
    if (!fs.existsSync(mediaAudioDir)) {
      fs.mkdirSync(mediaAudioDir, { recursive: true });
    }
  }

  function atomicWrite(targetPath: string, content: string) {
    const parent = path.dirname(targetPath);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    const tmpPath = path.join(parent, `.${path.basename(targetPath)}.tmp.${Date.now()}`);
    fs.writeFileSync(tmpPath, content, 'utf-8');
    try {
      fs.renameSync(tmpPath, targetPath);
    } catch {
      fs.copyFileSync(tmpPath, targetPath);
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // ignore
      }
    }
  }

  function pruneBackups(maxKeep = 20) {
    if (!fs.existsSync(backupsDir)) return;
    const files = fs
      .readdirSync(backupsDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        const full = path.join(backupsDir, f);
        return {
          filename: f,
          path: full,
          mtime: fs.statSync(full).mtimeMs,
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length > maxKeep) {
      for (const oldFile of files.slice(maxKeep)) {
        try {
          fs.unlinkSync(oldFile.path);
        } catch {
          // ignore
        }
      }
    }
  }

  function createBackup(prefix = 'manual', isAuto = false) {
    ensureDirs();
    if (!fs.existsSync(dbFile)) {
      throw new Error('Database file does not exist yet');
    }
    const meta = fs.statSync(dbFile);
    if (meta.size === 0) {
      throw new Error('Database file is empty');
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const d = new Date();
    const slug = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(
      d.getHours()
    )}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'backup';
    const filename = `vellum-${cleanPrefix}-${slug}.json`;
    const targetPath = path.join(backupsDir, filename);

    fs.copyFileSync(dbFile, targetPath);
    pruneBackups(20);

    const bmeta = fs.statSync(targetPath);
    return {
      filename,
      path: targetPath,
      sizeBytes: bmeta.size,
      createdAt: bmeta.mtime.toISOString(),
      isAutomatic: isAuto,
    };
  }

  return {
    name: 'local-disk-db-plugin',
    configureServer(server: any) {
      // Media Audio Handler
      server.middlewares.use('/api/media/audio', (req: any, res: any) => {
        ensureDirs();
        const parsedUrl = new URL(req.url, 'http://localhost');
        const filename = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));

        if (req.method === 'POST') {
          const rawName = req.headers['x-filename'] || `audio_${Date.now()}.mp3`;
          const safeName = String(rawName).replace(/[^a-zA-Z0-9._-]/g, '_');
          const targetPath = path.join(mediaAudioDir, safeName);
          const chunks: Buffer[] = [];

          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            const buffer = Buffer.concat(chunks);
            fs.writeFileSync(targetPath, buffer);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: `/api/media/audio/${encodeURIComponent(safeName)}` }));
          });
          return;
        }

        if (req.method === 'GET' && filename) {
          const safeName = path.basename(filename);
          const targetPath = path.join(mediaAudioDir, safeName);
          if (fs.existsSync(targetPath)) {
            const ext = path.extname(safeName).toLowerCase();
            const mime = ext === '.wav' ? 'audio/wav' : ext === '.ogg' ? 'audio/ogg' : 'audio/mpeg';
            const stat = fs.statSync(targetPath);
            res.setHeader('Content-Type', mime);
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Accept-Ranges', 'bytes');
            fs.createReadStream(targetPath).pipe(res);
            return;
          }
          res.statusCode = 404;
          res.end('Not Found');
          return;
        }

        res.statusCode = 405;
        res.end('Method Not Allowed');
      });

      // Database & Backups Handler
      server.middlewares.use('/api/local-db', (req: any, res: any) => {
        try {
          ensureDirs();
          const parsedUrl = new URL(req.url, 'http://localhost');
          const pathname = parsedUrl.pathname;

          // 1. GET /api/local-db/backups -> list backups
          if (pathname === '/backups' && req.method === 'GET') {
            const list = fs
              .readdirSync(backupsDir)
              .filter((f) => f.endsWith('.json'))
              .map((f) => {
                const full = path.join(backupsDir, f);
                const stat = fs.statSync(full);
                return {
                  filename: f,
                  path: full,
                  sizeBytes: stat.size,
                  createdAt: stat.mtime.toISOString(),
                  isAutomatic: f.startsWith('vellum-auto-'),
                };
              })
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(list));
            return;
          }

          // 2. POST /api/local-db/backup -> create backup
          if (pathname === '/backup' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => (body += chunk.toString()));
            req.on('end', () => {
              try {
                const json = body ? JSON.parse(body) : {};
                const entry = createBackup(json.label || 'manual', false);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(entry));
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e?.message || 'Backup failed' }));
              }
            });
            return;
          }

          // 3. POST /api/local-db/restore -> restore backup
          if (pathname === '/restore' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => (body += chunk.toString()));
            req.on('end', () => {
              try {
                const json = body ? JSON.parse(body) : {};
                const filename = json.filename;
                if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Invalid filename' }));
                  return;
                }
                const backupPath = path.join(backupsDir, filename);
                if (!fs.existsSync(backupPath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Backup not found' }));
                  return;
                }

                // Safety backup of current db
                if (fs.existsSync(dbFile)) {
                  try {
                    createBackup('prerestore', true);
                  } catch {
                    // ignore
                  }
                }

                const content = fs.readFileSync(backupPath, 'utf-8');
                atomicWrite(dbFile, content);
                res.setHeader('Content-Type', 'application/json');
                res.end(content);
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e?.message || 'Restore failed' }));
              }
            });
            return;
          }

          // 4. POST /api/local-db/open-folder -> open data directory
          if (pathname === '/open-folder' && req.method === 'POST') {
            const isWin = process.platform === 'win32';
            const isMac = process.platform === 'darwin';
            const cmd = isWin ? `explorer "${dataDir}"` : isMac ? `open "${dataDir}"` : `xdg-open "${dataDir}"`;
            exec(cmd);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: dataDir }));
            return;
          }

          // 5. GET /api/local-db -> load database
          if (pathname === '' || pathname === '/') {
            if (req.method === 'GET') {
              if (fs.existsSync(dbFile)) {
                const stat = fs.statSync(dbFile);
                if (stat.size === 0) {
                  // Fallback to latest backup if file corrupted to 0 bytes
                  const list = fs
                    .readdirSync(backupsDir)
                    .filter((f) => f.endsWith('.json'))
                    .map((f) => path.join(backupsDir, f))
                    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
                  if (list[0]) {
                    const recovered = fs.readFileSync(list[0], 'utf-8');
                    atomicWrite(dbFile, recovered);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(recovered);
                    return;
                  }
                }
                const raw = fs.readFileSync(dbFile, 'utf-8');
                res.setHeader('Content-Type', 'application/json');
                res.end(raw);
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ empty: true }));
              }
              return;
            }

            // 6. POST /api/local-db -> save database
            if (req.method === 'POST') {
              let body = '';
              req.on('data', (chunk: any) => {
                body += chunk.toString();
              });
              req.on('end', () => {
                // Check auto-backup before writing if dbFile exists and is not empty
                if (fs.existsSync(dbFile)) {
                  try {
                    const stat = fs.statSync(dbFile);
                    if (stat.size > 0) {
                      const files = fs.readdirSync(backupsDir).filter((f) => f.startsWith('vellum-auto-'));
                      const now = Date.now();
                      const recentExists = files.some((f) => {
                        const mtime = fs.statSync(path.join(backupsDir, f)).mtimeMs;
                        return now - mtime < 15 * 60 * 1000;
                      });
                      if (!recentExists) {
                        createBackup('auto', true);
                      }
                    }
                  } catch {
                    // ignore auto-backup error
                  }
                }

                atomicWrite(dbFile, body);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ ok: true, path: dbFile }));
              });
              return;
            }
          }

          res.statusCode = 405;
          res.end('Method Not Allowed');
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err?.message || 'Disk error' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localDiskDbPlugin()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/src-tauri/**', '**/.claude/**'],
    },
  },
  envPrefix: ['VITE_', 'TAURI_ENV_*'],
});
