import {
  AbilityKey,
  CharacterEntity,
  DND_ABILITY_META,
  DND_SKILLS,
  ProficiencyRank,
  SkillId,
  StatblockEntry,
  getModValue,
  getProficiencyBonus,
  resolveSavingThrowProficiencies,
  resolveSkillProficiencies,
} from '../types/dnd';

// ============================================================================
// Standard D&D 5e SRD Races & Classes Data
// ============================================================================

export interface StandardRaceTrait {
  nameEn: string;
  nameIt: string;
  descEn: string;
  descIt: string;
}

export interface StandardRaceDef {
  id: string;
  nameEn: string;
  nameIt: string;
  size: 'Medium' | 'Small' | 'Media' | 'Piccola';
  speed: string;
  sensesEn: string;
  sensesIt: string;
  languagesEn: string;
  languagesIt: string;
  abilityBonuses: Partial<Record<AbilityKey, number>>;
  traits: StandardRaceTrait[];
  defaultSkillProficiencies?: SkillId[];
}

export interface ClassFeatureDef {
  level: number;
  nameEn: string;
  nameIt: string;
  descEn: string;
  descIt: string;
  isAsi?: boolean;
  isSubclassChoice?: boolean;
  guidanceEn?: string;
  guidanceIt?: string;
}

export interface StandardClassDef {
  id: string;
  nameEn: string;
  nameIt: string;
  hitDie: 6 | 8 | 10 | 12;
  primaryAbilities: AbilityKey[];
  savingThrows: [AbilityKey, AbilityKey];
  skillChoices: SkillId[];
  skillCount: number;
  subclassLevel: number;
  subclassLabelEn: string;
  subclassLabelIt: string;
  features: ClassFeatureDef[];
}

export const STANDARD_RACES: readonly StandardRaceDef[] = [
  {
    id: 'human',
    nameEn: 'Human',
    nameIt: 'Umano',
    size: 'Medium',
    speed: '30 ft.',
    sensesEn: 'Normal vision',
    sensesIt: 'Vista normale',
    languagesEn: 'Common, one extra language',
    languagesIt: 'Comune, un linguaggio a scelta',
    abilityBonuses: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
    traits: [
      {
        nameEn: '(Human) Versatility',
        nameIt: '(Umano) Versatilità',
        descEn: 'Humans are adaptable and ambitious, gaining +1 to all ability scores.',
        descIt: 'Gli umani sono adattabili e determinati, ottenendo +1 a tutti i punteggi di caratteristica.',
      },
    ],
  },
  {
    id: 'elf',
    nameEn: 'Elf (High / Wood)',
    nameIt: 'Elfo (Alto / Silvano)',
    size: 'Medium',
    speed: '30 ft.',
    sensesEn: 'Darkvision 60 ft.',
    sensesIt: 'Scurovisione 18m',
    languagesEn: 'Common, Elvish',
    languagesIt: 'Comune, Elfico',
    abilityBonuses: { dex: 2, int: 1 },
    traits: [
      {
        nameEn: '(Elf) Darkvision',
        nameIt: '(Elfo) Scurovisione',
        descEn: 'Can see in dim light within 60 ft. as if it were bright light, and in darkness as if dim light.',
        descIt: 'Vede nella luce fioca entro 18m come se fosse luce intensa, e nel buio come se fosse luce fioca.',
      },
      {
        nameEn: '(Elf) Keen Senses',
        nameIt: '(Elfo) Sensi Acuti',
        descEn: 'Proficiency in the Perception skill.',
        descIt: 'Competenza nell’abilità Percezione.',
      },
      {
        nameEn: '(Elf) Fey Ancestry',
        nameIt: '(Elfo) Discendenza Fatata',
        descEn: 'Advantage on saving throws against being charmed, and magic cannot put you to sleep.',
        descIt: 'Vantaggio ai tiri salvezza contro l’essere affascinato e il sonno magico non ha effetto.',
      },
      {
        nameEn: '(Elf) Trance',
        nameIt: '(Elfo) Trance',
        descEn: 'Elves do not need to sleep, meditating deeply for 4 hours instead.',
        descIt: 'Gli elfi non dormono: meditano profondamente per 4 ore per ottenere i benefici di un riposo lungo.',
      },
    ],
    defaultSkillProficiencies: ['perception'],
  },
  {
    id: 'dwarf',
    nameEn: 'Dwarf (Hill / Mountain)',
    nameIt: 'Nano (delle Colline / delle Montagne)',
    size: 'Medium',
    speed: '25 ft.',
    sensesEn: 'Darkvision 60 ft.',
    sensesIt: 'Scurovisione 18m',
    languagesEn: 'Common, Dwarvish',
    languagesIt: 'Comune, Nanico',
    abilityBonuses: { con: 2, wis: 1 },
    traits: [
      {
        nameEn: '(Dwarf) Darkvision',
        nameIt: '(Nano) Scurovisione',
        descEn: 'Can see in dim light within 60 ft. as bright light, and in darkness as dim light.',
        descIt: 'Vede nella luce fioca entro 18m come luce intensa e nell’oscurità come luce fioca.',
      },
      {
        nameEn: '(Dwarf) Dwarven Resilience',
        nameIt: '(Nano) Resilienza Nanica',
        descEn: 'Advantage on saving throws against poison, and resistance against poison damage.',
        descIt: 'Vantaggio ai tiri salvezza contro il veleno e resistenza ai danni da veleno.',
      },
      {
        nameEn: '(Dwarf) Stonecunning',
        nameIt: '(Nano) Conoscenza della Pietra',
        descEn: 'Double proficiency bonus on History checks related to the origin of stonework.',
        descIt: 'Raddoppia il bonus di competenza alle prove di Storia relative all’origine di opere in pietra.',
      },
    ],
  },
  {
    id: 'halfling',
    nameEn: 'Halfling (Lightfoot / Stout)',
    nameIt: 'Halfling (Piedelesto / Robustieri)',
    size: 'Small',
    speed: '25 ft.',
    sensesEn: 'Normal vision',
    sensesIt: 'Vista normale',
    languagesEn: 'Common, Halfling',
    languagesIt: 'Comune, Halfling',
    abilityBonuses: { dex: 2, cha: 1 },
    traits: [
      {
        nameEn: '(Halfling) Lucky',
        nameIt: '(Halfling) Fortunato',
        descEn: 'When you roll a 1 on an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.',
        descIt: 'Quando ottieni un 1 al d20 per un tiro per colpire, prova di caratteristica o tiro salvezza, puoi ritirare il dado.',
      },
      {
        nameEn: '(Halfling) Brave',
        nameIt: '(Halfling) Coraggioso',
        descEn: 'Advantage on saving throws against being frightened.',
        descIt: 'Vantaggio ai tiri salvezza contro l’essere spaventato.',
      },
      {
        nameEn: '(Halfling) Halfling Nimbleness',
        nameIt: '(Halfling) Agilità Halfling',
        descEn: 'Can move through the space of any creature that is of a size larger than yours.',
        descIt: 'Può muoversi attraverso lo spazio di qualsiasi creatura di taglia superiore alla propria.',
      },
    ],
  },
  {
    id: 'dragonborn',
    nameEn: 'Dragonborn',
    nameIt: 'Dragonide',
    size: 'Medium',
    speed: '30 ft.',
    sensesEn: 'Normal vision',
    sensesIt: 'Vista normale',
    languagesEn: 'Common, Draconic',
    languagesIt: 'Comune, Draconico',
    abilityBonuses: { str: 2, cha: 1 },
    traits: [
      {
        nameEn: '(Dragonborn) Draconic Ancestry & Breath Weapon',
        nameIt: '(Dragonide) Discendenza Draconica & Soffio',
        descEn: 'Exhales destructive energy (2d6 elemental damage, DC 8 + CON mod + PB, recharge on short or long rest). Scales at 6th, 11th, and 16th levels.',
        descIt: 'Emette energia distruttiva (2d6 danni elementali, CD 8 + mod COS + PB, ricarica a riposo breve o lungo). Scala ai livelli 6, 11 e 16.',
      },
      {
        nameEn: '(Dragonborn) Damage Resistance',
        nameIt: '(Dragonide) Resistenza ai Danni',
        descEn: 'Resistance to the damage type associated with your draconic ancestry.',
        descIt: 'Resistenza al tipo di danno associato al proprio drago progenitore.',
      },
    ],
  },
  {
    id: 'gnome',
    nameEn: 'Gnome (Forest / Rock)',
    nameIt: 'Gnomo (delle Foreste / delle Rocce)',
    size: 'Small',
    speed: '25 ft.',
    sensesEn: 'Darkvision 60 ft.',
    sensesIt: 'Scurovisione 18m',
    languagesEn: 'Common, Gnomish',
    languagesIt: 'Comune, Gnomesco',
    abilityBonuses: { int: 2, con: 1 },
    traits: [
      {
        nameEn: '(Gnome) Darkvision',
        nameIt: '(Gnomo) Scurovisione',
        descEn: 'Can see in dim light within 60 ft. as bright light, and darkness as dim light.',
        descIt: 'Vede nella luce fioca entro 18m come luce intensa e nell’oscurità come luce fioca.',
      },
      {
        nameEn: '(Gnome) Gnome Cunning',
        nameIt: '(Gnomo) Astuzia Gnomesca',
        descEn: 'Advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.',
        descIt: 'Vantaggio a tutti i tiri salvezza su Intelligenza, Saggezza e Carisma contro la magia.',
      },
    ],
  },
  {
    id: 'half_elf',
    nameEn: 'Half-Elf',
    nameIt: 'Mezzelfo',
    size: 'Medium',
    speed: '30 ft.',
    sensesEn: 'Darkvision 60 ft.',
    sensesIt: 'Scurovisione 18m',
    languagesEn: 'Common, Elvish, one extra language',
    languagesIt: 'Comune, Elfico, un linguaggio a scelta',
    abilityBonuses: { cha: 2, dex: 1, con: 1 },
    traits: [
      {
        nameEn: '(Half-Elf) Darkvision',
        nameIt: '(Mezzelfo) Scurovisione',
        descEn: 'Can see in dim light within 60 ft. as bright light, and in darkness as dim light.',
        descIt: 'Vede nella luce fioca entro 18m come luce intensa e nell’oscurità come luce fioca.',
      },
      {
        nameEn: '(Half-Elf) Fey Ancestry',
        nameIt: '(Mezzelfo) Discendenza Fatata',
        descEn: 'Advantage on saving throws against being charmed, and magic cannot put you to sleep.',
        descIt: 'Vantaggio ai tiri salvezza contro l’essere affascinato e il sonno magico non ha effetto.',
      },
      {
        nameEn: '(Half-Elf) Skill Versatility',
        nameIt: '(Mezzelfo) Versatilità nelle Abilità',
        descEn: 'Gain proficiency in two skills of your choice.',
        descIt: 'Ottiene competenza in due abilità a scelta.',
      },
    ],
  },
  {
    id: 'half_orc',
    nameEn: 'Half-Orc',
    nameIt: 'Mezzorco',
    size: 'Medium',
    speed: '30 ft.',
    sensesEn: 'Darkvision 60 ft.',
    sensesIt: 'Scurovisione 18m',
    languagesEn: 'Common, Orc',
    languagesIt: 'Comune, Orchesco',
    abilityBonuses: { str: 2, con: 1 },
    traits: [
      {
        nameEn: '(Half-Orc) Darkvision',
        nameIt: '(Mezzorco) Scurovisione',
        descEn: 'Can see in dim light within 60 ft. as bright light, and in darkness as dim light.',
        descIt: 'Vede nella luce fioca entro 18m come luce intensa e nell’oscurità come luce fioca.',
      },
      {
        nameEn: '(Half-Orc) Menacing',
        nameIt: '(Mezzorco) Minaccioso',
        descEn: 'Proficiency in the Intimidation skill.',
        descIt: 'Competenza nell’abilità Intimidire.',
      },
      {
        nameEn: '(Half-Orc) Relentless Endurance',
        nameIt: '(Mezzorco) Tenacia Implacabile',
        descEn: 'When reduced to 0 hit points but not killed outright, you can drop to 1 hit point instead (1/long rest).',
        descIt: 'Quando ridotto a 0 PF senza essere ucciso all’istante, scende invece a 1 PF (1/riposo lungo).',
      },
      {
        nameEn: '(Half-Orc) Savage Attacks',
        nameIt: '(Mezzorco) Attacchi Selvaggi',
        descEn: 'When you score a critical hit with a melee weapon, roll one of the weapon’s damage dice one additional time.',
        descIt: 'Quando metti a segno un colpo critico con un’arma da mischia, tiri un dado di danno aggiuntivo dell’arma.',
      },
    ],
    defaultSkillProficiencies: ['intimidation'],
  },
  {
    id: 'tiefling',
    nameEn: 'Tiefling',
    nameIt: 'Tiefling',
    size: 'Medium',
    speed: '30 ft.',
    sensesEn: 'Darkvision 60 ft.',
    sensesIt: 'Scurovisione 18m',
    languagesEn: 'Common, Infernal',
    languagesIt: 'Comune, Infernale',
    abilityBonuses: { cha: 2, int: 1 },
    traits: [
      {
        nameEn: '(Tiefling) Darkvision',
        nameIt: '(Tiefling) Scurovisione',
        descEn: 'Can see in dim light within 60 ft. as bright light, and in darkness as dim light.',
        descIt: 'Vede nella luce fioca entro 18m come luce intensa e nell’oscurità come luce fioca.',
      },
      {
        nameEn: '(Tiefling) Hellish Resistance',
        nameIt: '(Tiefling) Resistenza Infernale',
        descEn: 'Resistance to fire damage.',
        descIt: 'Resistenza ai danni da fuoco.',
      },
      {
        nameEn: '(Tiefling) Infernal Legacy',
        nameIt: '(Tiefling) Eredità Infernale',
        descEn: 'Knows Thaumaturgy cantrip. At 3rd level: Hellish Rebuke (1/day as 2nd-level spell). At 5th level: Darkness (1/day). Charisma is spellcasting ability.',
        descIt: 'Conosce il trucchetto Taumaturgia. Al 3° livello: Intimorire Infernale (1/giorno al 2° livello). Al 5° livello: Oscurità (1/giorno). Carisma è la caratteristica da incantatore.',
      },
    ],
  },
] as const;

export const STANDARD_CLASSES: readonly StandardClassDef[] = [
  {
    id: 'barbarian',
    nameEn: 'Barbarian',
    nameIt: 'Barbaro',
    hitDie: 12,
    primaryAbilities: ['str', 'con'],
    savingThrows: ['str', 'con'],
    skillChoices: ['animal_handling', 'athletics', 'intimidation', 'nature', 'perception', 'survival'],
    skillCount: 2,
    subclassLevel: 3,
    subclassLabelEn: 'Primal Path',
    subclassLabelIt: 'Cammino Primordiale',
    features: [
      {
        level: 1,
        nameEn: '(Barbarian) Rage',
        nameIt: '(Barbaro) Ira',
        descEn: 'In battle, fight with primal ferocity: bonus damage on melee STR attacks, advantage on STR checks/saves, resistance to bludgeoning/piercing/slashing.',
        descIt: 'In battaglia combatti con ferocia primordiale: bonus ai danni da mischia su FOR, vantaggio alle prove/TS su FOR, resistenza a danni contundenti, perforanti e taglienti.',
      },
      {
        level: 1,
        nameEn: '(Barbarian) Unarmored Defense',
        nameIt: '(Barbaro) Difesa Senza Armatura',
        descEn: 'While not wearing armor, your AC equals 10 + DEX mod + CON mod. You can use a shield.',
        descIt: 'Finché non indossi armature, la tua CA è pari a 10 + mod DES + mod COS. Puoi usare uno scudo.',
      },
      {
        level: 2,
        nameEn: '(Barbarian) Reckless Attack',
        nameIt: '(Barbaro) Attacco Irruente',
        descEn: 'Gain advantage on melee weapon attack rolls using STR, but attack rolls against you have advantage until next turn.',
        descIt: 'Ottieni vantaggio ai tiri per colpire in mischia con FOR, ma gli attacchi contro di te hanno vantaggio fino al tuo prossimo turno.',
      },
      {
        level: 2,
        nameEn: '(Barbarian) Danger Sense',
        nameIt: '(Barbaro) Senso del Pericolo',
        descEn: 'Advantage on DEX saving throws against effects you can see, such as traps and spells.',
        descIt: 'Vantaggio ai tiri salvezza su Destrezza contro effetti visibili, come trappole e incantesimi.',
      },
      {
        level: 3,
        nameEn: '(Barbarian) Primal Path',
        nameIt: '(Barbaro) Cammino Primordiale',
        descEn: 'Choose a Primal Path (e.g. Path of the Berserker, Path of the Totem Warrior).',
        descIt: 'Scegli un Cammino Primordiale (es. Cammino del Berserker, Cammino del Guerriero Totemico).',
        isSubclassChoice: true,
        guidanceEn: 'Choose your Primal Path archetype',
        guidanceIt: 'Scegli l’archetipo del tuo Cammino Primordiale',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two ability scores by 1 (or choose a feat).',
        descIt: 'Aumenta una caratteristica di 2, oppure due caratteristiche di 1 (o scegli un talento).',
        isAsi: true,
        guidanceEn: 'Improve ability scores (+2 or +1/+1) or pick a feat',
        guidanceIt: 'Migliora le caratteristiche (+2 o +1/+1) oppure seleziona un talento',
      },
      {
        level: 5,
        nameEn: '(Barbarian) Extra Attack',
        nameIt: '(Barbaro) Attacco Extra',
        descEn: 'Attack twice instead of once whenever you take the Attack action on your turn.',
        descIt: 'Attacchi due volte anziché una ogni volta che effettui l’azione di Attacco nel tuo turno.',
      },
      {
        level: 5,
        nameEn: '(Barbarian) Fast Movement',
        nameIt: '(Barbaro) Movimento Veloce',
        descEn: 'Your speed increases by 10 ft. while you aren’t wearing heavy armor.',
        descIt: 'La tua velocità aumenta di 3m purché tu non indossi armature pesanti.',
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 9,
        nameEn: '(Barbarian) Brutal Critical (1 die)',
        nameIt: '(Barbaro) Critico Brutale (1 dado)',
        descEn: 'Roll one additional weapon damage die on critical melee hits.',
        descIt: 'Tiri un dado di danno dell’arma aggiuntivo quando metti a segno un colpo critico in mischia.',
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 20,
        nameEn: '(Barbarian) Primal Champion',
        nameIt: '(Barbaro) Campione Primordiale',
        descEn: 'Your Strength and Constitution scores increase by 4. Your maximum for those scores is now 24.',
        descIt: 'I tuoi punteggi di Forza e Costituzione aumentano di 4. Il massimale per questi punteggi diventa 24.',
      },
    ],
  },
  {
    id: 'bard',
    nameEn: 'Bard',
    nameIt: 'Bardo',
    hitDie: 8,
    primaryAbilities: ['cha', 'dex'],
    savingThrows: ['dex', 'cha'],
    skillChoices: [
      'acrobatics',
      'animal_handling',
      'arcana',
      'athletics',
      'deception',
      'history',
      'insight',
      'intimidation',
      'investigation',
      'medicine',
      'nature',
      'perception',
      'performance',
      'persuasion',
      'religion',
      'sleight_of_hand',
      'stealth',
      'survival',
    ],
    skillCount: 3,
    subclassLevel: 3,
    subclassLabelEn: 'Bard College',
    subclassLabelIt: 'Collegio Bardico',
    features: [
      {
        level: 1,
        nameEn: '(Bard) Spellcasting & Bardic Inspiration (d6)',
        nameIt: '(Bardo) Incantesimi & Ispirazione Bardica (d6)',
        descEn: 'Cast spells using Charisma. Inspire allies within 60 ft. with a bonus d6 die (CHA mod times per long rest).',
        descIt: 'Lancia incantesimi usando Carisma. Ispira alleati entro 18m con un dado d6 bonus (pari al mod CAR volte per riposo lungo).',
      },
      {
        level: 2,
        nameEn: '(Bard) Jack of All Trades & Song of Rest (d6)',
        nameIt: '(Bardo) Tuttofare & Canzone di Riposo (d6)',
        descEn: 'Add half your proficiency bonus (rounded down) to any ability check that doesn’t already include it. Allies heal extra 1d6 on short rest.',
        descIt: 'Aggiunge metà del bonus competenza (arrotondato per difetto) a qualsiasi prova di caratteristica che non lo includa già. Alleati guariscono 1d6 extra durante un riposo breve.',
      },
      {
        level: 3,
        nameEn: '(Bard) Bard College & Expertise',
        nameIt: '(Bardo) Collegio Bardico & Maestria',
        descEn: 'Choose a Bard College (Lore, Valor) and select 2 skills for Expertise (double PB).',
        descIt: 'Scegli un Collegio Bardico (Sapienza, Valore) e seleziona 2 abilità per la Maestria (doppio bonus competenza).',
        isSubclassChoice: true,
        guidanceEn: 'Select your Bard College and 2 skills for Expertise',
        guidanceIt: 'Seleziona il Collegio Bardico e 2 abilità per la Maestria',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 5,
        nameEn: '(Bard) Font of Inspiration & Inspiration (d8)',
        nameIt: '(Bardo) Fonte di Ispirazione & Ispirazione (d8)',
        descEn: 'Regain all uses of Bardic Inspiration when you finish a short or long rest. Inspiration die becomes d8.',
        descIt: 'Recuperi tutti gli usi di Ispirazione Bardica dopo un riposo breve o lungo. Il dado diventa un d8.',
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 10,
        nameEn: '(Bard) Magical Secrets & Expertise (2 additional)',
        nameIt: '(Bardo) Segreti Magici & Maestria (2 ulteriori)',
        descEn: 'Choose 2 spells from any class spell list, plus 2 more skills for Expertise.',
        descIt: 'Scegli 2 incantesimi da qualsiasi lista di classe e 2 ulteriori abilità per la Maestria.',
        guidanceEn: 'Choose 2 spells from any class list and 2 more Expertise skills',
        guidanceIt: 'Scegli 2 incantesimi da qualsiasi classe e 2 ulteriori abilità per la Maestria',
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
    ],
  },
  {
    id: 'cleric',
    nameEn: 'Cleric',
    nameIt: 'Chierico',
    hitDie: 8,
    primaryAbilities: ['wis', 'con'],
    savingThrows: ['wis', 'cha'],
    skillChoices: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    subclassLevel: 1,
    subclassLabelEn: 'Divine Domain',
    subclassLabelIt: 'Dominio Divino',
    features: [
      {
        level: 1,
        nameEn: '(Cleric) Spellcasting & Divine Domain',
        nameIt: '(Chierico) Incantesimi & Dominio Divino',
        descEn: 'Prepare divine spells each day using Wisdom. Gain domain spells and bonus proficiencies/features from chosen Divine Domain (e.g. Life, Light, War).',
        descIt: 'Prepara incantesimi divini ogni giorno usando Saggezza. Ottieni incantesimi di dominio e capacità speciali dal Dominio Divino scelto (es. Vita, Luce, Guerra).',
        isSubclassChoice: true,
        guidanceEn: 'Select your Divine Domain (Life, War, Light, etc.)',
        guidanceIt: 'Seleziona il tuo Dominio Divino (Vita, Guerra, Luce, ecc.)',
      },
      {
        level: 2,
        nameEn: '(Cleric) Channel Divinity: Turn Undead',
        nameIt: '(Chierico) Incanalare Divinità: Scacciare Non Morti',
        descEn: 'Present holy symbol to turn undead within 30 ft. (WIS save). Also gain a domain-specific Channel Divinity power.',
        descIt: 'Mostra il simbolo sacro per scacciare i non morti entro 9m (TS Saggezza). Ottieni anche un potere di dominio di Incanalare Divinità.',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 5,
        nameEn: '(Cleric) Destroy Undead (CR 1/2)',
        nameIt: '(Chierico) Distruggere Non Morti (GS 1/2)',
        descEn: 'When an undead fails its saving throw against Turn Undead, it is instantly destroyed if its CR is 1/2 or lower.',
        descIt: 'Quando un non morto fallisce il TS contro Scacciare Non Morti, viene distrutto istantaneamente se il suo GS è pari o inferiore a 1/2.',
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement & Destroy Undead (CR 1)',
        nameIt: 'Aumento dei Punteggi di Caratteristica & Distruggere Non Morti (GS 1)',
        descEn: 'Increase one ability score by 2, or two by 1. Destroy undead up to CR 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1. Distrugge non morti fino a GS 1.',
        isAsi: true,
      },
      {
        level: 10,
        nameEn: '(Cleric) Divine Intervention',
        nameIt: '(Chierico) Intervento Divino',
        descEn: 'Call on deity for assistance. Roll d100; if roll is equal to or lower than cleric level, deity intervenes.',
        descIt: 'Implori l’intervento della divinità. Tiri un d100; se il risultato è pari o inferiore al livello da chierico, la divinità interviene.',
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
    ],
  },
  {
    id: 'druid',
    nameEn: 'Druid',
    nameIt: 'Druido',
    hitDie: 8,
    primaryAbilities: ['wis', 'con'],
    savingThrows: ['int', 'wis'],
    skillChoices: ['arcana', 'animal_handling', 'insight', 'medicine', 'nature', 'perception', 'religion', 'survival'],
    skillCount: 2,
    subclassLevel: 2,
    subclassLabelEn: 'Druid Circle',
    subclassLabelIt: 'Circolo Druidico',
    features: [
      {
        level: 1,
        nameEn: '(Druid) Druidic & Spellcasting',
        nameIt: '(Druido) Druidico & Incantesimi',
        descEn: 'Speak secret Druidic language and cast primal spells using Wisdom.',
        descIt: 'Parla il linguaggio segreto dei druidi e lancia incantesimi primordiali con la Saggezza.',
      },
      {
        level: 2,
        nameEn: '(Druid) Wild Shape & Druid Circle',
        nameIt: '(Druido) Forma Selvatica & Circolo Druidico',
        descEn: 'Magically assume the shape of a beast you have seen (2 uses/rest). Choose Druid Circle (e.g. Circle of the Land, Moon).',
        descIt: 'Assume magicamente la forma di una bestia vista (2 usi/riposo). Scegli un Circolo Druidico (della Terra, della Luna).',
        isSubclassChoice: true,
        guidanceEn: 'Choose your Druid Circle archetype',
        guidanceIt: 'Scegli l’archetipo del tuo Circolo Druidico',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement & Wild Shape Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica & Forma Selvatica Migliorata',
        descEn: 'Increase one ability score by 2, or two by 1. Wild Shape CR increases to 1/2 (swimming speed allowed).',
        descIt: 'Aumenta una caratteristica di 2 o due di 1. Forma Selvatica fino a GS 1/2 con velocità di nuoto.',
        isAsi: true,
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement & Flying Wild Shape',
        nameIt: 'Aumento dei Punteggi di Caratteristica & Forma Volante',
        descEn: 'Increase one ability score by 2, or two by 1. Wild Shape CR 1 (flying speed allowed).',
        descIt: 'Aumenta una caratteristica di 2 o due di 1. Forma Selvatica fino a GS 1 con velocità di volo.',
        isAsi: true,
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 20,
        nameEn: '(Druid) Archdruid',
        nameIt: '(Druido) Arcidruido',
        descEn: 'Can use Wild Shape an unlimited number of times. Ignore verbal, somatic, and material components without cost.',
        descIt: 'Usi di Forma Selvatica illimitati. Ignora componenti verbali, somatiche e materiali senza costo.',
      },
    ],
  },
  {
    id: 'fighter',
    nameEn: 'Fighter',
    nameIt: 'Guerriero',
    hitDie: 10,
    primaryAbilities: ['str', 'dex'],
    savingThrows: ['str', 'con'],
    skillChoices: ['acrobatics', 'animal_handling', 'athletics', 'history', 'insight', 'intimidation', 'perception', 'survival'],
    skillCount: 2,
    subclassLevel: 3,
    subclassLabelEn: 'Martial Archetype',
    subclassLabelIt: 'Archetipo Marziale',
    features: [
      {
        level: 1,
        nameEn: '(Fighter) Fighting Style',
        nameIt: '(Guerriero) Stile di Combattimento',
        descEn: 'Adopt a specialty: Archery (+2 ranged attacks), Defense (+1 AC), Dueling (+2 damage with 1-handed weapon), Great Weapon Fighting, Protection, or Two-Weapon Fighting.',
        descIt: 'Scegli una specialità: Tiro (+2 attacchi a distanza), Difesa (+1 CA), Duellare (+2 danni arma a una mano), Combattere con Armi Grandi, Protezione o Combattere con Due Armi.',
        guidanceEn: 'Select your Fighting Style',
        guidanceIt: 'Seleziona il tuo Stile di Combattimento',
      },
      {
        level: 1,
        nameEn: '(Fighter) Second Wind',
        nameIt: '(Guerriero) Recuperare Energie',
        descEn: 'On your turn, use a bonus action to regain 1d10 + fighter level hit points (1/short or long rest).',
        descIt: 'Nel tuo turno, usa un’azione bonus per recuperare 1d10 + livello da guerriero punti ferita (1/riposo breve o lungo).',
      },
      {
        level: 2,
        nameEn: '(Fighter) Action Surge (1 use)',
        nameIt: '(Guerriero) Azione Impetuosa (1 uso)',
        descEn: 'Push yourself beyond limits: take one additional action on your turn (1/short or long rest).',
        descIt: 'Supera i tuoi limiti: effettua un’azione aggiuntiva nel tuo turno (1/riposo breve o lungo).',
      },
      {
        level: 3,
        nameEn: '(Fighter) Martial Archetype',
        nameIt: '(Guerriero) Archetipo Marziale',
        descEn: 'Choose a Martial Archetype: Champion (crit on 19-20), Battle Master (maneuvers), or Eldritch Knight (spells).',
        descIt: 'Scegli un Archetipo Marziale: Campione (critico con 19-20), Maestro della Battaglia (manovre) o Cavaliere Mistico (incantesimi).',
        isSubclassChoice: true,
        guidanceEn: 'Choose your Martial Archetype (Champion, Battle Master, etc.)',
        guidanceIt: 'Scegli il tuo Archetipo Marziale (Campione, Maestro della Battaglia, ecc.)',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 5,
        nameEn: '(Fighter) Extra Attack (1)',
        nameIt: '(Guerriero) Attacco Extra (1)',
        descEn: 'Attack twice instead of once whenever you take the Attack action on your turn.',
        descIt: 'Attacchi due volte anziché una ogni volta che effettui l’azione di Attacco nel tuo turno.',
      },
      {
        level: 6,
        nameEn: 'Ability Score Improvement (Fighter Bonus)',
        nameIt: 'Aumento dei Punteggi di Caratteristica (Bonus Guerriero)',
        descEn: 'Fighters gain an extra ASI at 6th level: +2 to one score or +1 to two scores.',
        descIt: 'I guerrieri ottengono un aumento caratteristica extra al 6° livello: +2 a un punteggio o +1 a due.',
        isAsi: true,
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 9,
        nameEn: '(Fighter) Indomitable (1 use)',
        nameIt: '(Guerriero) Indomito (1 uso)',
        descEn: 'Reroll a saving throw that you fail. Must use the new roll (1/long rest).',
        descIt: 'Ritira un tiro salvezza fallito. Devi usare il nuovo risultato (1/riposo lungo).',
      },
      {
        level: 11,
        nameEn: '(Fighter) Extra Attack (2)',
        nameIt: '(Guerriero) Attacco Extra (2)',
        descEn: 'Attack three times whenever you take the Attack action on your turn.',
        descIt: 'Attacchi tre volte ogni volta che effettui l’azione di Attacco nel tuo turno.',
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 14,
        nameEn: 'Ability Score Improvement (Fighter Bonus)',
        nameIt: 'Aumento dei Punteggi di Caratteristica (Bonus Guerriero)',
        descEn: 'Fighters gain an additional ASI at 14th level.',
        descIt: 'I guerrieri ottengono un ulteriore aumento caratteristica al 14° livello.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 20,
        nameEn: '(Fighter) Extra Attack (3)',
        nameIt: '(Guerriero) Attacco Extra (3)',
        descEn: 'Attack four times whenever you take the Attack action on your turn.',
        descIt: 'Attacchi quattro volte ogni volta che effettui l’azione di Attacco nel tuo turno.',
      },
    ],
  },
  {
    id: 'monk',
    nameEn: 'Monk',
    nameIt: 'Monaco',
    hitDie: 8,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    skillChoices: ['acrobatics', 'athletics', 'history', 'insight', 'religion', 'stealth'],
    skillCount: 2,
    subclassLevel: 3,
    subclassLabelEn: 'Monastic Tradition',
    subclassLabelIt: 'Tradizione Monastica',
    features: [
      {
        level: 1,
        nameEn: '(Monk) Unarmored Defense & Martial Arts',
        nameIt: '(Monaco) Difesa Senza Armatura & Arti Marziali',
        descEn: 'While wearing no armor and wielding no shield, AC equals 10 + DEX mod + WIS mod. Unarmed strikes deal 1d4 damage, can use DEX, and grant bonus unarmed strike on Attack action.',
        descIt: 'Senza armature o scudi, la CA è pari a 10 + mod DES + mod SAG. I colpi senz’armi infliggono 1d4 danni su DES e concedono un attacco bonus senz’armi.',
      },
      {
        level: 2,
        nameEn: '(Monk) Ki & Unarmored Movement (+10 ft.)',
        nameIt: '(Monaco) Ki & Movimento Senza Armatura (+3m)',
        descEn: 'Harness Ki points (Flurry of Blows, Patient Defense, Step of the Wind). Speed increases by 10 ft.',
        descIt: 'Canalizza punti Ki (Raffica di Colpi, Schivata Paziente, Passo del Vento). Velocità aumentata di 3m.',
      },
      {
        level: 3,
        nameEn: '(Monk) Monastic Tradition & Deflect Missiles',
        nameIt: '(Monaco) Tradizione Monastica & Deviare Dardi',
        descEn: 'Catch or deflect ranged weapons (reduce damage by 1d10 + DEX mod + monk level). Choose Monastic Tradition.',
        descIt: 'Afferra o devia armi a distanza (riduce i danni di 1d10 + mod DES + livello da monaco). Scegli la Tradizione Monastica.',
        isSubclassChoice: true,
        guidanceEn: 'Select Monastic Tradition (Open Hand, Shadow, etc.)',
        guidanceIt: 'Seleziona la Tradizione Monastica (Mano Aperta, Ombra, ecc.)',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement & Slow Fall',
        nameIt: 'Aumento dei Punteggi di Caratteristica & Caduta Lenta',
        descEn: 'Increase one ability score by 2, or two by 1. Reduce falling damage by 5 x monk level.',
        descIt: 'Aumenta una caratteristica di 2 o due di 1. Riduce i danni da caduta di 5 x livello da monaco.',
        isAsi: true,
      },
      {
        level: 5,
        nameEn: '(Monk) Extra Attack & Stunning Strike',
        nameIt: '(Monaco) Attacco Extra & Colpo Senz’Armi Stordente',
        descEn: 'Attack twice. Spend 1 Ki on melee hit to stun target until end of your next turn (CON save). Martial arts die becomes 1d6.',
        descIt: 'Attacchi due volte. Spendi 1 Ki per stordire il bersaglio fino alla fine del tuo prossimo turno (TS Costituzione). Dado arti marziali 1d6.',
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 14,
        nameEn: '(Monk) Diamond Soul',
        nameIt: '(Monaco) Anima di Diamante',
        descEn: 'Gain proficiency in all saving throws! Can spend 1 Ki to reroll a failed save.',
        descIt: 'Ottieni competenza in TUTTI i tiri salvezza! Puoi spendere 1 Ki per ritirare un TS fallito.',
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
    ],
  },
  {
    id: 'paladin',
    nameEn: 'Paladin',
    nameIt: 'Paladino',
    hitDie: 10,
    primaryAbilities: ['str', 'cha'],
    savingThrows: ['wis', 'cha'],
    skillChoices: ['athletics', 'insight', 'intimidation', 'medicine', 'persuasion', 'religion'],
    skillCount: 2,
    subclassLevel: 3,
    subclassLabelEn: 'Sacred Oath',
    subclassLabelIt: 'Giuramento Sacro',
    features: [
      {
        level: 1,
        nameEn: '(Paladin) Divine Sense & Lay on Hands',
        nameIt: '(Paladino) Senso del Divino & Imposizione delle Mani',
        descEn: 'Detect celestials, fiends, and undead within 60 ft. Healing pool of 5 x paladin level hit points.',
        descIt: 'Individua celestiali, immondi e non morti entro 18m. Riserva di cura pari a 5 x livello da paladino punti ferita.',
      },
      {
        level: 2,
        nameEn: '(Paladin) Fighting Style, Spellcasting & Divine Smite',
        nameIt: '(Paladino) Stile di Combattimento, Incantesimi & Punizione Divina',
        descEn: 'Expend spell slots on melee weapon hits to deal +2d8 radiant damage (+1d8 per slot level above 1st, +1d8 vs undead/fiends).',
        descIt: 'Spendi slot incantesimo per infliggere +2d8 danni radiosi su colpi in mischia (+1d8 per livello slot oltre il 1°, +1d8 contro non morti/immondi).',
      },
      {
        level: 3,
        nameEn: '(Paladin) Divine Health & Sacred Oath',
        nameIt: '(Paladino) Salute Divina & Giuramento Sacro',
        descEn: 'Immune to disease. Choose Sacred Oath (Devotion, Ancients, Vengeance).',
        descIt: 'Immunità alle malattie. Scegli un Giuramento Sacro (Devozione, Antichi, Vendetta).',
        isSubclassChoice: true,
        guidanceEn: 'Select your Sacred Oath (Devotion, Ancients, Vengeance, etc.)',
        guidanceIt: 'Seleziona il Giuramento Sacro (Devozione, Antichi, Vendetta, ecc.)',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 5,
        nameEn: '(Paladin) Extra Attack',
        nameIt: '(Paladino) Attacco Extra',
        descEn: 'Attack twice instead of once whenever you take the Attack action on your turn.',
        descIt: 'Attacchi due volte anziché una ogni volta che effettui l’azione di Attacco nel tuo turno.',
      },
      {
        level: 6,
        nameEn: '(Paladin) Aura of Protection',
        nameIt: '(Paladino) Aura di Protezione',
        descEn: 'You and friendly creatures within 10 ft. gain bonus to all saving throws equal to your Charisma modifier (minimum +1).',
        descIt: 'Tu e gli alleati entro 3m ottenete un bonus a tutti i tiri salvezza pari al tuo modificatore di Carisma (minimo +1).',
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 11,
        nameEn: '(Paladin) Improved Divine Smite',
        nameIt: '(Paladino) Punizione Divina Migliorata',
        descEn: 'All melee weapon strikes automatically deal an extra 1d8 radiant damage without expending a slot.',
        descIt: 'Tutti i tuoi attacchi in mischia infliggono automaticamente 1d8 danni radiosi extra senza consumare slot.',
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
    ],
  },
  {
    id: 'ranger',
    nameEn: 'Ranger',
    nameIt: 'Guerriero della Foresta / Ranger',
    hitDie: 10,
    primaryAbilities: ['dex', 'wis'],
    savingThrows: ['str', 'dex'],
    skillChoices: ['animal_handling', 'athletics', 'insight', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    skillCount: 3,
    subclassLevel: 3,
    subclassLabelEn: 'Ranger Archetype',
    subclassLabelIt: 'Archetipo da Ranger',
    features: [
      {
        level: 1,
        nameEn: '(Ranger) Favored Enemy & Natural Explorer',
        nameIt: '(Ranger) Nemico Prescelto & Esploratore Nato',
        descEn: 'Gain advantages against chosen creature type and expertise when traveling through chosen favored terrain.',
        descIt: 'Vantaggi nelle prove e tracciamento contro un tipo di creatura prescelta ed efficienza nel terreno favorito.',
      },
      {
        level: 2,
        nameEn: '(Ranger) Fighting Style & Spellcasting',
        nameIt: '(Ranger) Stile di Combattimento & Incantesimi',
        descEn: 'Choose Archery, Defense, Dueling, or Two-Weapon Fighting. Cast nature spells using Wisdom.',
        descIt: 'Scegli Tiro, Difesa, Duellare o Combattere con Due Armi. Lancia incantesimi naturali con Saggezza.',
      },
      {
        level: 3,
        nameEn: '(Ranger) Primeval Awareness & Ranger Archetype',
        nameIt: '(Ranger) Consapevolezza Primordiale & Archetipo',
        descEn: 'Sense creatures within 1 mile. Choose Ranger Archetype (Hunter, Beast Master).',
        descIt: 'Percepisce creature entro 1,5 km. Scegli un Archetipo da Ranger (Cacciatore, Signore delle Bestie).',
        isSubclassChoice: true,
        guidanceEn: 'Select Ranger Archetype (Hunter, Beast Master, etc.)',
        guidanceIt: 'Seleziona l’Archetipo da Ranger (Cacciatore, Signore delle Bestie, ecc.)',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 5,
        nameEn: '(Ranger) Extra Attack',
        nameIt: '(Ranger) Attacco Extra',
        descEn: 'Attack twice instead of once whenever you take the Attack action on your turn.',
        descIt: 'Attacchi due volte anziché una ogni volta che effettui l’azione di Attacco nel tuo turno.',
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement & Land’s Stride',
        nameIt: 'Aumento dei Punteggi di Caratteristica & Falcata delle Terre',
        descEn: 'Increase one ability score by 2, or two by 1. Move through nonmagical difficult terrain without penalty.',
        descIt: 'Aumenta una caratteristica di 2 o due di 1. Muoviti nel terreno difficile non magico senza penalità.',
        isAsi: true,
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
    ],
  },
  {
    id: 'rogue',
    nameEn: 'Rogue',
    nameIt: 'Ladro',
    hitDie: 8,
    primaryAbilities: ['dex', 'int'],
    savingThrows: ['dex', 'int'],
    skillChoices: [
      'acrobatics',
      'athletics',
      'deception',
      'insight',
      'intimidation',
      'investigation',
      'perception',
      'performance',
      'persuasion',
      'sleight_of_hand',
      'stealth',
    ],
    skillCount: 4,
    subclassLevel: 3,
    subclassLabelEn: 'Roguish Archetype',
    subclassLabelIt: 'Archetipo Ladresco',
    features: [
      {
        level: 1,
        nameEn: '(Rogue) Expertise (2 skills) & Sneak Attack (1d6)',
        nameIt: '(Ladro) Maestria (2 abilità) & Attacco Furtivo (1d6)',
        descEn: 'Double proficiency bonus for 2 chosen skills. Deal +1d6 damage once per turn to a creature you hit with advantage or if an ally is adjacent.',
        descIt: 'Raddoppia il bonus competenza per 2 abilità scelte. Infliggi +1d6 danni una volta a turno con vantaggio o se c’è un alleato adiacente.',
        guidanceEn: 'Select 2 skills for Expertise (double proficiency)',
        guidanceIt: 'Seleziona 2 abilità per la Maestria (doppia competenza)',
      },
      {
        level: 1,
        nameEn: '(Rogue) Thieves’ Cant',
        nameIt: '(Ladro) Gergo Ladresco',
        descEn: 'A secret mix of dialect, jargon, and code that allows hiding messages in normal conversation.',
        descIt: 'Un codice segreto di dialetto e gergo che permette di nascondere messaggi in conversazioni ordinarie.',
      },
      {
        level: 2,
        nameEn: '(Rogue) Cunning Action',
        nameIt: '(Ladro) Azione Astuta',
        descEn: 'Take a bonus action on each of your turns in combat to Dash, Disengage, or Hide.',
        descIt: 'Effettua un’azione bonus nel tuo turno per Scattare, Disimpegnarti o Nasconderti.',
      },
      {
        level: 3,
        nameEn: '(Rogue) Roguish Archetype & Sneak Attack (2d6)',
        nameIt: '(Ladro) Archetipo Ladresco & Attacco Furtivo (2d6)',
        descEn: 'Choose Roguish Archetype (Thief, Assassin, Arcane Trickster). Sneak Attack increases to 2d6.',
        descIt: 'Scegli l’Archetipo Ladresco (Furfante, Assassino, Mistificatore Arcano). Attacco Furtivo sale a 2d6.',
        isSubclassChoice: true,
        guidanceEn: 'Select Roguish Archetype (Thief, Assassin, etc.)',
        guidanceIt: 'Seleziona l’Archetipo Ladresco (Furfante, Assassino, ecc.)',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 5,
        nameEn: '(Rogue) Uncanny Dodge & Sneak Attack (3d6)',
        nameIt: '(Ladro) Schivata Prodigiosa & Attacco Furtivo (3d6)',
        descEn: 'When an attacker you can see hits you with an attack, use your reaction to halve the attack’s damage against you.',
        descIt: 'Quando un attaccante visibile ti colpisce, usa la reazione per dimezzare i danni dell’attacco.',
      },
      {
        level: 6,
        nameEn: '(Rogue) Expertise (2 additional skills)',
        nameIt: '(Ladro) Maestria (2 ulteriori abilità)',
        descEn: 'Choose two more of your skill proficiencies (or thieves’ tools) to gain Expertise.',
        descIt: 'Scegli altre due competenze nelle abilità (o strumenti da scasso) per ottenere Maestria.',
        guidanceEn: 'Select 2 more skills for Expertise',
        guidanceIt: 'Seleziona altre 2 abilità per la Maestria',
      },
      {
        level: 7,
        nameEn: '(Rogue) Evasion & Sneak Attack (4d6)',
        nameIt: '(Ladro) Elusione & Attacco Furtivo (4d6)',
        descEn: 'When subjected to an effect allowing DEX save for half damage, take 0 damage on success and half on failure.',
        descIt: 'Sugli effetti con TS Destrezza per dimezzare i danni, subisci 0 danni se superi il tiro e solo metà se fallisci.',
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 9,
        nameEn: '(Rogue) Sneak Attack (5d6)',
        nameIt: '(Ladro) Attacco Furtivo (5d6)',
        descEn: 'Sneak Attack increases to 5d6 damage.',
        descIt: 'I danni da Attacco Furtivo aumentano a 5d6.',
      },
      {
        level: 10,
        nameEn: 'Ability Score Improvement (Rogue Bonus)',
        nameIt: 'Aumento dei Punteggi di Caratteristica (Bonus Ladro)',
        descEn: 'Rogues gain an extra ASI at 10th level.',
        descIt: 'I ladri ottengono un aumento caratteristica bonus al 10° livello.',
        isAsi: true,
      },
      {
        level: 11,
        nameEn: '(Rogue) Reliable Talent & Sneak Attack (6d6)',
        nameIt: '(Ladro) Talento Affidabile & Attacco Furtivo (6d6)',
        descEn: 'Whenever you make an ability check that lets you add PB, treat any d20 roll of 9 or lower as a 10.',
        descIt: 'Nelle prove di caratteristica in cui aggiungi il bonus competenza, tratti qualsiasi tiro pari o inferiore a 9 come un 10.',
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 20,
        nameEn: '(Rogue) Stroke of Luck',
        nameIt: '(Ladro) Colpo di Fortuna',
        descEn: 'If your attack misses, turn it into a hit. Or treat a failed ability check as a 20 (1/short or long rest).',
        descIt: 'Se un attacco manca, trasformalo in un colpo a segno. Oppure tratta una prova fallita come un 20 (1/riposo breve o lungo).',
      },
    ],
  },
  {
    id: 'sorcerer',
    nameEn: 'Sorcerer',
    nameIt: 'Stregone',
    hitDie: 6,
    primaryAbilities: ['cha', 'con'],
    savingThrows: ['con', 'cha'],
    skillChoices: ['arcana', 'deception', 'insight', 'intimidation', 'persuasion', 'religion'],
    skillCount: 2,
    subclassLevel: 1,
    subclassLabelEn: 'Sorcerous Origin',
    subclassLabelIt: 'Origine Stregonesca',
    features: [
      {
        level: 1,
        nameEn: '(Sorcerer) Spellcasting & Sorcerous Origin',
        nameIt: '(Stregone) Incantesimi & Origine Stregonesca',
        descEn: 'Cast spells from innate magic using Charisma. Choose Origin (Draconic Bloodline, Wild Magic).',
        descIt: 'Lancia incantesimi innati con Carisma. Scegli l’Origine (Discendenza Draconica, Magia Selvaggia).',
        isSubclassChoice: true,
        guidanceEn: 'Select Sorcerous Origin (Draconic, Wild Magic, etc.)',
        guidanceIt: 'Seleziona l’Origine Stregonesca (Draconica, Magia Selvaggia, ecc.)',
      },
      {
        level: 2,
        nameEn: '(Sorcerer) Font of Magic (Sorcery Points)',
        nameIt: '(Stregone) Fonte di Magia (Punti Stregoneria)',
        descEn: 'Gain sorcery points equal to sorcerer level to create spell slots or fuel metamagic.',
        descIt: 'Ottieni punti stregoneria pari al tuo livello per creare slot o alimentare la metamagia.',
      },
      {
        level: 3,
        nameEn: '(Sorcerer) Metamagic (2 options)',
        nameIt: '(Stregone) Metamagia (2 opzioni)',
        descEn: 'Twist spells to suit your needs: Quickened Spell, Twinned Spell, Subtle Spell, Empowered Spell, etc.',
        descIt: 'Modifica gli incantesimi: Incantesimo Rapido, Raddoppiato, Celato, Potenziato, ecc.',
        guidanceEn: 'Choose 2 Metamagic options',
        guidanceIt: 'Scegli 2 opzioni di Metamagia',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
    ],
  },
  {
    id: 'warlock',
    nameEn: 'Warlock',
    nameIt: 'Warlock / Fattucchiere',
    hitDie: 8,
    primaryAbilities: ['cha', 'con'],
    savingThrows: ['wis', 'cha'],
    skillChoices: ['arcana', 'deception', 'history', 'intimidation', 'investigation', 'nature', 'religion'],
    skillCount: 2,
    subclassLevel: 1,
    subclassLabelEn: 'Otherworldly Patron',
    subclassLabelIt: 'Patrono Ultraterreno',
    features: [
      {
        level: 1,
        nameEn: '(Warlock) Otherworldly Patron & Pact Magic',
        nameIt: '(Warlock) Patrono Ultraterreno & Magia del Patto',
        descEn: 'Swear a pact with an entity (The Archfey, The Fiend, The Great Old One). Cast spells on short rests at maximum slot level.',
        descIt: 'Patto con un’entità (L’Arcifata, L’Immondo, Il Grande Antico). Gli slot si ricaricano a riposo breve al massimo livello.',
        isSubclassChoice: true,
        guidanceEn: 'Select Otherworldly Patron (Fiend, Archfey, Great Old One, etc.)',
        guidanceIt: 'Seleziona il Patrono Ultraterreno (Immondo, Arcifata, Grande Antico, ecc.)',
      },
      {
        level: 2,
        nameEn: '(Warlock) Eldritch Invocations (2 options)',
        nameIt: '(Warlock) Suppliche Occulte (2 opzioni)',
        descEn: 'Choose 2 Eldritch Invocations (e.g. Agonizing Blast, Armor of Shadows, Devil’s Sight, Eldritch Sight).',
        descIt: 'Scegli 2 Suppliche Occulte (es. Deflagrazione Agonizzante, Armatura delle Ombre, Vista del Diavolo).',
        guidanceEn: 'Select 2 Eldritch Invocations',
        guidanceIt: 'Seleziona 2 Suppliche Occulte',
      },
      {
        level: 3,
        nameEn: '(Warlock) Pact Boon',
        nameIt: '(Warlock) Dono del Patto',
        descEn: 'Choose Pact of the Chain (familiar), Pact of the Blade (weapon), or Pact of the Tome (book of rituals).',
        descIt: 'Scegli Patto della Catena (famiglio), Patto della Lama (arma) o Patto del Tomo (libro di rituali).',
        guidanceEn: 'Choose your Pact Boon (Chain, Blade, or Tome)',
        guidanceIt: 'Scegli il Dono del Patto (Catena, Lama o Tomo)',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 11,
        nameEn: '(Warlock) Mystic Arcanum (6th level)',
        nameIt: '(Warlock) Arcanum Mistico (6° livello)',
        descEn: 'Choose one 6th-level spell from warlock list as an arcanum (cast 1/long rest without expending slot).',
        descIt: 'Scegli un incantesimo di 6° livello da lanciare 1/riposo lungo senza consumare slot.',
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
    ],
  },
  {
    id: 'wizard',
    nameEn: 'Wizard',
    nameIt: 'Mago',
    hitDie: 6,
    primaryAbilities: ['int', 'con'],
    savingThrows: ['int', 'wis'],
    skillChoices: ['arcana', 'history', 'insight', 'investigation', 'medicine', 'religion'],
    skillCount: 2,
    subclassLevel: 2,
    subclassLabelEn: 'Arcane Tradition',
    subclassLabelIt: 'Tradizione Arcana',
    features: [
      {
        level: 1,
        nameEn: '(Wizard) Spellcasting & Arcane Recovery',
        nameIt: '(Mago) Incantesimi & Recupero Arcano',
        descEn: 'Record spells in your spellbook using Intelligence. Regain expended spell slots on a short rest equal to half wizard level (rounded up).',
        descIt: 'Trascrivi incantesimi nel grimorio con Intelligenza. Recupera slot a riposo breve pari a metà del livello da mago (per eccesso).',
      },
      {
        level: 2,
        nameEn: '(Wizard) Arcane Tradition',
        nameIt: '(Mago) Tradizione Arcana',
        descEn: 'Choose an Arcane Tradition school (Evocation, Abjuration, Divination, Necromancy, Illusion, Conjuration, Enchantment, Transmutation).',
        descIt: 'Scegli una Tradizione Arcana (Evocazione, Abiurazione, Divinazione, Necromanzia, Illusione, Invocazione, Ammaliamento, Trasmutazione).',
        isSubclassChoice: true,
        guidanceEn: 'Select your Arcane Tradition school',
        guidanceIt: 'Seleziona la tua scuola di Tradizione Arcana',
      },
      {
        level: 4,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 8,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 12,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 16,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 18,
        nameEn: '(Wizard) Spell Mastery',
        nameIt: '(Mago) Maestria negli Incantesimi',
        descEn: 'Choose a 1st-level and a 2nd-level wizard spell; you can cast them at their lowest level without expending a spell slot.',
        descIt: 'Scegli un incantesimo di 1° e uno di 2° livello: puoi lanciarli a volontà al livello base senza consumare slot.',
      },
      {
        level: 19,
        nameEn: 'Ability Score Improvement',
        nameIt: 'Aumento dei Punteggi di Caratteristica',
        descEn: 'Increase one ability score by 2, or two by 1.',
        descIt: 'Aumenta una caratteristica di 2, oppure due di 1.',
        isAsi: true,
      },
      {
        level: 20,
        nameEn: '(Wizard) Signature Spells',
        nameIt: '(Mago) Incantesimi Pregiati',
        descEn: 'Choose two 3rd-level spells as signature spells; cast each once per short or long rest without a slot.',
        descIt: 'Scegli due incantesimi di 3° livello come pregiati: puoi lanciare ciascuno 1/riposo breve o lungo senza slot.',
      },
    ],
  },
] as const;

// ============================================================================
// Helper & Parsing Functions
// ============================================================================

export function parsePgLevel(levelOrCr: string): number {
  if (!levelOrCr) return 1;
  const match = levelOrCr.match(/(\d+)/);
  if (!match) return 1;
  const num = parseInt(match[1], 10);
  if (isNaN(num)) return 1;
  return Math.max(1, Math.min(20, num));
}

export function formatPgLevel(level: number, lang: 'en' | 'it'): string {
  return lang === 'it' ? `Livello ${level}` : `Level ${level}`;
}

export function findStandardRace(raceQuery?: string): StandardRaceDef | undefined {
  if (!raceQuery) return undefined;
  const q = raceQuery.toLowerCase();
  return STANDARD_RACES.find(
    (r) =>
      r.id.toLowerCase() === q ||
      r.nameEn.toLowerCase().includes(q) ||
      r.nameIt.toLowerCase().includes(q) ||
      q.includes(r.id.toLowerCase()) ||
      q.includes(r.nameEn.toLowerCase()) ||
      q.includes(r.nameIt.toLowerCase())
  );
}

export function findStandardClass(classQuery?: string): StandardClassDef | undefined {
  if (!classQuery) return undefined;
  const q = classQuery.toLowerCase();
  return STANDARD_CLASSES.find(
    (c) =>
      c.id.toLowerCase() === q ||
      c.nameEn.toLowerCase().includes(q) ||
      c.nameIt.toLowerCase().includes(q) ||
      q.includes(c.id.toLowerCase()) ||
      q.includes(c.nameEn.toLowerCase()) ||
      q.includes(c.nameIt.toLowerCase())
  );
}

/**
 * Calculates standard D&D 5e HP bounds and average:
 * Level 1: HitDie + CON mod
 * Higher levels average: (HitDie / 2 + 1) + CON mod per level
 * Minimum per level: 1 (or max(1, 1 + CON mod))
 * Maximum per level: HitDie + CON mod
 */
export function calculateExpectedHp(
  hitDie: number,
  level: number,
  conScore: number
): { avg: number; min: number; max: number } {
  const conMod = getModValue(conScore);
  const lv1Hp = Math.max(1, hitDie + conMod);
  if (level <= 1) {
    return { avg: lv1Hp, min: lv1Hp, max: lv1Hp };
  }
  const avgPerLevel = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  const minPerLevel = Math.max(1, 1 + conMod);
  const maxPerLevel = Math.max(1, hitDie + conMod);

  const avg = lv1Hp + (level - 1) * avgPerLevel;
  const min = lv1Hp + (level - 1) * minPerLevel;
  const max = lv1Hp + (level - 1) * maxPerLevel;

  return { avg, min, max };
}

export function calculateStandardHitDiceFormula(level: number, hitDie: number, conScore: number): string {
  const conMod = getModValue(conScore);
  const totalMod = conMod * level;
  if (totalMod > 0) return `${level}d${hitDie} + ${totalMod}`;
  if (totalMod < 0) return `${level}d${hitDie} - ${Math.abs(totalMod)}`;
  return `${level}d${hitDie}`;
}

// ============================================================================
// Validation & Non-Blocking Supervision Engine
// ============================================================================

export interface ValidationAdvisory {
  id: string;
  field: string;
  titleEn: string;
  titleIt: string;
  messageEn: string;
  messageIt: string;
  expectedValue?: string;
  currentValue?: string;
  severity: 'warning' | 'info';
  autoFix?: (char: CharacterEntity) => CharacterEntity;
}

export interface ValidationReport {
  isStandard5e: boolean;
  standardRace?: StandardRaceDef;
  standardClass?: StandardClassDef;
  level: number;
  advisories: ValidationAdvisory[];
}

export function validatePgCombination(
  char: CharacterEntity,
  _lang: 'en' | 'it' = 'en'
): ValidationReport {
  const advisories: ValidationAdvisory[] = [];

  // 1. Level check
  const level = parsePgLevel(char.levelOrCr);
  if (level < 1 || level > 20) {
    advisories.push({
      id: 'level_out_of_bounds',
      field: 'levelOrCr',
      severity: 'warning',
      titleEn: 'Level Out of Standard 5e Range',
      titleIt: 'Livello Fuori dai Limiti Standard 5e',
      messageEn: `Standard D&D 5e player levels range from 1 to 20. Current level is ${level}.`,
      messageIt: `I livelli standard di D&D 5e vanno da 1 a 20. Il livello attuale è ${level}.`,
      currentValue: `${level}`,
      expectedValue: '1–20',
      autoFix: (c) => ({
        ...c,
        levelOrCr: formatPgLevel(Math.max(1, Math.min(20, level)), _lang),
      }),
    });
  }

  // 2. Race recognition
  const race = findStandardRace(char.creatureType);
  const cls = findStandardClass(char.classOrArchetype);

  // 3. Hit Die & Max HP check (if class is known)
  if (cls) {
    const expected = calculateExpectedHp(cls.hitDie, level, char.abilities.con);
    // Allow broad buffer: if HP is below min or above max by more than 10%, warn
    if (char.hpMax < expected.min || char.hpMax > expected.max) {
      advisories.push({
        id: 'hp_divergence',
        field: 'hpMax',
        severity: 'warning',
        titleEn: 'HP Differs from Class Range',
        titleIt: 'PF Differenti dal Range di Classe',
        messageEn: `For a Lv ${level} ${cls.nameEn} (d${cls.hitDie}) with CON ${char.abilities.con} (${getModValue(char.abilities.con) >= 0 ? '+' : ''}${getModValue(char.abilities.con)}), standard average HP is ${expected.avg} (range ${expected.min}–${expected.max}). Current HP is ${char.hpMax}.`,
        messageIt: `Per un ${cls.nameIt} di Livello ${level} (d${cls.hitDie}) con COS ${char.abilities.con} (${getModValue(char.abilities.con) >= 0 ? '+' : ''}${getModValue(char.abilities.con)}), la media standard è ${expected.avg} PF (range ${expected.min}–${expected.max}). I PF attuali sono ${char.hpMax}.`,
        currentValue: `${char.hpMax}`,
        expectedValue: `${expected.avg} (range ${expected.min}–${expected.max})`,
        autoFix: (c) => ({ ...c, hpMax: expected.avg }),
      });
    }

    // Check hit dice formula
    const expectedFormula = calculateStandardHitDiceFormula(level, cls.hitDie, char.abilities.con);
    const formulaMatch = (char.hitDiceFormula || '').replace(/\s+/g, '').toLowerCase();
    const expectedMatch = expectedFormula.replace(/\s+/g, '').toLowerCase();
    if (formulaMatch !== expectedMatch && !formulaMatch.includes(`d${cls.hitDie}`)) {
      advisories.push({
        id: 'hit_dice_formula',
        field: 'hitDiceFormula',
        severity: 'warning',
        titleEn: 'Unexpected Hit Dice Formula',
        titleIt: 'Formula Dadi Vita Non Conforme',
        messageEn: `Expected hit dice for a Lv ${level} ${cls.nameEn} is "${expectedFormula}". Current is "${char.hitDiceFormula}".`,
        messageIt: `I dadi vita previsti per un ${cls.nameIt} di Livello ${level} sono "${expectedFormula}". Attuale: "${char.hitDiceFormula}".`,
        currentValue: char.hitDiceFormula,
        expectedValue: expectedFormula,
        autoFix: (c) => ({ ...c, hitDiceFormula: expectedFormula }),
      });
    }

    // Check saving throws
    const resolvedSaves = resolveSavingThrowProficiencies(char);
    const [saveA, saveB] = cls.savingThrows;
    const missingStandardSave = !resolvedSaves[saveA] || !resolvedSaves[saveB];
    if (missingStandardSave) {
      const expectedSavesNamesEn = `${saveA.toUpperCase()} and ${saveB.toUpperCase()}`;
      const expectedSavesNamesIt = `${DND_ABILITY_META.find((a) => a.key === saveA)?.shortIt} e ${DND_ABILITY_META.find((a) => a.key === saveB)?.shortIt}`;
      advisories.push({
        id: 'saving_throw_divergence',
        field: 'savingThrowProficiencies',
        severity: 'info',
        titleEn: 'Saving Throw Proficiency Divergence',
        titleIt: 'Divergenza Tiri Salvezza Standard',
        messageEn: `Standard ${cls.nameEn} saving throws are ${expectedSavesNamesEn}. You can keep custom saves or align with standard.`,
        messageIt: `I tiri salvezza standard per ${cls.nameIt} sono ${expectedSavesNamesIt}. Puoi mantenere tiri personalizzati o allinearti allo standard.`,
        autoFix: (c) => ({
          ...c,
          savingThrowProficiencies: {
            ...resolveSavingThrowProficiencies(c),
            [saveA]: true,
            [saveB]: true,
          },
        }),
      });
    }
  }

  // 4. Proficiency Bonus Check
  const expectedPb = getProficiencyBonus({ levelOrCr: char.levelOrCr });
  if (typeof char.proficiencyBonus === 'number' && char.proficiencyBonus !== expectedPb) {
    advisories.push({
      id: 'proficiency_bonus_override',
      field: 'proficiencyBonus',
      severity: 'info',
      titleEn: 'Custom Proficiency Bonus Override',
      titleIt: 'Override Personalizzato Bonus Competenza',
      messageEn: `Standard Proficiency Bonus for Level ${level} is +${expectedPb}. Sheet currently overrides it to +${char.proficiencyBonus}.`,
      messageIt: `Il Bonus di Competenza standard per il Livello ${level} è +${expectedPb}. La scheda attualmente usa +${char.proficiencyBonus}.`,
      currentValue: `+${char.proficiencyBonus}`,
      expectedValue: `+${expectedPb}`,
      autoFix: (c) => ({ ...c, proficiencyBonus: undefined }),
    });
  }

  // 5. Ability scores bounds sanity
  for (const ab of DND_ABILITY_META) {
    const score = char.abilities[ab.key];
    if (score < 3 || score > 20) {
      advisories.push({
        id: `ability_${ab.key}_extreme`,
        field: `abilities.${ab.key}`,
        severity: 'info',
        titleEn: `Atypical Ability Score: ${ab.shortEn} (${score})`,
        titleIt: `Punteggio Caratteristica Atipico: ${ab.shortIt} (${score})`,
        messageEn: `Standard 5e PC abilities typically range between 3 and 20. Current ${ab.fullEn} is ${score}.`,
        messageIt: `I punteggi di caratteristica standard di D&D 5e sono tipicamente tra 3 e 20. Valore attuale per ${ab.fullIt}: ${score}.`,
        currentValue: `${score}`,
        expectedValue: '3–20',
      });
    }
  }

  return {
    isStandard5e: Boolean(race && cls),
    standardRace: race,
    standardClass: cls,
    level,
    advisories,
  };
}

// ============================================================================
// Auto-Populate & Apply Standard Template
// ============================================================================

export function applyStandardTemplate(
  baseChar: CharacterEntity,
  options: {
    raceDef?: StandardRaceDef;
    classDef?: StandardClassDef;
    level?: number;
    lang: 'en' | 'it';
  }
): CharacterEntity {
  const { raceDef, classDef, level = 1, lang } = options;
  let char = structuredClone(baseChar);

  // Apply Race attributes if standard
  if (raceDef) {
    char.creatureType = lang === 'it' ? `Umanoide (${raceDef.nameIt})` : `Humanoid (${raceDef.nameEn})`;
    char.size = lang === 'it' ? raceDef.size : raceDef.size;
    char.speed = raceDef.speed;
    char.senses = lang === 'it' ? raceDef.sensesIt : raceDef.sensesEn;
    char.languages = lang === 'it' ? raceDef.languagesIt : raceDef.languagesEn;

    // Add racial traits with "(Race) Trait" tagging, avoiding duplicates
    const existingTraitNames = new Set(char.traits.map((t) => t.name.toLowerCase()));
    for (const t of raceDef.traits) {
      const traitName = lang === 'it' ? t.nameIt : t.nameEn;
      const traitDesc = lang === 'it' ? t.descIt : t.descEn;
      if (!existingTraitNames.has(traitName.toLowerCase())) {
        char.traits.push({ name: traitName, description: traitDesc });
      }
    }

    // Default racial skills (e.g. Elf Perception)
    if (raceDef.defaultSkillProficiencies && raceDef.defaultSkillProficiencies.length > 0) {
      const curSkills = resolveSkillProficiencies(char);
      for (const sk of raceDef.defaultSkillProficiencies) {
        if (!curSkills[sk]) curSkills[sk] = 1;
      }
      char.skillProficiencies = curSkills;
    }
  }

  // Apply Class attributes if standard
  if (classDef) {
    char.classOrArchetype = lang === 'it' ? classDef.nameIt : classDef.nameEn;
    char.levelOrCr = formatPgLevel(level, lang);

    // Saving throws
    const saves = resolveSavingThrowProficiencies(char);
    saves[classDef.savingThrows[0]] = true;
    saves[classDef.savingThrows[1]] = true;
    char.savingThrowProficiencies = saves;

    // Hit dice & HP
    const expected = calculateExpectedHp(classDef.hitDie, level, char.abilities.con);
    char.hpMax = expected.avg;
    char.hitDiceFormula = calculateStandardHitDiceFormula(level, classDef.hitDie, char.abilities.con);

    // Add class features up to current level with "(Class) Feature" tagging
    const existingTraitNames = new Set(char.traits.map((t) => t.name.toLowerCase()));
    const unlockedFeatures = classDef.features.filter((f) => f.level <= level);
    for (const feat of unlockedFeatures) {
      const featName = lang === 'it' ? feat.nameIt : feat.nameEn;
      const featDesc = lang === 'it' ? feat.descIt : feat.descEn;
      if (!existingTraitNames.has(featName.toLowerCase())) {
        char.traits.push({ name: featName, description: featDesc });
      }
    }
  }

  return char;
}

// ============================================================================
// Level-Up Calculation Engine
// ============================================================================

export interface LevelUpChecklistItem {
  id: string;
  level: number;
  type: 'asi' | 'subclass' | 'proficiency_bonus' | 'feature' | 'expertise' | 'spells';
  titleEn: string;
  titleIt: string;
  descEn: string;
  descIt: string;
  requiresMasterOrPlayerChoice: boolean;
}

export interface LevelUpPlan {
  currentLevel: number;
  targetLevel: number;
  classDef?: StandardClassDef;
  hpDeltaAverage: number;
  hpDeltaMax: number;
  hitDie: number;
  conMod: number;
  currentHpMax: number;
  newHpMaxAverage: number;
  newHitDiceFormula: string;
  currentPb: number;
  newPb: number;
  pbIncreased: boolean;
  newFeatures: StatblockEntry[];
  checklist: LevelUpChecklistItem[];
}

export function calculateLevelUpPlan(
  char: CharacterEntity,
  targetLevel: number,
  lang: 'en' | 'it'
): LevelUpPlan {
  const currentLevel = parsePgLevel(char.levelOrCr);
  const clampedTarget = Math.max(1, Math.min(20, targetLevel));
  const classDef = findStandardClass(char.classOrArchetype);
  const hitDie = classDef ? classDef.hitDie : 8; // fallback to d8 if custom class
  const conMod = getModValue(char.abilities.con);

  const levelsGained = Math.max(0, clampedTarget - currentLevel);

  // HP calculations
  const avgPerLevel = Math.max(1, Math.floor(hitDie / 2) + 1 + conMod);
  const maxPerLevel = Math.max(1, hitDie + conMod);
  const hpDeltaAverage = levelsGained * avgPerLevel;
  const hpDeltaMax = levelsGained * maxPerLevel;
  const newHpMaxAverage = char.hpMax + hpDeltaAverage;
  const newHitDiceFormula = calculateStandardHitDiceFormula(clampedTarget, hitDie, char.abilities.con);

  // Proficiency Bonus
  const currentPb = getProficiencyBonus({ levelOrCr: char.levelOrCr });
  const newPb = getProficiencyBonus({ levelOrCr: formatPgLevel(clampedTarget, lang) });
  const pbIncreased = newPb > currentPb;

  // Features unlocked between currentLevel + 1 and clampedTarget
  const newFeatures: StatblockEntry[] = [];
  const checklist: LevelUpChecklistItem[] = [];

  if (pbIncreased) {
    checklist.push({
      id: `pb_increase_${newPb}`,
      level: clampedTarget,
      type: 'proficiency_bonus',
      titleEn: `Proficiency Bonus Increased to +${newPb}`,
      titleIt: `Bonus di Competenza Aumentato a +${newPb}`,
      descEn: `All your proficient skills, saving throws, spell DC, and attack bonuses will automatically scale from +${currentPb} to +${newPb}.`,
      descIt: `Tutte le tue abilità con competenza, tiri salvezza, CD incantesimi e attacchi scaleranno automaticamente da +${currentPb} a +${newPb}.`,
      requiresMasterOrPlayerChoice: false,
    });
  }

  if (classDef) {
    const featuresBetween = classDef.features.filter(
      (f) => f.level > currentLevel && f.level <= clampedTarget
    );

    for (const feat of featuresBetween) {
      const name = lang === 'it' ? feat.nameIt : feat.nameEn;
      const desc = lang === 'it' ? feat.descIt : feat.descEn;
      newFeatures.push({ name, description: desc });

      if (feat.isAsi) {
        checklist.push({
          id: `asi_lv${feat.level}`,
          level: feat.level,
          type: 'asi',
          titleEn: `Level ${feat.level}: Ability Score Improvement (ASI) or Feat`,
          titleIt: `Livello ${feat.level}: Aumento Caratteristica (ASI) o Talento`,
          descEn: 'Choose: increase one ability score by 2, or two ability scores by 1 (or take an optional Feat with DM approval).',
          descIt: 'Scegli: aumenta una caratteristica di 2, oppure due caratteristiche di 1 (o scegli un Talento con l’approvazione del DM).',
          requiresMasterOrPlayerChoice: true,
        });
      } else if (feat.isSubclassChoice) {
        checklist.push({
          id: `subclass_lv${feat.level}`,
          level: feat.level,
          type: 'subclass',
          titleEn: `Level ${feat.level}: Choose ${classDef.subclassLabelEn}`,
          titleIt: `Livello ${feat.level}: Scegli ${classDef.subclassLabelIt}`,
          descEn: feat.guidanceEn || `Select your archetype for ${classDef.nameEn}.`,
          descIt: feat.guidanceIt || `Seleziona il tuo archetipo per ${classDef.nameIt}.`,
          requiresMasterOrPlayerChoice: true,
        });
      } else if (feat.guidanceEn) {
        checklist.push({
          id: `feature_choice_lv${feat.level}`,
          level: feat.level,
          type: 'feature',
          titleEn: `Level ${feat.level}: ${name}`,
          titleIt: `Livello ${feat.level}: ${name}`,
          descEn: feat.guidanceEn,
          descIt: feat.guidanceIt || feat.guidanceEn,
          requiresMasterOrPlayerChoice: true,
        });
      }
    }
  }

  return {
    currentLevel,
    targetLevel: clampedTarget,
    classDef,
    hpDeltaAverage,
    hpDeltaMax,
    hitDie,
    conMod,
    currentHpMax: char.hpMax,
    newHpMaxAverage,
    newHitDiceFormula,
    currentPb,
    newPb,
    pbIncreased,
    newFeatures,
    checklist,
  };
}
