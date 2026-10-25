import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

export type DialogChoice = 'confirm' | 'secondary' | 'cancel';

export interface DialogOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  /** Optional middle action (e.g. "Discard"), resolved as 'secondary'. */
  secondaryLabel?: string;
  cancelLabel?: string;
  /** Red styling for destructive confirmations. */
  danger?: boolean;
}

interface DialogApi {
  ask: (opts: DialogOptions) => Promise<DialogChoice>;
  confirm: (opts: DialogOptions) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

export const useDialogs = (): DialogApi => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialogs must be used inside <DialogProvider>');
  return ctx;
};

/** Hook that asks for confirmation before a destructive action. */
export const useConfirmDelete = () => {
  const { confirm } = useDialogs();
  const { tr } = useLanguage();
  return useCallback(
    (what: string, detail?: string) =>
      confirm({
        title: tr(`Delete ${what}?`, `Eliminare ${what}?`),
        message:
          detail ?? tr('This action cannot be undone.', 'Questa azione non può essere annullata.'),
        confirmLabel: tr('Delete', 'Elimina'),
        danger: true,
      }),
    [confirm, tr]
  );
};

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tr } = useLanguage();
  const [opts, setOpts] = useState<DialogOptions | null>(null);
  const resolver = useRef<((c: DialogChoice) => void) | null>(null);

  const ask = useCallback(
    (o: DialogOptions) =>
      new Promise<DialogChoice>((resolve) => {
        resolver.current?.('cancel');
        resolver.current = resolve;
        setOpts(o);
      }),
    []
  );
  const confirm = useCallback((o: DialogOptions) => ask(o).then((c) => c === 'confirm'), [ask]);

  const close = (choice: DialogChoice) => {
    resolver.current?.(choice);
    resolver.current = null;
    setOpts(null);
  };

  useEffect(() => {
    if (!opts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close('cancel');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opts]);

  return (
    <DialogContext.Provider value={{ ask, confirm }}>
      {children}
      {opts &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) close('cancel');
            }}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              className={`w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border bg-stone-900 p-5 shadow-2xl space-y-4 ${
                opts.danger ? 'border-red-500/50' : 'border-amber-500/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2.5 rounded-xl border shrink-0 ${
                    opts.danger
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {opts.danger ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-header text-base font-bold text-stone-100 break-words">{opts.title}</h3>
                  {opts.message && (
                    <p className="text-xs text-stone-300 mt-1 leading-relaxed break-words">{opts.message}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  autoFocus
                  onClick={() => close('cancel')}
                  className="min-w-[6.5rem] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold cursor-pointer"
                >
                  {opts.cancelLabel ?? tr('Cancel', 'Annulla')}
                </button>
                {opts.secondaryLabel && (
                  <button
                    type="button"
                    onClick={() => close('secondary')}
                    className="min-w-[6.5rem] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-red-900/60 border border-stone-700 text-red-300 text-xs font-semibold cursor-pointer"
                  >
                    {opts.secondaryLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => close('confirm')}
                  className={`min-w-[6.5rem] px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                    opts.danger
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                  }`}
                >
                  {opts.confirmLabel ?? tr('Confirm', 'Conferma')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </DialogContext.Provider>
  );
};
