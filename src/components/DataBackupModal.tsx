import React, { useEffect, useState } from 'react';
import {
  HardDrive,
  ShieldCheck,
  FolderOpen,
  Download,
  Upload,
  RefreshCw,
  Clock,
  Sparkles,
  FileCheck,
  X,
  PlusCircle,
  Database,
  History,
  GitMerge,
  RotateCcw,
  Music,
} from 'lucide-react';
import { DndDatabase } from '../types/dnd';
import { useLanguage } from '../i18n/LanguageContext';
import { BackupEntry, storageRepository } from '../services/storageRepository';
import { mergeSeedContent } from '../services/schemaMigration';
import { getSeedDatabase } from '../data/seedData';

interface DataBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: DndDatabase;
  storageSource: string;
  lastSaveInfo: string;
  onDatabaseReplaced: (nextDb: DndDatabase) => void;
}

export const DataBackupModal: React.FC<DataBackupModalProps> = ({
  isOpen,
  onClose,
  db,
  storageSource,
  lastSaveInfo,
  onDatabaseReplaced,
}) => {
  const { lang, tr } = useLanguage();
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [backupLabel, setBackupLabel] = useState('');
  const [showLabelInput, setShowLabelInput] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setIsLoading(true);
    try {
      const list = await storageRepository.listBackups();
      setBackups(list);
    } catch (err) {
      console.warn('Failed to load backups list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleCreateBackup = async () => {
    setIsLoading(true);
    try {
      const entry = await storageRepository.createBackup(backupLabel.trim() || undefined);
      setBackupLabel('');
      setShowLabelInput(false);
      setStatusMessage({
        text: tr(
          `Backup successfully created: ${entry.filename}`,
          `Backup creato con successo: ${entry.filename}`
        ),
        type: 'success',
      });
      await loadBackups();
    } catch (err: any) {
      setStatusMessage({
        text: tr('Failed to create backup: ', 'Errore nella creazione del backup: ') + (err?.message || ''),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async (backup: BackupEntry) => {
    const confirmMessage = tr(
      `Are you sure you want to RESTORE "${backup.filename}"? Current data will be replaced with this backup. A safety snapshot of your current database will be saved automatically first.`,
      `Sei sicuro di voler RIPRISTINARE "${backup.filename}"? Lo stato attuale verrà sostituito integralmente con questo backup. Verrà prima salvato automaticamente uno snapshot di sicurezza.`
    );
    if (!window.confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      const restoredDb = await storageRepository.restoreBackup(backup.filename);
      onDatabaseReplaced(restoredDb);
      setStatusMessage({
        text: tr(
          `Database successfully restored from ${backup.filename}!`,
          `Database ripristinato con successo da ${backup.filename}!`
        ),
        type: 'success',
      });
      await loadBackups();
    } catch (err: any) {
      setStatusMessage({
        text: tr('Failed to restore backup: ', 'Errore durante il ripristino: ') + (err?.message || ''),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleIntegrate = async (backup: BackupEntry) => {
    const confirmMessage = tr(
      `Integrate data from "${backup.filename}"? All missing campaigns, adventures, characters, sessions, and SFX will be added to your current database. NONE of your current data will be deleted or overwritten.`,
      `Integrare i dati da "${backup.filename}"? Tutte le campagne, avventure, schede PG, sessioni e tracce audio mancanti verranno aggiunte allo stato attuale. NESSUN tuo dato esistente verrà eliminato o sovrascritto.`
    );
    if (!window.confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      const { db: integratedDb, summary } = await storageRepository.integrateBackup(backup.filename, db);
      onDatabaseReplaced(integratedDb);
      setStatusMessage({
        text: tr(
          `Integration complete! Added: +${summary.addedCharacters} characters/monsters, +${summary.addedAdventures} stories, +${summary.addedCampaigns} campaigns, +${summary.addedInstances} runs, +${summary.addedSfx} audio tracks. Existing data preserved.`,
          `Integrazione completata! Aggiunti: +${summary.addedCharacters} PG/mostri, +${summary.addedAdventures} avventure, +${summary.addedCampaigns} campagne, +${summary.addedInstances} sessioni, +${summary.addedSfx} tracce audio. Tutti i dati esistenti sono stati preservati.`
        ),
        type: 'success',
      });
      await loadBackups();
    } catch (err: any) {
      setStatusMessage({
        text: tr('Failed to integrate backup: ', 'Errore integrazione backup: ') + (err?.message || ''),
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const folderPath = await storageRepository.openDataFolder();
      setStatusMessage({
        text: `${tr('Opened storage directory:', 'Aperta cartella dati:')} ${folderPath}`,
        type: 'info',
      });
    } catch (err: any) {
      setStatusMessage({
        text: tr('Could not open folder: ', 'Impossibile aprire la cartella: ') + (err?.message || ''),
        type: 'error',
      });
    }
  };

  const handleSyncOfficialContent = () => {
    const seed = getSeedDatabase(lang);
    const result = mergeSeedContent(db, seed);
    if (result.addedAdventures === 0 && result.addedCharacters === 0 && result.addedSfx === 0) {
      setStatusMessage({
        text: tr(
          'Your library already contains all official seed modules, pre-gens, and SFX.',
          'La tua libreria contiene già tutti i moduli, PG pre-generati e SFX ufficiali.'
        ),
        type: 'info',
      });
      return;
    }

    onDatabaseReplaced(result.db);
    setStatusMessage({
      text: tr(
        `Added ${result.addedAdventures} adventure(s), ${result.addedCharacters} pre-gen character(s), ${result.addedSfx} sound effect(s) without altering your custom data!`,
        `Aggiunti ${result.addedAdventures} avventura/e, ${result.addedCharacters} personaggio/i pre-generati e ${result.addedSfx} effetti sonori senza toccare i tuoi dati personalizzati!`
      ),
      type: 'success',
    });
  };

  const handleExportJson = () => {
    storageRepository.exportToJsonFile(db);
    setStatusMessage({
      text: tr('Database exported to JSON file.', 'Database esportato su file JSON.'),
      type: 'success',
    });
  };

  const handleImportAndRestoreJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const raw = evt.target?.result as string;
        const imported = storageRepository.importFromJsonString(raw);
        if (
          window.confirm(
            tr(
              'Import and RESTORE this database? Current data will be replaced. (An automatic safety backup will be created first)',
              'Importare e RIPRISTINARE questo database? I dati attuali verranno sostituiti. (Verrà prima salvato automaticamente un backup di sicurezza)'
            )
          )
        ) {
          try {
            await storageRepository.createBackup('preimport');
          } catch {
            // ignore
          }
          await storageRepository.saveDatabase(imported);
          onDatabaseReplaced(imported);
          setStatusMessage({
            text: tr('Database restored successfully from file!', 'Database ripristinato con successo dal file!'),
            type: 'success',
          });
          await loadBackups();
        }
      } catch (err: any) {
        setStatusMessage({
          text: tr('Failed to import JSON: ', 'Errore importazione JSON: ') + (err?.message || ''),
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleImportAndIntegrateJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const raw = evt.target?.result as string;
        const { db: integratedDb, summary } = storageRepository.integrateFromJsonString(raw, db);
        await storageRepository.saveDatabase(integratedDb);
        onDatabaseReplaced(integratedDb);
        setStatusMessage({
          text: tr(
            `Integrated file successfully! Added: +${summary.addedCharacters} characters/monsters, +${summary.addedAdventures} stories, +${summary.addedCampaigns} campaigns, +${summary.addedInstances} runs, +${summary.addedSfx} audio tracks. Current data preserved.`,
            `File integrato con successo! Aggiunti: +${summary.addedCharacters} PG/mostri, +${summary.addedAdventures} avventure, +${summary.addedCampaigns} campagne, +${summary.addedInstances} sessioni, +${summary.addedSfx} tracce audio. Tutti i dati correnti sono stati preservati.`
          ),
          type: 'success',
        });
        await loadBackups();
      } catch (err: any) {
        setStatusMessage({
          text: tr('Failed to integrate JSON: ', 'Errore integrazione JSON: ') + (err?.message || ''),
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString(lang === 'it' ? 'it-IT' : 'en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-4xl w-full p-6 text-stone-100 shadow-2xl relative my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-amber-300">
                {tr('Data Preservation, Backups & Merging', 'Gestione Dati, Backup & Integrazione')}
              </h2>
              <p className="text-xs text-stone-400">
                {tr(
                  'Your campaigns, PCs, notes, and session logs are saved locally and protected across app updates.',
                  'Le tue campagne, PG, note e log di sessione sono salvati in locale e protetti durante gli aggiornamenti.'
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-stone-800/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alert Banner */}
        {statusMessage && (
          <div
            className={`mb-4 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-red-950/40 border-red-800 text-red-300'
                : 'bg-blue-950/40 border-blue-800 text-blue-300'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-stone-400 hover:text-stone-200 ml-3"
            >
              ×
            </button>
          </div>
        )}

        {/* Database Stats Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 mb-5 text-xs">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-stone-500 uppercase tracking-wider text-[10px]">
                {tr('Active Storage', 'Storage Attivo')}
              </div>
              <div className="font-medium text-stone-200 truncate" title={lastSaveInfo || storageSource}>
                {storageSource}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-stone-500 uppercase tracking-wider text-[10px]">
                {tr('Entities Count', 'Entità Salvate')}
              </div>
              <div className="font-medium text-stone-200">
                {db.characters.length} {tr('PCs/NPCs', 'PG/PNG')}, {db.adventures.length} {tr('Stories', 'Storie')},{' '}
                {db.campaigns.length} {tr('Campaigns', 'Campagne')}, {db.playInstances.length} {tr('Runs', 'Sessioni')}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-stone-500 uppercase tracking-wider text-[10px]">
                {tr('Schema & Last Saved', 'Schema & Ultimo Salvataggio')}
              </div>
              <div className="font-medium text-stone-200">
                v{db.version} • {formatDateTime(db.lastSavedAt)}
              </div>
            </div>
          </div>
        </div>

        {/* Media & Audio Storage Callout */}
        <div className="mb-5 p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 flex items-start gap-3 text-xs text-stone-300">
          <Music className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-amber-300">
              {tr('Dedicated Media Storage (3–5 min audio):', 'Cartella Media Dedicata (audio 3–5 min):')}
            </span>{' '}
            {tr(
              'Custom sound effects, music tracks, and portraits are stored directly in your local "media/audio/" folder. This keeps database backups ultra-lightweight and lightning fast with zero memory bloat.',
              'I brani musicali personalizzati, gli effetti sonori e i ritratti vengono salvati direttamente nella cartella locale "media/audio/". Questo mantiene i backup del database ultra-leggeri, istantanei e privi di sovraccarico.'
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button
            onClick={() => setShowLabelInput((prev) => !prev)}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5 transition shadow"
          >
            <PlusCircle className="w-4 h-4" />
            {tr('Create Backup Snapshot', 'Crea Snapshot di Backup')}
          </button>

          <button
            onClick={handleOpenFolder}
            className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition border border-stone-700"
            title={tr('Open the folder containing your database files and audio in Explorer/Finder', 'Apri la cartella contenente i tuoi file di database e audio in Esplora Risorse / Finder')}
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            {tr('Open Data Folder', 'Apri Cartella Dati')}
          </button>

          <button
            onClick={handleSyncOfficialContent}
            className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition border border-stone-700"
            title={tr('Non-destructively add newly released official 5e adventures and pre-gens from updates without touching your custom work', 'Aggiunge in modo sicuro nuove avventure o PG ufficiali degli aggiornamenti senza alterare i tuoi dati personalizzati')}
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            {tr('Sync Official 5e Content', 'Sincronizza Contenuti Ufficiali')}
          </button>

          <div className="flex-1" />

          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition border border-stone-700"
            title={tr('Export full database to a JSON backup file', 'Esporta l’intero database su file JSON')}
          >
            <Download className="w-4 h-4 text-emerald-400" />
            {tr('Export Backup', 'Esporta Backup')}
          </button>

          {/* Import & Integrate External JSON */}
          <label
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium flex items-center gap-1.5 transition border border-stone-700 cursor-pointer"
            title={tr('Import a JSON backup and INTEGRATE its missing data into current database without deleting anything', 'Importa un backup JSON e INTEGRA i dati mancanti nello stato attuale senza cancellare nulla')}
          >
            <GitMerge className="w-4 h-4 text-amber-400" />
            {tr('Import & Integrate', 'Importa & Integra')}
            <input type="file" accept=".json" onChange={handleImportAndIntegrateJson} className="hidden" />
          </label>

          {/* Import & Restore External JSON */}
          <label
            className="px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium flex items-center gap-1.5 transition border border-stone-700 cursor-pointer"
            title={tr('Import a JSON backup and RESTORE it (replaces current database, with safety auto-backup)', 'Importa un backup JSON e RIPRISTINALO (sostituisce i dati correnti, con backup di sicurezza automatico)')}
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            {tr('Import & Restore', 'Importa & Ripristina')}
            <input type="file" accept=".json" onChange={handleImportAndRestoreJson} className="hidden" />
          </label>
        </div>

        {/* Optional Label Prompt for Backup */}
        {showLabelInput && (
          <div className="p-3 mb-5 rounded-xl bg-stone-950 border border-amber-600/30 flex items-center gap-2">
            <input
              type="text"
              value={backupLabel}
              onChange={(e) => setBackupLabel(e.target.value)}
              placeholder={tr('Optional label (e.g. pre-boss-fight, my-custom-backup)', 'Etichetta facoltativa (es. prima-del-boss, sessione-speciale)')}
              className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBackup()}
            />
            <button
              onClick={handleCreateBackup}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs"
            >
              {tr('Confirm', 'Conferma')}
            </button>
            <button
              onClick={() => setShowLabelInput(false)}
              className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-400 text-xs"
            >
              {tr('Cancel', 'Annulla')}
            </button>
          </div>
        )}

        {/* Backups List */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-stone-300">
              <History className="w-4 h-4 text-amber-400" />
              {tr('Local Backup History', 'Cronologia Backup Locali')}
              <span className="text-xs text-stone-500 font-normal">
                ({backups.length} {tr('snapshots available', 'snapshot disponibili')})
              </span>
            </h3>
            <button
              onClick={loadBackups}
              disabled={isLoading}
              className="text-xs text-stone-400 hover:text-amber-400 flex items-center gap-1 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {tr('Refresh', 'Aggiorna')}
            </button>
          </div>

          <div className="border border-stone-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-stone-950/40">
            {backups.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                {tr(
                  'No local backups found yet. Backups are automatically created every 15 minutes of activity, before restores/imports, and before updates.',
                  'Nessun backup locale trovato. I backup vengono creati automaticamente ogni 15 minuti di attività, prima di ripristini/importazioni e prima degli aggiornamenti.'
                )}
              </div>
            ) : (
              <div className="divide-y divide-stone-800/80">
                {backups.map((b) => (
                  <div
                    key={b.filename}
                    className="p-3 flex items-center justify-between gap-4 hover:bg-stone-900/60 transition text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-stone-800 text-stone-400 shrink-0">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-stone-200 text-xs truncate max-w-xs md:max-w-md">
                            {b.filename}
                          </span>
                          {b.isAutomatic ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-950/70 text-blue-300 border border-blue-800/60">
                              {tr('Auto', 'Automatico')}
                            </span>
                          ) : b.filename.includes('prerestore') ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-950/70 text-purple-300 border border-purple-800/60">
                              {tr('Pre-Restore', 'Pre-Ripristino')}
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950/70 text-amber-300 border border-amber-800/60">
                              {tr('Manual', 'Manuale')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                          <span>{formatDateTime(b.createdAt)}</span>
                          <span>•</span>
                          <span>{formatFileSize(b.sizeBytes)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Integra Backup */}
                      <button
                        onClick={() => handleIntegrate(b)}
                        disabled={isLoading}
                        title={tr('Add missing data from this backup without deleting or modifying current work', 'Aggiunge i dati mancanti di questo backup senza toccare o cancellare i dati attuali')}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-600 hover:text-stone-950 text-stone-200 text-xs font-semibold flex items-center gap-1 transition border border-stone-700"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-amber-400 group-hover:text-stone-950" />
                        {tr('Integrate', 'Integra')}
                      </button>

                      {/* Ripristina Backup */}
                      <button
                        onClick={() => handleRestore(b)}
                        disabled={isLoading}
                        title={tr('Restore full state to this backup (creates a safety copy of current state first)', 'Riporta lo stato a questo backup (salva prima una copia di sicurezza dei dati attuali)')}
                        className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-red-900/60 hover:text-red-200 text-stone-300 text-xs font-medium flex items-center gap-1 transition border border-stone-700"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                        {tr('Restore', 'Ripristina')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between text-[11px] text-stone-500">
          <span>
            {tr(
              'Atomic writes enabled: database corruption is prevented even during sudden power failure or app close.',
              'Scrittura atomica attiva: la corruzione del database è scongiurata anche in caso di arresto anomalo.'
            )}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition"
          >
            {tr('Close', 'Chiudi')}
          </button>
        </div>
      </div>
    </div>
  );
};
