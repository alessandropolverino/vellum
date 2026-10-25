import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownCircle, CheckCircle2, Loader2, RefreshCw, X, AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Update } from '@tauri-apps/plugin-updater';
import { useLanguage } from '../i18n/LanguageContext';
import { storageRepository } from '../services/storageRepository';

type Phase = 'idle' | 'checking' | 'upToDate' | 'available' | 'installing' | 'error';

const AUTO_CHECK_DELAY_MS = 5000;

const isDesktopApp = (): boolean =>
  typeof window !== 'undefined' && Boolean((window as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);

/** Header button + modal that checks GitHub Releases for a signed update and installs it. */
export const UpdateControl: React.FC = () => {
  const { tr } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [update, setUpdate] = useState<Update | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number | null }>({ done: 0, total: null });
  const [errorText, setErrorText] = useState('');
  const [currentVersion, setCurrentVersion] = useState('');
  const checking = useRef(false);

  const checkForUpdate = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    setPhase('checking');
    setErrorText('');
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const found = await check();
      setUpdate(found);
      setPhase(found ? 'available' : 'upToDate');
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : String(err));
      setPhase('error');
    } finally {
      checking.current = false;
    }
  }, []);

  useEffect(() => {
    if (!isDesktopApp()) return;
    import('@tauri-apps/api/app')
      .then((m) => m.getVersion())
      .then(setCurrentVersion)
      .catch(() => {});
    const timer = window.setTimeout(checkForUpdate, AUTO_CHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [checkForUpdate]);

  if (!isDesktopApp()) return null;

  const install = async () => {
    if (!update) return;
    setPhase('installing');
    setProgress({ done: 0, total: null });
    try {
      // Safety copy first: a new version may migrate the database schema.
      await storageRepository.createBackup('pre-update');
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started') {
          setProgress({ done: 0, total: event.data.contentLength ?? null });
        } else if (event.event === 'Progress') {
          setProgress((p) => ({ ...p, done: p.done + event.data.chunkLength }));
        }
      });
      const { relaunch } = await import('@tauri-apps/plugin-process');
      await relaunch();
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : String(err));
      setPhase('error');
    }
  };

  const open = () => {
    setIsOpen(true);
    if (phase === 'idle' || phase === 'error') checkForUpdate();
  };

  const pct = progress.total ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : null;
  const hasUpdate = phase === 'available' || phase === 'installing';

  return (
    <>
      <button
        onClick={open}
        title={
          hasUpdate && update
            ? tr(`Update available: ${update.version}`, `Aggiornamento disponibile: ${update.version}`)
            : tr('Check for updates', 'Controlla aggiornamenti')
        }
        className="relative p-2 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition cursor-pointer"
      >
        <ArrowDownCircle className="w-4 h-4" />
        {hasUpdate && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500" />}
      </button>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl border border-stone-800 bg-stone-950 p-5 shadow-xl">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-base font-semibold text-stone-100">{tr('Updates', 'Aggiornamenti')}</h2>
              <button
                onClick={() => setIsOpen(false)}
                disabled={phase === 'installing'}
                className="p-1 rounded text-stone-500 hover:text-stone-200 disabled:opacity-40 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentVersion && (
              <p className="text-xs text-stone-500 mb-3">
                {tr('Current version', 'Versione attuale')}: {currentVersion}
              </p>
            )}

            {phase === 'checking' && (
              <p className="flex items-center gap-2 text-sm text-stone-300">
                <Loader2 className="w-4 h-4 animate-spin" /> {tr('Checking for updates…', 'Controllo aggiornamenti…')}
              </p>
            )}

            {phase === 'upToDate' && (
              <p className="flex items-center gap-2 text-sm text-stone-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {tr('You are on the latest version.', 'Hai già l’ultima versione.')}
              </p>
            )}

            {(phase === 'available' || phase === 'installing') && update && (
              <div className="space-y-3">
                <p className="text-sm text-stone-200">
                  {tr(`Version ${update.version} is available.`, `È disponibile la versione ${update.version}.`)}
                </p>
                {update.body && (
                  <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-lg bg-stone-900 p-3 text-xs text-stone-400">
                    {update.body}
                  </pre>
                )}
                <p className="text-xs text-stone-500">
                  {tr(
                    'A backup of your data is created before installing, then the app restarts.',
                    'Prima dell’installazione viene creato un backup dei dati, poi l’app si riavvia.',
                  )}
                </p>
                {phase === 'installing' && (
                  <div>
                    <div className="h-1.5 w-full overflow-hidden rounded bg-stone-800">
                      <div
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: pct === null ? '100%' : `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {pct === null
                        ? tr('Preparing…', 'Preparazione…')
                        : tr(`Downloading… ${pct}%`, `Download… ${pct}%`)}
                    </p>
                  </div>
                )}
                <button
                  onClick={install}
                  disabled={phase === 'installing'}
                  className="w-full rounded-lg bg-amber-600 px-3 py-2 text-sm font-medium text-stone-950 hover:bg-amber-500 disabled:opacity-50 cursor-pointer"
                >
                  {tr('Install and restart', 'Installa e riavvia')}
                </button>
              </div>
            )}

            {phase === 'error' && (
              <div className="space-y-3">
                <p className="flex items-start gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{tr('Update failed.', 'Aggiornamento non riuscito.')}</span>
                </p>
                {errorText && <p className="break-words text-xs text-stone-500">{errorText}</p>}
              </div>
            )}

            {(phase === 'upToDate' || phase === 'error') && (
              <button
                onClick={checkForUpdate}
                className="mt-4 flex items-center gap-2 rounded-lg border border-stone-800 px-3 py-1.5 text-xs text-stone-300 hover:bg-stone-900 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> {tr('Check again', 'Ricontrolla')}
              </button>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
};
