import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

function localDiskDbPlugin() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const dbFile = path.join(dataDir, 'dnd5e-db.json');

  return {
    name: 'local-disk-db-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/local-db', (req: any, res: any) => {
        try {
          if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
          }

          if (req.method === 'GET') {
            if (fs.existsSync(dbFile)) {
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

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => {
              body += chunk.toString();
            });
            req.on('end', () => {
              fs.writeFileSync(dbFile, body, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, path: dbFile }));
            });
            return;
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
