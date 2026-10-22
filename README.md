# Vellum — Gestore Campagne, One-Shot & DM Studio

Applicazione Web + Desktop (**Tauri v2 + React + TypeScript + Tailwind CSS**) progettata per Dungeon Master di D&D 5e.

## Funzionalità Principali

1. **Editor & Renderer Stile Homebrewery Interattivo**:
   - Impaginazione su pergamena D&D 5e (layout a 1 o 2 colonne, font classici, tabelle verdi/pergamena, capilettera).
   - Sintassi dedicata:
     - `:::read-aloud` ... `:::` → Box narrativo da leggere ad alta voce ai giocatori (con pulsante rapido per salvarlo nel diario della sessione).
     - `:::dm-note` ... `:::` → Box segreto per il Dungeon Master (nascondibile con 1 click in *Vista Giocatori*).
     - `@sfx[id]` → Inserisce un pulsante audio interattivo direttamente nel paragrafo della storia.
     - `@npc[id]` → Inserisce un badge cliccabile che apre la scheda / statblock 5e del personaggio o mostro.
     - `@statblock[id]` → Incorpora l'intero Statblock D&D 5e direttamente nella pagina.
     - `@encounter[id]` → Incorpora il riquadro di un incontro preparato con il pulsante **"⚔️ Avvia Combattimento"**.

2. **Gestione Multi-Istanza (Stessa Storia su Più Gruppi)**:
   - Separazione netta tra **Blueprint dell'Avventura** (One-Shot o Capitolo di Campagna) e **Istanza di Gioco (`PlayInstance`)**.
   - Puoi avviare la stessa One-Shot o Campagna per il *Gruppo del Giovedì*, il *Gruppo del Sabato*, ecc.
   - Ogni istanza mantiene isolati: scena corrente, scene visitate, PF/condizioni/ispirazione dei PG, combattimento attivo, note di scena e diario passo-passo.

3. **Repository Globale di PG, NPC, Bestiario & Gruppi**:
   - Schede complete D&D 5e con calcolo automatico dei modificatori, CA, PF, dadi vita, iniziativa, percezione passiva, tratti, azioni e azioni leggendarie.
   - Creazione di **Gruppi (Party)** riutilizzabili per avviare nuove istanze in un click.

4. **Combat Tracker Integrato (Previsto da Storia o Al Volo)**:
   - Avviabile con 1 click da un blocco `@encounter[id]` nella storia oppure **al volo** per scontri imprevisti.
   - Calcolo automatico dell'iniziativa (`1d20 + bonus`), gestione turni/round, danni/cure, condizioni D&D 5e e visualizzazione live dello Statblock del combattente di turno.
   - A fine scontro sincronizza i PF dei PG nell'istanza e registra il riepilogo nel diario della partita.

5. **Soundboard & Gestore SFX Contestuale**:
   - Libreria globale di atmosfere in loop e SFX one-shot (con sintetizzatore Web Audio procedurale integrato pronto all'uso + possibilità di caricare file `.mp3`, `.wav`, `.ogg` personalizzati).
   - Assegnazione di SFX specifici a ciascuna scena così da averli subito a portata di mano nella Console DM.

6. **Persistenza su Disco Locale & Architettura Cloud-Ready**:
   - In modalità sviluppo/web salva automaticamente su `./data/dnd5e-db.json` su disco; in modalità Tauri nativa salva nella directory AppData locale (oltre a permettere Export/Import JSON completo).
   - Il livello dati (`src/services/storageRepository.ts`) implementa l'interfaccia `IStorageRepository`, pronta per essere collegata a un backend cloud/SaaS futuro.

## Install & Avvio Rapido

```bash
# Installazione dipendenze
npm install

# Avvio rapido interfaccia Web + salvataggio su disco ./data/dnd5e-db.json
npm run dev

# Avvio come applicazione Desktop nativa Tauri v2
npm run tauri dev
```

## Releases

| Version | Date | Platform | Notes |
| :--- | :--- | :--- | :--- |
| *Unreleased* | — | Windows / macOS | [CHANGELOG.md](./CHANGELOG.md) |

