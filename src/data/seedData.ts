import { DndDatabase } from '../types/dnd';

export const SEED_DATABASE: DndDatabase = {
  version: 1,
  lastSavedAt: new Date().toISOString(),
  campaigns: [
    {
      id: 'camp-valle-bruma',
      title: 'Le Cronache di Valle Bruma',
      setting: 'Forgotten Realms — Frontiera del Nord',
      description:
        'Una campagna dark-fantasy investigativa ed eroica in cui antiche reliquie necromantiche si risvegliano sotto i feudi del Nord.',
      status: 'In Corso',
      createdAt: '2026-10-01T18:00:00.000Z',
    },
  ],
  characters: [
    // ================= PG (GIOCATORI) =================
    {
      id: 'pc-tharion',
      kind: 'pc',
      name: 'Tharion Vael',
      playerOrRole: 'Giocatore: Marco',
      size: 'Media',
      creatureType: 'Umanoide (Mezzelfo)',
      alignment: 'Caotico Buono',
      classOrArchetype: 'Paladino (Giuramento degli Antichi)',
      levelOrCr: 'Livello 4',
      ac: 18,
      acNote: '(Cotta di maglia, scudo)',
      hpMax: 38,
      hitDiceFormula: '4d10 + 8',
      speed: '9m',
      initiativeBonus: 1,
      passivePerception: 13,
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 16 },
      savingThrows: 'SAG +3, CAR +5',
      skills: 'Atletica +5, Intimidire +5, Persuasione +5, Percezione +3',
      senses: 'Scurovisione 18m',
      languages: 'Comune, Elfico, Silvano',
      traits: [
        {
          name: 'Percezione del Divino & Imposizione delle Mani (20 PF)',
          description:
            'Individua celestiali, immondi o non morti entro 18m. Riserva di cura rapida da 20 punti ferita per riposo lungo.',
        },
        {
          name: 'Punizione Divina (Divine Smite)',
          description:
            'Quando colpisce con un attacco in mischia, può spendere uno slot incantesimo per infliggere 2d8 danni radiosi extra (+1d8 contro non morti).',
        },
      ],
      actions: [
        {
          name: 'Spada Lunga Argentata',
          description: 'Attacco con arma da mischia: +5 al tiro per colpire, portata 1,5m, un bersaglio. Colpito: 1d8 + 3 danni taglienti.',
          attackBonus: 5,
          damageFormula: '1d8+3',
        },
        {
          name: 'Incanalare Divinità: Ira della Natura',
          description: 'Rampicanti spettrali trattengono una creatura entro 3m (TS For/Des CD 13).',
        },
      ],
      spellsNotes: 'Incantesimi preparati (CD 13, +5 colpire): Benedizione, Cura Ferite, Passo Velato, Punizione Marchiante.',
      biographyOrLore:
        'Ex cavaliere errante di Silverymoon, porta al collo un medaglione spezzato appartenuto al suo mentore scomparso.',
      tags: ['Tank', 'Guaritore Secondario', 'Party A', 'Party B'],
      accentColor: '#d97706',
    },
    {
      id: 'pc-lyra',
      kind: 'pc',
      name: 'Lyra Noctis',
      playerOrRole: 'Giocatrice: Elena',
      size: 'Media',
      creatureType: 'Umanoide (Tiefling)',
      alignment: 'Neutrale',
      classOrArchetype: 'Maga (Scuola di Evocazione)',
      levelOrCr: 'Livello 4',
      ac: 15,
      acNote: '(Armatura Magica)',
      hpMax: 26,
      hitDiceFormula: '4d6 + 8',
      speed: '9m',
      initiativeBonus: 2,
      passivePerception: 14,
      abilities: { str: 8, dex: 14, con: 14, int: 18, wis: 13, cha: 12 },
      savingThrows: 'INT +6, SAG +3',
      skills: 'Arcano +6, Indagare +6, Storia +6, Percezione +3',
      damageResistances: 'Fuoco',
      senses: 'Scurovisione 18m',
      languages: 'Comune, Infernale, Draconico, Nanico',
      traits: [
        {
          name: 'Plasmare Incantesimi (Sculpt Spells)',
          description:
            'Può creare sacche di sicurezza nei suoi incantesimi di evocazione ad area: fino a 1+livello incantesimo alleati superano automaticamente il TS e non subiscono danni.',
        },
      ],
      actions: [
        {
          name: 'Dardo di Fuoco (Fire Bolt)',
          description: 'Attacco con incantesimo a distanza: +6 al tiro per colpire, gittata 36m. Colpito: 1d10 danni da fuoco.',
          attackBonus: 6,
          damageFormula: '1d10',
        },
        {
          name: 'Raggio Rovente / Dardo Incantato',
          description: '3 raggi da 2d6 fuoco ciascuno (+6 a colpire) oppure 3 dardi automatici da 1d4+1 forza.',
          attackBonus: 6,
          damageFormula: '2d6',
        },
      ],
      spellsNotes: 'CD Incantesimi 14, Bonus attacco +6. Slot: 4 di 1° liv, 3 di 2° liv (Scudo, Individuazione del Magico, Frantumare, Passo Velato).',
      biographyOrLore: 'Studiosa di iscrizioni pre-cataclisma, cerca il diario perduto dell’Arcimago Vaelor.',
      tags: ['Caster Arcano', 'AoE', ' Conoscenze', 'Party A'],
      accentColor: '#7c3aed',
    },
    {
      id: 'pc-kaelen',
      kind: 'pc',
      name: 'Kaelen "Ombra Lesta"',
      playerOrRole: 'Giocatore: Luca',
      size: 'Media',
      creatureType: 'Umanoide (Elfo dei Boschi)',
      alignment: 'Caotico Neutrale',
      classOrArchetype: 'Ladro (Assassino)',
      levelOrCr: 'Livello 4',
      ac: 16,
      acNote: '(Armatura di cuoio borchiato)',
      hpMax: 29,
      hitDiceFormula: '4d8 + 4',
      speed: '10,5m',
      initiativeBonus: 4,
      passivePerception: 17,
      abilities: { str: 10, dex: 18, con: 12, int: 13, wis: 14, cha: 10 },
      savingThrows: 'DES +6, INT +3',
      skills: 'Furtività +8, Percezione +6, Rapidità di Mano +8, Acrobazia +6, Inganno +4',
      senses: 'Scurovisione 18m',
      languages: 'Comune, Elfico, Gergo dei Ladri',
      traits: [
        {
          name: 'Attacco Furtivo (2d6)',
          description: 'Una volta per turno infligge +2d6 danni extra se ha vantaggio o se un alleato è entro 1,5m dal bersaglio.',
        },
        {
          name: 'Azione Scaltra & Assassinare',
          description: 'Scatto, Disimpegno o Nascondersi come azione bonus. Vantaggio contro chi non ha ancora agito nel primo turno.',
        },
      ],
      actions: [
        {
          name: 'Stocco Perfetto',
          description: 'Attacco con arma da mischia: +6 a colpire, portata 1,5m. Colpito: 1d8 + 4 danni perforanti (+2d6 furtivo).',
          attackBonus: 6,
          damageFormula: '1d8+4',
        },
        {
          name: 'Arco Corto',
          description: 'Attacco con arma a distanza: +6 a colpire, gittata 24/96m. Colpito: 1d6 + 4 danni perforanti.',
          attackBonus: 6,
          damageFormula: '1d6+4',
        },
      ],
      biographyOrLore: 'Esploratore e scassinatore infallibile, conosce tutti i passaggi dei contrabbandieri.',
      tags: ['Scout', 'DPS Singolo', 'Trappole', 'Party A', 'Party B'],
      accentColor: '#059669',
    },
    {
      id: 'pc-brynja',
      kind: 'pc',
      name: 'Brynja Martellodargento',
      playerOrRole: 'Giocatrice: Sara',
      size: 'Media',
      creatureType: 'Umanoide (Nana delle Colline)',
      alignment: 'Legale Buono',
      classOrArchetype: 'Chierica (Dominio della Luce)',
      levelOrCr: 'Livello 4',
      ac: 18,
      acNote: '(Cotta di squame, scudo con simbolo sacro)',
      hpMax: 35,
      hitDiceFormula: '4d8 + 12',
      speed: '7,5m',
      initiativeBonus: 0,
      passivePerception: 16,
      abilities: { str: 14, dex: 10, con: 16, int: 11, wis: 18, cha: 12 },
      savingThrows: 'SAG +6, CAR +3',
      skills: 'Medicina +6, Intuizione +6, Religione +4',
      damageResistances: 'Veleno',
      senses: 'Scurovisione 18m',
      languages: 'Comune, Nanico, Celestiale',
      traits: [
        {
          name: 'Incanalare Divinità: Fulgore dell’Alba',
          description:
            'Dissolve l’oscurità magica entro 9m; le creature ostili subiscono 2d10 + 4 danni radiosi (TS Cos CD 14 dimezza).',
        },
        {
          name: 'Bagliore Protettivo (Reazione)',
          description: 'Impone svantaggio al tiro per colpire di un attaccante entro 9m che può vedere.',
        },
      ],
      actions: [
        {
          name: 'Martello da Guerra Consacrato',
          description: 'Attacco con arma da mischia: +4 a colpire, portata 1,5m. Colpito: 1d8 + 2 danni contundenti.',
          attackBonus: 4,
          damageFormula: '1d8+2',
        },
        {
          name: 'Fiamma Sacra (Sacred Flame)',
          description: 'TS Destrezza CD 14 o il bersaglio subisce 1d8 danni radiosi (ignora copertura).',
          damageFormula: '1d8',
        },
      ],
      spellsNotes: 'CD 14, +6 attacco. Parola Guaritrice, Benedizione, Arma Spirituale, Raggio Rovente, Guardiani Spirituali (pergamena).',
      biographyOrLore: 'Custode della Fiamma Perenne, determinata a purificare la Cripta Sussurrante.',
      tags: ['Healer', 'Supporto', 'Anti-Non Morti', 'Party B'],
      accentColor: '#eab308',
    },

    // ================= NPC =================
    {
      id: 'npc-garrick',
      kind: 'npc',
      name: 'Bramante Garrick',
      playerOrRole: 'NPC — Locandiere & Informatori ("Il Cervo Nero")',
      size: 'Media',
      creatureType: 'Umanoide (Umano)',
      alignment: 'Neutrale Buono',
      levelOrCr: 'GS 1/2 (100 PE)',
      ac: 12,
      acNote: '(Giaco di cuoio sotto il grembiule)',
      hpMax: 22,
      hitDiceFormula: '4d8 + 4',
      speed: '9m',
      initiativeBonus: 1,
      passivePerception: 14,
      abilities: { str: 13, dex: 12, con: 12, int: 11, wis: 14, cha: 15 },
      skills: 'Intuizione +4, Persuasione +4, Storia Locale +2',
      languages: 'Comune, Nanico',
      traits: [
        {
          name: 'Segreto di Famiglia',
          description:
            'Garrick possiede la chiave in ferro battuto della vecchia cappella di famiglia e sa che il crollo nella cantina porta alle catacombe.',
        },
      ],
      actions: [
        {
          name: 'Balestra Pesante sotto il Bancone',
          description: 'Attacco con arma a distanza: +3 a colpire, gittata 30/120m. Colpito: 1d10 + 1 danni perforanti.',
          attackBonus: 3,
          damageFormula: '1d10+1',
        },
      ],
      biographyOrLore:
        'Un veterano con una cicatrice sul sopracciglio sinistro. Parla a bassa voce quando nella sala ci sono forestieri e batte due volte le nocche sul legno per scaramanzia.',
      tags: ['Quest Giver', 'Locanda', 'Alleato'],
      accentColor: '#b45309',
    },
    {
      id: 'npc-elira',
      kind: 'npc',
      name: 'Sorella Elira',
      playerOrRole: 'NPC — Ultima Custode del Santuario',
      size: 'Media',
      creatureType: 'Umanoide (Mezzelfa)',
      alignment: 'Legale Buono',
      levelOrCr: 'GS 2 (450 PE)',
      ac: 13,
      hpMax: 27,
      hitDiceFormula: '5d8 + 5',
      speed: '9m',
      initiativeBonus: 0,
      passivePerception: 15,
      abilities: { str: 10, dex: 10, con: 12, int: 13, wis: 16, cha: 14 },
      skills: 'Medicina +7, Religione +5, Intuizione +5',
      languages: 'Comune, Elfico, Celestiale',
      traits: [
        {
          name: 'Benedizione del Santuario',
          description: 'Una volta per sessione può benedire le armi del gruppo conferendo +1d4 danni radiosi per 1 ora.',
        },
      ],
      actions: [
        {
          name: 'Bastone Ferrato',
          description: 'Attacco da mischia: +2 a colpire, 1d6 danni contundenti.',
          attackBonus: 2,
          damageFormula: '1d6',
        },
      ],
      biographyOrLore:
        'Trovata ferita vicino all’altare esterno; conosce il rituale per spegnere il braciere necromantico.',
      tags: ['Santuario', 'Guaritrice', 'Lore'],
      accentColor: '#0284c7',
    },

    // ================= MOSTRI & BOSS =================
    {
      id: 'mon-skeleton-guard',
      kind: 'monster',
      name: 'Scheletro Guardia Cripta',
      playerOrRole: 'Non Morto Minore — Pattuglia',
      size: 'Media',
      creatureType: 'Non Morto',
      alignment: 'Legale Malvagio',
      levelOrCr: 'GS 1/4 (50 PE)',
      ac: 14,
      acNote: '(Resti di cotta di maglia)',
      hpMax: 15,
      hitDiceFormula: '2d8 + 6',
      speed: '9m',
      initiativeBonus: 2,
      passivePerception: 9,
      abilities: { str: 12, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
      damageResistances: 'Vulnerabile ai danni Contundenti; Immune a Veleno e Sfinimento',
      senses: 'Scurovisione 18m',
      languages: 'Comprende il Comune ma non può parlare',
      traits: [
        {
          name: 'Marcia implacabile',
          description: 'Gli scheletri si rialzano dai sarcofagi quando una creatura vivente supera le colonne runiche senza pronunciare il motto.',
        },
      ],
      actions: [
        {
          name: 'Spada Corta Arrugginita',
          description: 'Attacco con arma da mischia: +4 a colpire, portata 1,5m. Colpito: 5 (1d6 + 2) danni perforanti.',
          attackBonus: 4,
          damageFormula: '1d6+2',
        },
        {
          name: 'Arco Corto Logoro',
          description: 'Attacco con arma a distanza: +4 a colpire, gittata 24/96m. Colpito: 5 (1d6 + 2) danni perforanti.',
          attackBonus: 4,
          damageFormula: '1d6+2',
        },
      ],
      biographyOrLore: 'Antichi soldati della casata Vaelor rianimati da fiamme verdi.',
      tags: ['Non Morto', 'Cripta', 'Minion'],
      accentColor: '#64748b',
    },
    {
      id: 'mon-shadow-cultist',
      kind: 'monster',
      name: 'Accolito del Velo Nero',
      playerOrRole: 'Incantatore Fanatico',
      size: 'Media',
      creatureType: 'Umanoide (Qualsiasi)',
      alignment: 'Neutrale Malvagio',
      levelOrCr: 'GS 1 (200 PE)',
      ac: 13,
      acNote: '(Armatura di cuoio + Anello runico)',
      hpMax: 27,
      hitDiceFormula: '5d8 + 5',
      speed: '9m',
      initiativeBonus: 1,
      passivePerception: 12,
      abilities: { str: 11, dex: 13, con: 12, int: 12, wis: 14, cha: 13 },
      skills: 'Inganno +3, Religione +4, Arcano +3',
      languages: 'Comune, Abissale',
      traits: [
        {
          name: 'Devozione Oscura',
          description: 'Ha vantaggio ai tiri salvezza contro l’essere affascinato o spaventato.',
        },
      ],
      actions: [
        {
          name: 'Pugnale Sacrificale (Mischia)',
          description: 'Attacco con arma da mischia: +3 a colpire, portata 1,5m. Colpito: 3 (1d4 + 1) danni perforanti + 3 (1d6) danni necrotici.',
          attackBonus: 3,
          damageFormula: '1d4+1+1d6',
        },
        {
          name: 'Dardo Necrotico (Distanza)',
          description: 'Attacco con incantesimo a distanza: +4 a colpire, gittata 18m. Colpito: 9 (2d8) danni necrotici.',
          attackBonus: 4,
          damageFormula: '2d8',
        },
      ],
      biographyOrLore: 'Indossa una maschera d’argento ossidato e sussurra litanie per alimentare il braciere.',
      tags: ['Culto', 'Incantatore', 'Cripta'],
      accentColor: '#9333ea',
    },
    {
      id: 'mon-vaelor-boss',
      kind: 'monster',
      name: 'Lord Vaelor, il Sussurro Cinereo',
      playerOrRole: 'BOSS — Cavaliere Non Morto & Necromante',
      size: 'Media',
      creatureType: 'Non Morto',
      alignment: 'Legale Malvagio',
      levelOrCr: 'GS 4 (1.100 PE)',
      ac: 17,
      acNote: '(Mezza armatura antica incantata)',
      hpMax: 78,
      hitDiceFormula: '12d8 + 24',
      speed: '9m',
      initiativeBonus: 3,
      passivePerception: 14,
      abilities: { str: 18, dex: 14, con: 15, int: 16, wis: 14, cha: 16 },
      savingThrows: 'COS +5, SAG +5, CAR +6',
      damageResistances: 'Necrotico, Freddo; Contundente, Perforante e Tagliente da attacchi non magici',
      senses: 'Scurovisione 36m',
      languages: 'Comune, Elfico, Draconico, Infernale',
      traits: [
        {
          name: 'Aura dei Sussurri (Raggio 3m)',
          description:
            'Ogni creatura ostile che inizia il turno entro 3m da Vaelor sente voci spettrali e deve superare un TS Saggezza CD 13 o subire 4 (1d8) danni psichici e non poter effettuare reazioni fino al suo prossimo turno.',
        },
        {
          name: 'Legame col Braciere Smeraldo',
          description:
            'Finché il Braciere centrale nella Sala del Trono è acceso, Vaelor rigenera 5 PF all’inizio del suo turno. Spegnere o distruggere il braciere (CA 13, 20 PF o prova di Religione/Arcano CD 14) disattiva la rigenerazione.',
        },
      ],
      actions: [
        {
          name: 'Multiattacco',
          description: 'Vaelor effettua due attacchi con lo Spadone Cinereo.',
        },
        {
          name: 'Spadone Cinereo',
          description:
            'Attacco con arma da mischia: +6 a colpire, portata 1,5m. Colpito: 11 (2d6 + 4) danni taglienti più 4 (1d8) danni necrotici.',
          attackBonus: 6,
          damageFormula: '2d6+4+1d8',
        },
        {
          name: 'Onda del Sepolcro (Ricarica 5-6)',
          description:
            'Vaelor batte la lama a terra sprigionando un cono di 4,5m di cenere spettrale. TS Costituzione CD 14: 18 (4d8) danni necrotici (dimezzati in caso di successo).',
          damageFormula: '4d8',
        },
      ],
      reactionsOrLegendary: [
        {
          name: 'Passo di Cenere (1 Azione Leggendaria)',
          description: 'Vaelor si dissolve in cenere e si teletrasporta fino a 6m in uno spazio libero che può vedere senza provocare attacchi di opportunità.',
        },
        {
          name: 'Richiamo dei Caduti (2 Azioni Leggendarie)',
          description: 'Un mucchio d’ossa nella stanza si riassembla in uno Scheletro Guardia Cripta con 10 PF.',
        },
      ],
      biographyOrLore:
        'Un tempo protettore della valle, Vaelor strinse un patto proibito per impedire la morte della sua casata, condannando tutti a un’eternità di eco e cenere.',
      tags: ['Boss', 'Non Morto', 'Azioni Leggendarie'],
      accentColor: '#dc2626',
    },
  ],

  parties: [
    {
      id: 'party-giovedi',
      name: 'La Compagnia del Grifone (Gruppo Giovedì)',
      description: 'Il gruppo storico del giovedì sera: focalizzato su investigazione, ruolo e tattica bilanciata.',
      memberCharacterIds: ['pc-tharion', 'pc-lyra', 'pc-kaelen'],
    },
    {
      id: 'party-sabato',
      name: 'Le Lame del Crepuscolo (Gruppo Sabato)',
      description: 'Secondo gruppo che gioca nel weekend la stessa avventura: formazione d’assalto sacro/furtivo.',
      memberCharacterIds: ['pc-tharion', 'pc-kaelen', 'pc-brynja'],
    },
  ],

  sfxCatalog: [
    {
      id: 'sfx-tavern-hearth',
      name: 'Camino della Locanda & Brusio',
      category: 'ambience',
      description: 'Crepitio caldo del fuoco e atmosfera accogliente della locanda Il Cervo Nero.',
      loop: true,
      defaultVolume: 0.55,
      synthPreset: 'tavern_hearth',
      iconName: 'Flame',
      color: '#d97706',
      tags: ['Locanda', 'Riposo', 'Sociale'],
    },
    {
      id: 'sfx-rain-storm',
      name: 'Pioggia Battente & Vento Notturno',
      category: 'ambience',
      description: 'Temporale esterno che batte contro le vetrate e nel cortile del santuario.',
      loop: true,
      defaultVolume: 0.5,
      synthPreset: 'rain_storm',
      iconName: 'CloudRain',
      color: '#0284c7',
      tags: ['Esterno', 'Notte', 'Tensione'],
    },
    {
      id: 'sfx-crypt-whispers',
      name: 'Echi & Sussurri della Cripta',
      category: 'ambience',
      description: 'Drone basso oscuro con risonanze spettrali per l’esplorazione del dungeon.',
      loop: true,
      defaultVolume: 0.6,
      synthPreset: 'crypt_whispers',
      iconName: 'Ghost',
      color: '#7c3aed',
      tags: ['Dungeon', 'Cripta', 'Horror'],
    },
    {
      id: 'sfx-combat-drums',
      name: 'Tamburi di Battaglia (Loop Combat)',
      category: 'combat_music',
      description: 'Ritmo incalzante di percussioni da guerra per accompagnare il Combat Tracker.',
      loop: true,
      defaultVolume: 0.65,
      synthPreset: 'combat_drums',
      iconName: 'Swords',
      color: '#dc2626',
      tags: ['Combattimento', 'Boss', 'Azione'],
    },
    {
      id: 'sfx-creaking-door',
      name: 'Cancello / Porta di Pietra Pesante',
      category: 'sfx_environment',
      description: 'Cigolio metallico profondo seguito dal tonfo della serratura antica.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'creaking_door',
      iconName: 'DoorOpen',
      color: '#78716c',
      tags: ['Porta', 'Dungeon', 'Ingresso'],
    },
    {
      id: 'sfx-thunder-clap',
      name: 'Tuono Improvviso',
      category: 'sfx_environment',
      description: 'Boato drammatico perfetto per rivelazioni o colpi di scena.',
      loop: false,
      defaultVolume: 0.85,
      synthPreset: 'thunder_clap',
      iconName: 'Zap',
      color: '#eab308',
      tags: ['Clima', 'Colpo di Scena'],
    },
    {
      id: 'sfx-trap-trigger',
      name: 'Scatto di Trappola Meccanica',
      category: 'sfx_environment',
      description: 'Click metallico secco seguito dallo scocco di dardi o lame.',
      loop: false,
      defaultVolume: 0.85,
      synthPreset: 'trap_trigger',
      iconName: 'AlertTriangle',
      color: '#f97316',
      tags: ['Trappola', 'Pericolo'],
    },
    {
      id: 'sfx-sword-clash',
      name: 'Scontro di Lame & Acciaio',
      category: 'sfx_creature',
      description: 'Impatto metallico d’inizio duello o imboscata.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'sword_clash',
      iconName: 'ShieldAlert',
      color: '#94a3b8',
      tags: ['Spada', 'Attacco'],
    },
    {
      id: 'sfx-dragon-roar',
      name: 'Ruggito / Urlo Sepolcrale del Boss',
      category: 'sfx_creature',
      description: 'Ruggito profondo e riverberato quando Lord Vaelor si risveglia dal trono.',
      loop: false,
      defaultVolume: 0.9,
      synthPreset: 'dragon_roar',
      iconName: 'Skull',
      color: '#b91c1c',
      tags: ['Boss', 'Mostro', 'Vaelor'],
    },
    {
      id: 'sfx-arcane-blast',
      name: 'Esplosione Arcana / Necrotica',
      category: 'sfx_magic',
      description: 'Scarica di energia magica per incantesimi o attivazione del braciere.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'arcane_blast',
      iconName: 'Sparkles',
      color: '#a855f7',
      tags: ['Magia', 'Incantesimo'],
    },
    {
      id: 'sfx-healing-chime',
      name: 'Luce Sacra & Guarigione',
      category: 'sfx_magic',
      description: 'Accordo cristallino celestiale per cure, benedizioni o purificazione dell’altare.',
      loop: false,
      defaultVolume: 0.75,
      synthPreset: 'healing_chime',
      iconName: 'Heart',
      color: '#10b981',
      tags: ['Cura', 'Divino'],
    },
    {
      id: 'sfx-war-horn',
      name: 'Corno da Guerra Antico',
      category: 'sfx_ui',
      description: 'Richiamo solenne di inizio sessione o arrivo dei rinforzi.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'war_horn',
      iconName: 'Volume2',
      color: '#f59e0b',
      tags: ['Inizio', 'Segnale'],
    },
  ],

  adventures: [
    {
      id: 'adv-cripta-sussurrante',
      title: 'Il Segreto della Cripta Sussurrante',
      subtitle: 'Un’avventura One-Shot gotica per 3–5 personaggi di 3°–4° livello',
      type: 'oneshot',
      campaignId: 'camp-valle-bruma',
      episodeNumber: 1,
      levelRange: 'Livello 3–4',
      estimatedDuration: '3–4 ore',
      authorOrNotes: 'Modulo pronto per testare più gruppi in parallelo con SFX e incontri integrati.',
      tags: ['One-Shot', 'Investigazione', 'Dungeon Crawl', 'Non Morti'],
      defaultPartyIds: ['party-giovedi', 'party-sabato'],
      updatedAt: '2026-10-21T16:00:00.000Z',
      scenes: [
        {
          id: 'scene-1-locanda',
          code: 'Scena 1',
          title: 'La Locanda del Cervo Nero',
          estimatedMinutes: 40,
          location: 'Villaggio di Pietrafredda — Sala comune della locanda',
          summary:
            'I personaggi vengono contattati dal locandiere Bramante Garrick durante una notte di tempesta: dalla vecchia cappella provengono sussurri e luci verdi.',
          linkedCharacterIds: ['npc-garrick', 'npc-elira'],
          linkedSfxIds: ['sfx-tavern-hearth', 'sfx-rain-storm', 'sfx-thunder-clap'],
          encounters: [],
          homebreweryMarkdown: `# Scena 1: La Locanda del Cervo Nero

La pioggia batte incessante contro i vetri piombati della locanda **Il Cervo Nero**, l'unico edificio ancora illuminato nel borgo montano di *Pietrafredda*.

@sfx[sfx-tavern-hearth] @sfx[sfx-rain-storm]

:::read-aloud
L'odore di stufato di montone, legna di pino bagnata e birra scura riempie la sala bassa. Pochi avventori siedono in silenzio vicino al camino. Dietro il bancone di quercia, un uomo robusto con una cicatrice sul sopracciglio sinistro asciuga lo stesso boccale da diversi minuti, lanciando sguardi nervosi verso la porta sbarrata. Quando vi avvicinate, si sporge in avanti e posa sul legno una pesante chiave di ferro annerito.
:::

### L'Appello di Bramante Garrick
Il locandiere @npc[npc-garrick] spiega a bassa voce la situazione agli avventurieri:
- Tre notti fa, un fulmine ha spaccato il sigillo esterno del vecchio **Santuario di Casa Vaelor**, sulla collina a nord del villaggio.
- **Sorella Elira** (@npc[npc-elira]), la custode del santuario, si è recata lassù ieri al tramonto e non è più tornata.
- Chiunque si avvicini al cancello sente voci che pronunciano il proprio nome dall'interno della terra.

@sfx[sfx-thunder-clap]

:::dm-note
**Prove di Abilità & Indizi nella Locanda**
- **Intuizione (Insight) CD 12**: Garrick nasconde un senso di colpa personale; suo nonno era lo scudiero di Lord Vaelor e custodiva il motto inciso sulla chiave: *"Luce nella cenere, silenzio nel ferro"*.
- **Storia o Religione CD 13**: I PG ricordano che Lord Vaelor non morì in battaglia, ma sigillò la propria cripta dall'interno durante la Peste Cinerea.
- **Ricompensa promessa**: **150 mo** raccolte dal consiglio del villaggio più il permesso di tenere qualsiasi reliquia non maledetta trovata nel complesso.
:::

| D6 | Diceria degli Avventori nella Locanda | Verità dietro la Diceria |
| :-: | :--- | :--- |
| **1-2** | *"I morti camminano solo se calpesti le rune centrali."* | **Vero**: i sarcofagi nella Scena 2 reagiscono a chi non pronuncia il motto. |
| **3-4** | *"C'è un tesoro d'oro puro dietro il trono."* | **Parziale**: c'è una cassa runica, ma il vero potere è nel Braciere Smeraldo. |
| **5-6** | *"Sorella Elira è passata dalla parte dei cultisti."* | **Falso**: Elira è prigioniera e ferita nell'anticamera. |`,
        },
        {
          id: 'scene-2-navata',
          code: 'Scena 2',
          title: 'Il Cancello Spezzato e la Navata delle Urne',
          estimatedMinutes: 60,
          location: 'Ingresso della Cripta — Corridoio delle Colonne Runiche',
          summary:
            'I PG aprono il portale di pietra, trovano Sorella Elira ferita e affrontano la guardia scheletrica e l’accolito di vedetta.',
          linkedCharacterIds: ['npc-elira', 'mon-skeleton-guard', 'mon-shadow-cultist'],
          linkedSfxIds: ['sfx-creaking-door', 'sfx-crypt-whispers', 'sfx-trap-trigger', 'sfx-sword-clash'],
          encounters: [
            {
              id: 'enc-navata-guardie',
              name: 'Imboscata nella Navata delle Urne',
              difficulty: 'Media',
              environment: 'Corridoio lastricato con 6 colonne (copertura mezza) e bracieri spenti',
              description:
                '2 Scheletri Guardia Cripta emergono dalle nicchie laterali mentre 1 Accolito del Velo Nero lancia dardi necrotici dalla balconata in fondo.',
              autoSfxId: 'sfx-sword-clash',
              slots: [
                { characterId: 'mon-skeleton-guard', count: 2, customLabel: 'Scheletro Guardia' },
                { characterId: 'mon-shadow-cultist', count: 1, customLabel: 'Accolito della Balconata' },
              ],
            },
          ],
          homebreweryMarkdown: `# Scena 2: La Navata delle Urne

Salendo il sentiero fangoso, il cancello del santuario appare avvolto da una nebbia innaturale. Inserendo la chiave di Garrick nella serratura, il pesante battente cede con un lamento metallico.

@sfx[sfx-creaking-door] @sfx[sfx-crypt-whispers]

:::read-aloud
I gradini scendono in una navata sotterranea sorretta da sei colonne scolpite a forma di cavalieri in lutto. Una debole fosforescenza verdastra filtra dalla porta in fondo. Accasciata dietro la prima colonna a sinistra vedete una figura in vesti bianche macchiate di fuliggine: è Sorella Elira, che vi fa cenno di fermarvi prima di calpestare il mosaico centrale!
:::

### La Trappola del Mosaico Runico
Il pavimento centrale riporta l'iscrizione in Elfico antico.
- **Percezione Passiva 14+ o Indagare CD 13**: Nota le piastre a pressione collegate alle nicchie dei sarcofagi.
- Se un PG attraversa il mosaico senza pronunciare *"Luce nella cenere, silenzio nel ferro"*, scatta la runa d'allarme (@sfx[sfx-trap-trigger]).

### Incontro Previsto: Le Sentinelle del Velo
Dalla balconata in fondo, un @npc[mon-shadow-cultist] ordina agli @npc[mon-skeleton-guard] di eliminare gli intrusi!

@encounter[enc-navata-guardie]

:::dm-note
**Tattica dei Mostri e Aiuto di Sorella Elira**
- Gli **Scheletri Guardia** bloccano il corridoio centrale per impedire ai PG da mischia di raggiungere subito l'Accolito.
- L'**Accolito del Velo Nero** sfrutta la balconata (mezza copertura, +2 CA) finché non viene ingaggiato.
- Se curata di almeno 1 PF (@sfx[sfx-healing-chime]), **Sorella Elira** (@npc[npc-elira]) rivela il punto debole di Lord Vaelor nella stanza successiva: *"Non colpite solo l'armatura! Spegnete il Braciere Smeraldo o la cenere continuerà a ricomporlo!"*
:::`,
        },
        {
          id: 'scene-3-trono',
          code: 'Scena 3',
          title: 'Il Santuario del Braciere Smeraldo (Boss Finale)',
          estimatedMinutes: 80,
          location: 'Camera Sepolcrale di Lord Vaelor',
          summary:
            'Scontro finale nella camera circolare contro Lord Vaelor e il rituale del Braciere Smeraldo.',
          linkedCharacterIds: ['mon-vaelor-boss', 'mon-skeleton-guard', 'mon-shadow-cultist'],
          linkedSfxIds: ['sfx-dragon-roar', 'sfx-combat-drums', 'sfx-arcane-blast', 'sfx-healing-chime'],
          encounters: [
            {
              id: 'enc-boss-vaelor',
              name: 'Il Risveglio di Lord Vaelor (Boss Fight)',
              difficulty: 'Difficile',
              environment: 'Sala circolare con il Braciere Smeraldo al centro e il Trono di Pietra a nord',
              description:
                'Lord Vaelor scende dal trono impugnando lo Spadone Cinereo, affiancato da 1 Accolito e 1 Scheletro Guardia.',
              autoSfxId: 'sfx-combat-drums',
              slots: [
                { characterId: 'mon-vaelor-boss', count: 1, customLabel: 'Lord Vaelor' },
                { characterId: 'mon-shadow-cultist', count: 1, customLabel: 'Celebrante del Rituale' },
                { characterId: 'mon-skeleton-guard', count: 1, customLabel: 'Guardia del Trono' },
              ],
            },
          ],
          homebreweryMarkdown: `# Scena 3: Il Santuario del Braciere Smeraldo

Oltre il portale inciso, la temperatura cala bruscamente. Il vostro respiro si trasforma in vapore bianco.

@sfx[sfx-dragon-roar] @sfx[sfx-arcane-blast]

:::read-aloud
Al centro di una vasta sala circolare arde un imponente braciere di bronzo da cui si levano fiamme color smeraldo che non emanano calore. Sulla scalinata opposta siede una figura imponente in mezza armatura antica. Quando entrate, due orbite di brace verde si accendono sotto l'elmo: Lord Vaelor si alza lentamente, sguainando uno spadone avvolto da spire di cenere.
*"Siete venuti a reclamare il silenzio... o a unirvi al coro?"*
:::

### Scontro Finale: Il Signore delle Ceneri
Avvia lo scontro principale quando il dialogo termina o appena un PG attacca il braciere:

@encounter[enc-boss-vaelor]

:::dm-note
**Gestione Dinamica dello Scontro (Meccanica del Braciere)**
1. **Il Braciere Smeraldo** si trova al centro della mappa (CA 13, 20 PF, immune a veleno/psichico).
2. In alternativa agli attacchi fisici, un PG adiacente può usare un'azione per tentare una prova di **Religione o Arcano CD 14** o lanciare *Dissolvi Magie* / *Fulgore dell'Alba* (@sfx[sfx-healing-chime]) per spegnerlo istantaneamente.
3. Quando il Braciere viene spento, **Lord Vaelor** (@npc[mon-vaelor-boss]) perde la rigenerazione di 5 PF/turno e subisce subito 10 danni radiosi di contraccolpo!
:::

### Conclusione & Tesoro
Con la caduta di Vaelor, i sussurri cessano e una quiete solenne avvolge il santuario. Nel reliquiario dietro il trono i personaggi trovano:
- **Lama Votivale dell'Alba** (*Spada lunga +1* che emette luce fioca a comando);
- **Borsa con 220 mo** in conio antico e un *Anello di Protezione Mentale*;
- **Il Diario Sigillato di Vaelor** (gancio diretto per il Capitolo 2 della campagna *Le Cronache di Valle Bruma*!).`,
        },
      ],
    },
    {
      id: 'adv-forte-bruma-ep2',
      title: 'Capitolo II — Le Ombre di Forte Bruma',
      subtitle: 'Seguito diretto: il diario trovato nella cripta conduce alla fortezza di confine',
      type: 'campaign_module',
      campaignId: 'camp-valle-bruma',
      episodeNumber: 2,
      levelRange: 'Livello 4–5',
      estimatedDuration: '2–3 sessioni',
      authorOrNotes: 'Secondo modulo sequenziale collegato alla campagna Le Cronache di Valle Bruma.',
      tags: ['Campagna', 'Assedio', 'Intrigo Politico'],
      defaultPartyIds: ['party-giovedi'],
      updatedAt: '2026-10-20T10:00:00.000Z',
      scenes: [
        {
          id: 'scene-fb-1',
          code: 'Atto I',
          title: 'L’Arrivo alle Porte di Forte Bruma',
          estimatedMinutes: 50,
          location: 'Ponte Levatoio di Forte Bruma',
          summary: 'I PG mostrano il sigillo di Vaelor alla guarnigione in quarantena.',
          linkedCharacterIds: ['npc-garrick', 'mon-shadow-cultist'],
          linkedSfxIds: ['sfx-war-horn', 'sfx-rain-storm'],
          encounters: [],
          homebreweryMarkdown: `# Atto I: Le Porte di Forte Bruma

@sfx[sfx-war-horn]

:::read-aloud
Le torri di basalto di Forte Bruma emergono dalla nebbia mattutina. Sulle merlature sventolano gli stendardi di quarantena: nessuno entra e nessuno esce senza il salvacondotto del Capitano.
:::

:::dm-note
Se i PG hanno salvato @npc[npc-elira] nell'avventura precedente, il suo salvacondotto apre immediatamente le porte senza bisogno di tiri di Persuasione.
:::`,
        },
      ],
    },
  ],

  playInstances: [
    {
      id: 'inst-giovedi-run1',
      adventureId: 'adv-cripta-sussurrante',
      instanceName: 'Run #1 — Gruppo del Giovedì (Serata 1)',
      groupName: 'La Compagnia del Grifone (Marco, Elena, Luca)',
      partyCharacterIds: ['pc-tharion', 'pc-lyra', 'pc-kaelen'],
      status: 'active',
      sessionCount: 1,
      currentSceneId: 'scene-2-navata',
      visitedSceneIds: ['scene-1-locanda', 'scene-2-navata'],
      sceneNotes: {
        'scene-1-locanda':
          'Lyra ha superato il tiro di Storia (19) ricordando il passato di Lord Vaelor. Kaelen ha contrattato con Garrick ottenendo 2 pozioni di guarigione in anticipo.',
        'scene-2-navata':
          'Kaelen ha individuato la piastra a pressione prima che Tharion ci camminasse sopra! Hanno appena curato Sorella Elira e stanno per affrontare le guardie.',
      },
      pcStatus: {
        'pc-tharion': {
          characterId: 'pc-tharion',
          hpCurrent: 34,
          tempHp: 0,
          conditions: ['Benedetto'],
          inspiration: true,
          sessionNotes: 'Custodisce la chiave di ferro di Garrick.',
        },
        'pc-lyra': {
          characterId: 'pc-lyra',
          hpCurrent: 26,
          tempHp: 5,
          conditions: [],
          inspiration: false,
          sessionNotes: 'Armatura Magica attiva (-1 slot di 1° liv).',
        },
        'pc-kaelen': {
          characterId: 'pc-kaelen',
          hpCurrent: 29,
          tempHp: 0,
          conditions: [],
          inspiration: true,
          sessionNotes: 'In avanscoperta dietro la seconda colonna.',
        },
      },
      timeline: [
        {
          id: 'log-1',
          timestamp: '2026-10-18T21:15:00.000Z',
          sceneId: 'scene-1-locanda',
          sceneTitle: 'La Locanda del Cervo Nero',
          category: 'narrative',
          title: 'Incontro con Bramante Garrick',
          details:
            'Il gruppo ha accettato l’incarico di esplorare il Santuario. Garrick ha consegnato la chiave di ferro e rivelato il motto di famiglia.',
          pinnedForRecap: true,
        },
        {
          id: 'log-2',
          timestamp: '2026-10-18T21:50:00.000Z',
          sceneId: 'scene-2-navata',
          sceneTitle: 'Il Cancello Spezzato e la Navata delle Urne',
          category: 'choice',
          title: 'Mosaico Runico Disinnescato & Salvataggio di Elira',
          details:
            'Kaelen ha notato il meccanismo a pressione; Tharion ha usato Imposizione delle Mani (5 PF) per rimettere in piedi Sorella Elira.',
          pinnedForRecap: true,
        },
      ],
      activeCombat: null,
      startedAt: '2026-10-18T21:00:00.000Z',
      lastPlayedAt: '2026-10-18T22:45:00.000Z',
    },
    {
      id: 'inst-sabato-run2',
      adventureId: 'adv-cripta-sussurrante',
      instanceName: 'Run #2 — Gruppo del Sabato (One-Shot Weekend)',
      groupName: 'Le Lame del Crepuscolo (Marco, Luca, Sara)',
      partyCharacterIds: ['pc-tharion', 'pc-kaelen', 'pc-brynja'],
      status: 'active',
      sessionCount: 1,
      currentSceneId: 'scene-1-locanda',
      visitedSceneIds: ['scene-1-locanda'],
      sceneNotes: {
        'scene-1-locanda':
          'Questo gruppo ha iniziato con un approccio molto più diretto: Brynja ha benedetto i presenti nella locanda per calmare il panico.',
      },
      pcStatus: {
        'pc-tharion': {
          characterId: 'pc-tharion',
          hpCurrent: 38,
          tempHp: 0,
          conditions: [],
          inspiration: false,
          sessionNotes: 'Pronto a partire verso la collina.',
        },
        'pc-kaelen': {
          characterId: 'pc-kaelen',
          hpCurrent: 29,
          tempHp: 0,
          conditions: [],
          inspiration: false,
          sessionNotes: '',
        },
        'pc-brynja': {
          characterId: 'pc-brynja',
          hpCurrent: 35,
          tempHp: 0,
          conditions: [],
          inspiration: true,
          sessionNotes: 'Simbolo sacro pronto per scacciare non morti.',
        },
      },
      timeline: [
        {
          id: 'log-sab-1',
          timestamp: '2026-10-20T16:30:00.000Z',
          sceneId: 'scene-1-locanda',
          sceneTitle: 'La Locanda del Cervo Nero',
          category: 'narrative',
          title: 'Giuramento nella Locanda',
          details:
            'Brynja ha promesso a Garrick di riportare Sorella Elira sana e salva senza chiedere anticipi in oro.',
          pinnedForRecap: true,
        },
      ],
      activeCombat: null,
      startedAt: '2026-10-20T16:15:00.000Z',
      lastPlayedAt: '2026-10-20T17:00:00.000Z',
    },
  ],
};
