import { DndDatabase } from '../types/dnd';

export const SEED_DATABASE_EN: DndDatabase = {
  version: 1,
  lastSavedAt: new Date().toISOString(),
  campaigns: [
    {
      id: 'camp-valle-bruma',
      title: 'Chronicles of Mistvale',
      setting: 'Forgotten Realms — Northern Frontier',
      description:
        'A dark-fantasy investigative and heroic campaign where ancient necromantic relics awaken beneath the northern fiefdoms.',
      status: 'Active',
      createdAt: '2026-10-01T18:00:00.000Z',
    },
  ],
  characters: [
    // ================= PCs (PLAYERS) =================
    {
      id: 'pc-tharion',
      kind: 'pc',
      name: 'Tharion Vael',
      playerOrRole: 'Player: Mark',
      size: 'Medium',
      creatureType: 'Humanoid (Half-Elf)',
      alignment: 'Chaotic Good',
      classOrArchetype: 'Paladin (Oath of the Ancients)',
      levelOrCr: 'Level 4',
      ac: 18,
      acNote: '(Chain mail, shield)',
      hpMax: 38,
      hitDiceFormula: '4d10 + 8',
      speed: '30 ft.',
      initiativeBonus: 1,
      passivePerception: 13,
      abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 16 },
      savingThrows: 'WIS +3, CHA +5',
      skills: 'Athletics +5, Intimidation +5, Persuasion +5, Perception +3',
      senses: 'Darkvision 60 ft.',
      languages: 'Common, Elvish, Sylvan',
      traits: [
        {
          name: 'Divine Sense & Lay on Hands (20 HP)',
          description:
            'Detects celestials, fiends, or undead within 60 ft. Healing pool of 20 hit points per long rest.',
        },
        {
          name: 'Divine Smite',
          description:
            'When hitting with a melee weapon attack, can expend a spell slot to deal 2d8 extra radiant damage (+1d8 against undead).',
        },
      ],
      actions: [
        {
          name: 'Silvered Longsword',
          description:
            'Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 1d8 + 3 slashing damage.',
          attackBonus: 5,
          damageFormula: '1d8+3',
        },
        {
          name: 'Channel Divinity: Nature’s Wrath',
          description:
            'Spectral vines restrain a creature within 10 ft. (STR/DEX save DC 13).',
        },
      ],
      spellsNotes:
        'Prepared spells (DC 13, +5 to hit): Bless, Cure Wounds, Misty Step, Branding Smite.',
      biographyOrLore:
        'Former knight-errant of Silverymoon wearing a broken medallion that belonged to his vanished mentor.',
      tags: ['Tank', 'Off-Healer', 'Party A', 'Party B'],
      accentColor: '#d97706',
    },
    {
      id: 'pc-lyra',
      kind: 'pc',
      name: 'Lyra Noctis',
      playerOrRole: 'Player: Helen',
      size: 'Medium',
      creatureType: 'Humanoid (Tiefling)',
      alignment: 'Neutral',
      classOrArchetype: 'Wizard (School of Evocation)',
      levelOrCr: 'Level 4',
      ac: 15,
      acNote: '(Mage Armor)',
      hpMax: 26,
      hitDiceFormula: '4d6 + 8',
      speed: '30 ft.',
      initiativeBonus: 2,
      passivePerception: 14,
      abilities: { str: 8, dex: 14, con: 14, int: 18, wis: 13, cha: 12 },
      savingThrows: 'INT +6, WIS +3',
      skills: 'Arcana +6, Investigation +6, History +6, Perception +3',
      damageResistances: 'Fire',
      senses: 'Darkvision 60 ft.',
      languages: 'Common, Infernal, Draconic, Dwarvish',
      traits: [
        {
          name: 'Sculpt Spells',
          description:
            'Can create pockets of safety within area evocation spells: up to 1 + spell level allies automatically succeed on their saving throw and take no damage.',
        },
      ],
      actions: [
        {
          name: 'Fire Bolt',
          description:
            'Ranged Spell Attack: +6 to hit, range 120 ft. Hit: 1d10 fire damage.',
          attackBonus: 6,
          damageFormula: '1d10',
        },
        {
          name: 'Scorching Ray / Magic Missile',
          description:
            '3 rays dealing 2d6 fire each (+6 to hit) or 3 automatic darts dealing 1d4+1 force each.',
          attackBonus: 6,
          damageFormula: '2d6',
        },
      ],
      spellsNotes:
        'Spell Save DC 14, Spell Attack +6. Slots: 4× 1st-level, 3× 2nd-level (Shield, Detect Magic, Shatter, Misty Step).',
      biographyOrLore:
        'Scholar of pre-cataclysm inscriptions searching for Archmage Vaelor’s lost journal.',
      tags: ['Arcane Caster', 'AoE', 'Lore', 'Party A'],
      accentColor: '#7c3aed',
    },
    {
      id: 'pc-kaelen',
      kind: 'pc',
      name: 'Kaelen "Swiftshadow"',
      playerOrRole: 'Player: Luke',
      size: 'Medium',
      creatureType: 'Humanoid (Wood Elf)',
      alignment: 'Chaotic Neutral',
      classOrArchetype: 'Rogue (Assassin)',
      levelOrCr: 'Level 4',
      ac: 16,
      acNote: '(Studded leather)',
      hpMax: 29,
      hitDiceFormula: '4d8 + 4',
      speed: '35 ft.',
      initiativeBonus: 4,
      passivePerception: 17,
      abilities: { str: 10, dex: 18, con: 12, int: 13, wis: 14, cha: 10 },
      savingThrows: 'DEX +6, INT +3',
      skills: 'Stealth +8, Perception +6, Sleight of Hand +8, Acrobatics +6, Deception +4',
      senses: 'Darkvision 60 ft.',
      languages: 'Common, Elvish, Thieves’ Cant',
      traits: [
        {
          name: 'Sneak Attack (2d6)',
          description:
            'Once per turn deals +2d6 extra damage when attacking with advantage or when an ally is within 5 ft. of the target.',
        },
        {
          name: 'Cunning Action & Assassinate',
          description:
            'Dash, Disengage, or Hide as a bonus action. Advantage on attack rolls against any creature that hasn’t taken a turn in the combat yet.',
        },
      ],
      actions: [
        {
          name: 'Masterwork Rapier',
          description:
            'Melee Weapon Attack: +6 to hit, reach 5 ft. Hit: 1d8 + 4 piercing damage (+2d6 sneak attack).',
          attackBonus: 6,
          damageFormula: '1d8+4',
        },
        {
          name: 'Shortbow',
          description:
            'Ranged Weapon Attack: +6 to hit, range 80/320 ft. Hit: 1d6 + 4 piercing damage.',
          attackBonus: 6,
          damageFormula: '1d6+4',
        },
      ],
      biographyOrLore:
        'Unerring scout and lockpicker who knows every smuggler tunnel in the northern marches.',
      tags: ['Scout', 'Single-Target DPS', 'Traps', 'Party A', 'Party B'],
      accentColor: '#059669',
    },
    {
      id: 'pc-brynja',
      kind: 'pc',
      name: 'Brynja Silverhammer',
      playerOrRole: 'Player: Sarah',
      size: 'Medium',
      creatureType: 'Humanoid (Hill Dwarf)',
      alignment: 'Lawful Good',
      classOrArchetype: 'Cleric (Light Domain)',
      levelOrCr: 'Level 4',
      ac: 18,
      acNote: '(Scale mail, shield with holy symbol)',
      hpMax: 35,
      hitDiceFormula: '4d8 + 12',
      speed: '25 ft.',
      initiativeBonus: 0,
      passivePerception: 16,
      abilities: { str: 14, dex: 10, con: 16, int: 11, wis: 18, cha: 12 },
      savingThrows: 'WIS +6, CHA +3',
      skills: 'Medicine +6, Insight +6, Religion +4',
      damageResistances: 'Poison',
      senses: 'Darkvision 60 ft.',
      languages: 'Common, Dwarvish, Celestial',
      traits: [
        {
          name: 'Channel Divinity: Radiance of the Dawn',
          description:
            'Dispels magical darkness within 30 ft.; hostile creatures take 2d10 + 4 radiant damage (CON save DC 14 halves).',
        },
        {
          name: 'Warding Flare (Reaction)',
          description:
            'Imposes disadvantage on the attack roll of an attacker within 30 ft. that she can see.',
        },
      ],
      actions: [
        {
          name: 'Consecrated Warhammer',
          description:
            'Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d8 + 2 bludgeoning damage.',
          attackBonus: 4,
          damageFormula: '1d8+2',
        },
        {
          name: 'Sacred Flame',
          description:
            'DEX save DC 14 or target takes 1d8 radiant damage (ignores cover).',
          damageFormula: '1d8',
        },
      ],
      spellsNotes:
        'DC 14, +6 spell attack. Healing Word, Bless, Spiritual Weapon, Scorching Ray, Spirit Guardians (scroll).',
      biographyOrLore:
        'Keeper of the Everlasting Flame, determined to cleanse the Whispering Crypt.',
      tags: ['Healer', 'Support', 'Anti-Undead', 'Party B'],
      accentColor: '#eab308',
    },

    // ================= NPCs =================
    {
      id: 'npc-garrick',
      kind: 'npc',
      name: 'Bramante Garrick',
      playerOrRole: 'NPC — Innkeeper & Informant ("The Black Stag")',
      size: 'Medium',
      creatureType: 'Humanoid (Human)',
      alignment: 'Neutral Good',
      levelOrCr: 'CR 1/2 (100 XP)',
      ac: 12,
      acNote: '(Leather jerkin under apron)',
      hpMax: 22,
      hitDiceFormula: '4d8 + 4',
      speed: '30 ft.',
      initiativeBonus: 1,
      passivePerception: 14,
      abilities: { str: 13, dex: 12, con: 12, int: 11, wis: 14, cha: 15 },
      skills: 'Insight +4, Persuasion +4, Local History +2',
      languages: 'Common, Dwarvish',
      traits: [
        {
          name: 'Family Secret',
          description:
            'Garrick holds the wrought-iron key to the old family chapel and knows the cellar collapse leads into the catacombs.',
        },
      ],
      actions: [
        {
          name: 'Heavy Crossbow Under the Counter',
          description:
            'Ranged Weapon Attack: +3 to hit, range 100/400 ft. Hit: 1d10 + 1 piercing damage.',
          attackBonus: 3,
          damageFormula: '1d10+1',
        },
      ],
      biographyOrLore:
        'A veteran with a scar over his left eyebrow. He speaks in hushed tones around strangers and knocks twice on wood for luck.',
      tags: ['Quest Giver', 'Tavern', 'Ally'],
      accentColor: '#b45309',
    },
    {
      id: 'npc-elira',
      kind: 'npc',
      name: 'Sister Elira',
      playerOrRole: 'NPC — Last Keeper of the Sanctuary',
      size: 'Medium',
      creatureType: 'Humanoid (Half-Elf)',
      alignment: 'Lawful Good',
      levelOrCr: 'CR 2 (450 XP)',
      ac: 13,
      hpMax: 27,
      hitDiceFormula: '5d8 + 5',
      speed: '30 ft.',
      initiativeBonus: 0,
      passivePerception: 15,
      abilities: { str: 10, dex: 10, con: 12, int: 13, wis: 16, cha: 14 },
      skills: 'Medicine +7, Religion +5, Insight +5',
      languages: 'Common, Elvish, Celestial',
      traits: [
        {
          name: 'Sanctuary Blessing',
          description:
            'Once per session can bless the party’s weapons, granting +1d4 radiant damage for 1 hour.',
        },
      ],
      actions: [
        {
          name: 'Quarterstaff',
          description: 'Melee Weapon Attack: +2 to hit, 1d6 bludgeoning damage.',
          attackBonus: 2,
          damageFormula: '1d6',
        },
      ],
      biographyOrLore:
        'Found wounded near the outer altar; knows the ritual required to extinguish the necromantic brazier.',
      tags: ['Sanctuary', 'Healer', 'Lore'],
      accentColor: '#0284c7',
    },

    // ================= MONSTERS & BOSSES =================
    {
      id: 'mon-skeleton-guard',
      kind: 'monster',
      name: 'Crypt Skeleton Guard',
      playerOrRole: 'Minor Undead — Patrol',
      size: 'Medium',
      creatureType: 'Undead',
      alignment: 'Lawful Evil',
      levelOrCr: 'CR 1/4 (50 XP)',
      ac: 14,
      acNote: '(Armor scraps)',
      hpMax: 15,
      hitDiceFormula: '2d8 + 6',
      speed: '30 ft.',
      initiativeBonus: 2,
      passivePerception: 9,
      abilities: { str: 12, dex: 14, con: 15, int: 6, wis: 8, cha: 5 },
      damageResistances: 'Vulnerable to Bludgeoning; Immune to Poison and Exhaustion',
      senses: 'Darkvision 60 ft.',
      languages: 'Understands Common but cannot speak',
      traits: [
        {
          name: 'Relentless March',
          description:
            'Skeletons rise from their sarcophagi whenever a living creature passes the runic pillars without speaking the motto.',
        },
      ],
      actions: [
        {
          name: 'Rusted Shortsword',
          description:
            'Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 5 (1d6 + 2) piercing damage.',
          attackBonus: 4,
          damageFormula: '1d6+2',
        },
        {
          name: 'Worn Shortbow',
          description:
            'Ranged Weapon Attack: +4 to hit, range 80/320 ft. Hit: 5 (1d6 + 2) piercing damage.',
          attackBonus: 4,
          damageFormula: '1d6+2',
        },
      ],
      biographyOrLore: 'Ancient soldiers of House Vaelor reanimated by emerald flames.',
      tags: ['Undead', 'Crypt', 'Minion'],
      accentColor: '#64748b',
    },
    {
      id: 'mon-shadow-cultist',
      kind: 'monster',
      name: 'Acolyte of the Black Veil',
      playerOrRole: 'Fanatic Spellcaster',
      size: 'Medium',
      creatureType: 'Humanoid (Any)',
      alignment: 'Neutral Evil',
      levelOrCr: 'CR 1 (200 XP)',
      ac: 13,
      acNote: '(Leather armor + Runic ring)',
      hpMax: 27,
      hitDiceFormula: '5d8 + 5',
      speed: '30 ft.',
      initiativeBonus: 1,
      passivePerception: 12,
      abilities: { str: 11, dex: 13, con: 12, int: 12, wis: 14, cha: 13 },
      skills: 'Deception +3, Religion +4, Arcana +3',
      languages: 'Common, Abyssal',
      traits: [
        {
          name: 'Dark Devotion',
          description: 'Has advantage on saving throws against being charmed or frightened.',
        },
      ],
      actions: [
        {
          name: 'Sacrificial Dagger (Melee)',
          description:
            'Melee Weapon Attack: +3 to hit, reach 5 ft. Hit: 3 (1d4 + 1) piercing damage + 3 (1d6) necrotic damage.',
          attackBonus: 3,
          damageFormula: '1d4+1+1d6',
        },
        {
          name: 'Necrotic Bolt (Ranged)',
          description:
            'Ranged Spell Attack: +4 to hit, range 60 ft. Hit: 9 (2d8) necrotic damage.',
          attackBonus: 4,
          damageFormula: '2d8',
        },
      ],
      biographyOrLore:
        'Wears a tarnished silver mask and whispers litanies to feed the emerald brazier.',
      tags: ['Cult', 'Spellcaster', 'Crypt'],
      accentColor: '#9333ea',
    },
    {
      id: 'mon-vaelor-boss',
      kind: 'monster',
      name: 'Lord Vaelor, the Ashen Whisper',
      playerOrRole: 'BOSS — Undead Knight & Necromancer',
      size: 'Medium',
      creatureType: 'Undead',
      alignment: 'Lawful Evil',
      levelOrCr: 'CR 4 (1,100 XP)',
      ac: 17,
      acNote: '(Enchanted ancient half-plate)',
      hpMax: 78,
      hitDiceFormula: '12d8 + 24',
      speed: '30 ft.',
      initiativeBonus: 3,
      passivePerception: 14,
      abilities: { str: 18, dex: 14, con: 15, int: 16, wis: 14, cha: 16 },
      savingThrows: 'CON +5, WIS +5, CHA +6',
      damageResistances:
        'Necrotic, Cold; Bludgeoning, Piercing, and Slashing from nonmagical attacks',
      senses: 'Darkvision 120 ft.',
      languages: 'Common, Elvish, Draconic, Infernal',
      traits: [
        {
          name: 'Aura of Whispers (10 ft. Radius)',
          description:
            'Any hostile creature starting its turn within 10 ft. of Vaelor hears spectral voices and must succeed on a DC 13 WIS save or take 4 (1d8) psychic damage and lose reactions until its next turn.',
        },
        {
          name: 'Emerald Brazier Bond',
          description:
            'While the central Brazier in the Throne Room burns, Vaelor regenerates 5 HP at the start of his turn. Extinguishing or destroying the brazier (AC 13, 20 HP or DC 14 Religion/Arcana check) disables regeneration.',
        },
      ],
      actions: [
        {
          name: 'Multiattack',
          description: 'Vaelor makes two attacks with his Ashen Greatsword.',
        },
        {
          name: 'Ashen Greatsword',
          description:
            'Melee Weapon Attack: +6 to hit, reach 5 ft. Hit: 11 (2d6 + 4) slashing damage plus 4 (1d8) necrotic damage.',
          attackBonus: 6,
          damageFormula: '2d6+4+1d8',
        },
        {
          name: 'Grave Wave (Recharge 5–6)',
          description:
            'Vaelor slams his blade into the stone, unleashing a 15-ft. cone of spectral ash. DC 14 CON save: 18 (4d8) necrotic damage (half on success).',
          damageFormula: '4d8',
        },
      ],
      reactionsOrLegendary: [
        {
          name: 'Ashen Step (1 Legendary Action)',
          description:
            'Vaelor dissolves into ash and teleports up to 20 ft. to an unoccupied space he can see without provoking opportunity attacks.',
        },
        {
          name: 'Call of the Fallen (2 Legendary Actions)',
          description:
            'A pile of bones in the room reassembles into a Crypt Skeleton Guard with 10 HP.',
        },
      ],
      biographyOrLore:
        'Once protector of the valley, Vaelor forged a forbidden pact to prevent his house’s demise, condemning all within to an eternity of echo and ash.',
      tags: ['Boss', 'Undead', 'Legendary Actions'],
      accentColor: '#dc2626',
    },
  ],

  parties: [
    {
      id: 'party-giovedi',
      name: 'The Griffin Company (Thursday Group)',
      description:
        'Veteran Thursday night group: focused on investigation, roleplay, and balanced tactics.',
      memberCharacterIds: ['pc-tharion', 'pc-lyra', 'pc-kaelen'],
    },
    {
      id: 'party-sabato',
      name: 'The Twilight Blades (Saturday Group)',
      description:
        'Weekend group running the same adventure: holy & stealth strike formation.',
      memberCharacterIds: ['pc-tharion', 'pc-kaelen', 'pc-brynja'],
    },
  ],

  sfxCatalog: [
    {
      id: 'sfx-tavern-hearth',
      name: 'Tavern Hearth & Murmur',
      category: 'ambience',
      description: 'Warm crackling fire and cozy atmosphere inside The Black Stag Inn.',
      loop: true,
      defaultVolume: 0.55,
      synthPreset: 'tavern_hearth',
      iconName: 'Flame',
      color: '#d97706',
      tags: ['Tavern', 'Rest', 'Social'],
    },
    {
      id: 'sfx-rain-storm',
      name: 'Driving Rain & Night Wind',
      category: 'ambience',
      description: 'Outdoor storm lashing against leaded glass and the sanctuary courtyard.',
      loop: true,
      defaultVolume: 0.5,
      synthPreset: 'rain_storm',
      iconName: 'CloudRain',
      color: '#0284c7',
      tags: ['Outdoor', 'Night', 'Tension'],
    },
    {
      id: 'sfx-crypt-whispers',
      name: 'Crypt Echoes & Whispers',
      category: 'ambience',
      description: 'Deep dark drone with spectral resonances for dungeon exploration.',
      loop: true,
      defaultVolume: 0.6,
      synthPreset: 'crypt_whispers',
      iconName: 'Ghost',
      color: '#7c3aed',
      tags: ['Dungeon', 'Crypt', 'Horror'],
    },
    {
      id: 'sfx-combat-drums',
      name: 'Battle Drums (Combat Loop)',
      category: 'combat_music',
      description: 'Driving war percussion loop to accompany the Combat Tracker.',
      loop: true,
      defaultVolume: 0.65,
      synthPreset: 'combat_drums',
      iconName: 'Swords',
      color: '#dc2626',
      tags: ['Combat', 'Boss', 'Action'],
    },
    {
      id: 'sfx-creaking-door',
      name: 'Heavy Stone Gate / Door',
      category: 'sfx_environment',
      description: 'Deep metallic creak followed by the thud of an ancient lock.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'creaking_door',
      iconName: 'DoorOpen',
      color: '#78716c',
      tags: ['Door', 'Dungeon', 'Entrance'],
    },
    {
      id: 'sfx-thunder-clap',
      name: 'Sudden Thunderclap',
      category: 'sfx_environment',
      description: 'Dramatic thunder boom ideal for revelations or plot twists.',
      loop: false,
      defaultVolume: 0.85,
      synthPreset: 'thunder_clap',
      iconName: 'Zap',
      color: '#eab308',
      tags: ['Weather', 'Plot Twist'],
    },
    {
      id: 'sfx-trap-trigger',
      name: 'Mechanical Trap Trigger',
      category: 'sfx_environment',
      description: 'Sharp metallic click followed by snapping darts or blades.',
      loop: false,
      defaultVolume: 0.85,
      synthPreset: 'trap_trigger',
      iconName: 'AlertTriangle',
      color: '#f97316',
      tags: ['Trap', 'Hazard'],
    },
    {
      id: 'sfx-sword-clash',
      name: 'Clash of Blades & Steel',
      category: 'sfx_creature',
      description: 'Metallic impact for starting a duel or ambush.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'sword_clash',
      iconName: 'ShieldAlert',
      color: '#94a3b8',
      tags: ['Sword', 'Attack'],
    },
    {
      id: 'sfx-dragon-roar',
      name: 'Sepulchral Boss Roar',
      category: 'sfx_creature',
      description: 'Deep reverberating roar when Lord Vaelor rises from his throne.',
      loop: false,
      defaultVolume: 0.9,
      synthPreset: 'dragon_roar',
      iconName: 'Skull',
      color: '#b91c1c',
      tags: ['Boss', 'Monster', 'Vaelor'],
    },
    {
      id: 'sfx-arcane-blast',
      name: 'Arcane / Necrotic Blast',
      category: 'sfx_magic',
      description: 'Burst of magical energy for spells or brazier activation.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'arcane_blast',
      iconName: 'Sparkles',
      color: '#a855f7',
      tags: ['Magic', 'Spell'],
    },
    {
      id: 'sfx-healing-chime',
      name: 'Sacred Light & Healing',
      category: 'sfx_magic',
      description: 'Crystalline celestial chord for healing, blessings, or altar purification.',
      loop: false,
      defaultVolume: 0.75,
      synthPreset: 'healing_chime',
      iconName: 'Heart',
      color: '#10b981',
      tags: ['Healing', 'Divine'],
    },
    {
      id: 'sfx-war-horn',
      name: 'Ancient War Horn',
      category: 'sfx_ui',
      description: 'Solemn horn call for session start or arriving reinforcements.',
      loop: false,
      defaultVolume: 0.8,
      synthPreset: 'war_horn',
      iconName: 'Volume2',
      color: '#f59e0b',
      tags: ['Start', 'Signal'],
    },
  ],

  adventures: [
    {
      id: 'adv-cripta-sussurrante',
      title: 'The Secret of the Whispering Crypt',
      subtitle: 'A gothic One-Shot adventure for 3–5 characters of 3rd–4th level',
      type: 'oneshot',
      campaignId: 'camp-valle-bruma',
      episodeNumber: 1,
      levelRange: 'Level 3–4',
      estimatedDuration: '3–4 hours',
      authorOrNotes:
        'Ready-to-play module for testing parallel groups with integrated SFX and encounters.',
      tags: ['One-Shot', 'Investigation', 'Dungeon Crawl', 'Undead'],
      defaultPartyIds: ['party-giovedi', 'party-sabato'],
      updatedAt: '2026-10-21T16:00:00.000Z',
      scenes: [
        {
          id: 'scene-1-locanda',
          code: 'Scene 1',
          title: 'The Black Stag Inn',
          estimatedMinutes: 40,
          location: 'Coldstone Village — Inn Common Room',
          summary:
            'The characters are approached by innkeeper Bramante Garrick on a stormy night: whispers and emerald lights are coming from the old chapel.',
          linkedCharacterIds: ['npc-garrick', 'npc-elira'],
          linkedSfxIds: ['sfx-tavern-hearth', 'sfx-rain-storm', 'sfx-thunder-clap'],
          encounters: [],
          homebreweryMarkdown: `# Scene 1: The Black Stag Inn

Rain lashes relentlessly against the leaded glass panes of **The Black Stag**, the only building still lit in the mountain hamlet of *Coldstone*.

@sfx[sfx-tavern-hearth] @sfx[sfx-rain-storm]

:::read-aloud
The scent of mutton stew, wet pinewood, and dark ale fills the low-ceilinged hall. A few patrons sit quietly near the hearth. Behind the oak counter, abroad-shouldered man with a scar over his left eyebrow has been wiping the same tankard for several minutes, casting nervous glances toward the barred door. As you approach, he leans forward and sets a heavy blackened-iron key upon the wood.
:::

### Bramante Garrick's Plea
Innkeeper @npc[npc-garrick] explains the situation to the adventurers in a hushed voice:
- Three nights ago, a lightning bolt cracked the outer seal of the old **Sanctuary of House Vaelor**, on the hill north of the village.
- **Sister Elira** (@npc[npc-elira]), keeper of the sanctuary, went up there yesterday at dusk and never returned.
- Anyone who approaches the gate hears voices whispering their own name from beneath the earth.

@sfx[sfx-thunder-clap]

:::dm-note
**Skill Checks & Clues in the Inn**
- **Insight DC 12**: Garrick hides personal guilt; his grandfather was Lord Vaelor's squire and guarded the motto engraved on the key: *"Light in the ash, silence in the iron"*.
- **History or Religion DC 13**: PCs recall that Lord Vaelor did not die in battle, but sealed his own crypt from within during the Ashen Plague.
- **Promised Reward**: **150 gp** pooled by the village council plus permission to keep any uncursed relics found inside.
:::

| D6 | Tavern Patron Rumor | Truth Behind the Rumor |
| :-: | :--- | :--- |
| **1-2** | *"The dead only walk if you step on the central runes."* | **True**: the sarcophagi in Scene 2 react to anyone who fails to speak the motto. |
| **3-4** | *"There is a chest of pure gold behind the throne."* | **Partial**: there is a runic chest, but the true power lies in the Emerald Brazier. |
| **5-6** | *"Sister Elira joined the cultists."* | **False**: Elira is wounded and trapped in the antechamber. |`,
        },
        {
          id: 'scene-2-navata',
          code: 'Scene 2',
          title: 'The Shattered Gate and the Nave of Urns',
          estimatedMinutes: 60,
          location: 'Crypt Entrance — Hall of Runic Pillars',
          summary:
            'The PCs unlock the stone portal, find Sister Elira wounded, and face the skeletal guard and lookout acolyte.',
          linkedCharacterIds: ['npc-elira', 'mon-skeleton-guard', 'mon-shadow-cultist'],
          linkedSfxIds: ['sfx-creaking-door', 'sfx-crypt-whispers', 'sfx-trap-trigger', 'sfx-sword-clash'],
          encounters: [
            {
              id: 'enc-navata-guardie',
              name: 'Ambush in the Nave of Urns',
              difficulty: 'Medium',
              environment: 'Flagstone hall with 6 pillars (half cover) and unlit braziers',
              description:
                '2 Crypt Skeleton Guards emerge from side alcoves while 1 Acolyte of the Black Veil hurls necrotic bolts from the far balcony.',
              autoSfxId: 'sfx-sword-clash',
              slots: [
                { characterId: 'mon-skeleton-guard', count: 2, customLabel: 'Skeleton Guard' },
                { characterId: 'mon-shadow-cultist', count: 1, customLabel: 'Balcony Acolyte' },
              ],
            },
          ],
          homebreweryMarkdown: `# Scene 2: The Nave of Urns

Climbing the muddy path, the sanctuary gate looms wrapped in unnatural fog. Turning Garrick's key in the lock, the heavy stone door yields with a metallic groan.

@sfx[sfx-creaking-door] @sfx[sfx-crypt-whispers]

:::read-aloud
Stone steps descend into a subterranean nave supported by six pillars carved like mourning knights. A faint greenish phosphorescence seeps from the far doorway. Slumped behind the first pillar on the left is a figure in soot-stained white robes: Sister Elira, motioning for you to halt before stepping onto the central mosaic!
:::

### The Runic Mosaic Trap
The central floor bears an inscription in ancient Elvish.
- **Passive Perception 14+ or Investigation DC 13**: Notices pressure plates linked to the sarcophagus alcoves.
- If a PC crosses the mosaic without speaking *"Light in the ash, silence in the iron"*, the alarm rune triggers (@sfx[sfx-trap-trigger]).

### Planned Encounter: Sentinels of the Veil
From the far balcony, an @npc[mon-shadow-cultist] commands the @npc[mon-skeleton-guard] to eliminate the intruders!

@encounter[enc-navata-guardie]

:::dm-note
**Monster Tactics & Sister Elira's Aid**
- The **Skeleton Guards** block the central aisle to prevent melee PCs from reaching the Acolyte immediately.
- The **Acolyte of the Black Veil** uses the balcony (half cover, +2 AC) until engaged.
- If healed for at least 1 HP (@sfx[sfx-healing-chime]), **Sister Elira** (@npc[npc-elira]) reveals Lord Vaelor's weakness in the next chamber: *"Do not strike his armor alone! Extinguish the Emerald Brazier or the ash will knit him back together!"*
:::`,
        },
        {
          id: 'scene-3-trono',
          code: 'Scene 3',
          title: 'Sanctum of the Emerald Brazier (Final Boss)',
          estimatedMinutes: 80,
          location: 'Burial Chamber of Lord Vaelor',
          summary:
            'Final showdown in the circular chamber against Lord Vaelor and the Emerald Brazier ritual.',
          linkedCharacterIds: ['mon-vaelor-boss', 'mon-skeleton-guard', 'mon-shadow-cultist'],
          linkedSfxIds: ['sfx-dragon-roar', 'sfx-combat-drums', 'sfx-arcane-blast', 'sfx-healing-chime'],
          encounters: [
            {
              id: 'enc-boss-vaelor',
              name: 'The Awakening of Lord Vaelor (Boss Fight)',
              difficulty: 'Hard',
              environment: 'Circular hall with the Emerald Brazier at the center and the Stone Throne to the north',
              description:
                'Lord Vaelor descends from the throne wielding his Ashen Greatsword, flanked by 1 Acolyte and 1 Skeleton Guard.',
              autoSfxId: 'sfx-combat-drums',
              slots: [
                { characterId: 'mon-vaelor-boss', count: 1, customLabel: 'Lord Vaelor' },
                { characterId: 'mon-shadow-cultist', count: 1, customLabel: 'Ritual Celebrant' },
                { characterId: 'mon-skeleton-guard', count: 1, customLabel: 'Throne Guard' },
              ],
            },
          ],
          homebreweryMarkdown: `# Scene 3: Sanctum of the Emerald Brazier

Beyond the carved portal, the temperature drops sharply. Your breath turns to white vapor.

@sfx[sfx-dragon-roar] @sfx[sfx-arcane-blast]

:::read-aloud
At the center of a vast circular hall burns a massive bronze brazier, casting emerald flames that give off no heat. Atop the opposite dais sits an imposing figure in ancient half-plate. As you enter, twin orbs of green ember ignite beneath his visor: Lord Vaelor rises slowly, drawing a greatsword wreathed in swirling ash.
*"Have you come to claim the silence... or join the choir?"*
:::

### Final Showdown: The Lord of Ashes
Launch the main encounter when dialogue ends or as soon as a PC attacks the brazier:

@encounter[enc-boss-vaelor]

:::dm-note
**Dynamic Encounter Mechanics (The Emerald Brazier)**
1. **The Emerald Brazier** stands at the center of the map (AC 13, 20 HP, immune to poison/psychic).
2. Instead of weapon attacks, an adjacent PC can use an action to attempt a **DC 14 Religion or Arcana check** or cast *Dispel Magic* / *Radiance of the Dawn* (@sfx[sfx-healing-chime]) to extinguish it immediately.
3. When the Brazier is extinguished, **Lord Vaelor** (@npc[mon-vaelor-boss]) loses his 5 HP/turn regeneration and immediately takes 10 radiant backlash damage!
:::

### Conclusion & Treasure
With Vaelor's fall, the whispers cease and a solemn calm settles over the sanctuary. In the reliquary behind the throne, the characters discover:
- **Votive Blade of Dawn** (*+1 Longsword* that sheds dim light on command);
- **Pouch with 220 gp** in ancient coinage and a *Ring of Mind Shielding*;
- **Vaelor's Sealed Journal** (direct hook into Chapter II of *Chronicles of Mistvale*!).`,
        },
      ],
    },
    {
      id: 'adv-forte-bruma-ep2',
      title: 'Chapter II — Shadows of Mistkeep',
      subtitle: 'Direct sequel: the journal found in the crypt leads to the border fortress',
      type: 'campaign_module',
      campaignId: 'camp-valle-bruma',
      episodeNumber: 2,
      levelRange: 'Level 4–5',
      estimatedDuration: '2–3 sessions',
      authorOrNotes: 'Second sequential module linked to the Chronicles of Mistvale campaign.',
      tags: ['Campaign', 'Siege', 'Political Intrigue'],
      defaultPartyIds: ['party-giovedi'],
      updatedAt: '2026-10-20T10:00:00.000Z',
      scenes: [
        {
          id: 'scene-fb-1',
          code: 'Act I',
          title: 'Arrival at the Gates of Mistkeep',
          estimatedMinutes: 50,
          location: 'Mistkeep Drawbridge',
          summary: 'The PCs present Vaelor’s seal to the quarantined garrison.',
          linkedCharacterIds: ['npc-garrick', 'mon-shadow-cultist'],
          linkedSfxIds: ['sfx-war-horn', 'sfx-rain-storm'],
          encounters: [],
          homebreweryMarkdown: `# Act I: The Gates of Mistkeep

@sfx[sfx-war-horn]

:::read-aloud
The basalt towers of Mistkeep loom out of the morning mist. Quarantine banners hang from the battlements: no one enters and no one leaves without the Captain's writ.
:::

:::dm-note
If the PCs saved @npc[npc-elira] in the previous adventure, her writ opens the gates immediately without requiring Persuasion checks.
:::`,
        },
      ],
    },
  ],

  playInstances: [
    {
      id: 'inst-giovedi-run1',
      adventureId: 'adv-cripta-sussurrante',
      instanceName: 'Run #1 — Thursday Group (Session 1)',
      groupName: 'The Griffin Company (Mark, Helen, Luke)',
      partyCharacterIds: ['pc-tharion', 'pc-lyra', 'pc-kaelen'],
      status: 'active',
      sessionCount: 1,
      currentSceneId: 'scene-2-navata',
      visitedSceneIds: ['scene-1-locanda', 'scene-2-navata'],
      sceneNotes: {
        'scene-1-locanda':
          'Lyra passed her History check (19), recalling Lord Vaelor’s past. Kaelen bargained with Garrick for 2 healing potions upfront.',
        'scene-2-navata':
          'Kaelen spotted the pressure plate before Tharion stepped on it! They just healed Sister Elira and are about to engage the guards.',
      },
      pcStatus: {
        'pc-tharion': {
          characterId: 'pc-tharion',
          hpCurrent: 34,
          tempHp: 0,
          conditions: ['Blessed'],
          inspiration: true,
          sessionNotes: 'Carrying Garrick’s iron key.',
        },
        'pc-lyra': {
          characterId: 'pc-lyra',
          hpCurrent: 26,
          tempHp: 5,
          conditions: [],
          inspiration: false,
          sessionNotes: 'Mage Armor active (-1 1st-level slot).',
        },
        'pc-kaelen': {
          characterId: 'pc-kaelen',
          hpCurrent: 29,
          tempHp: 0,
          conditions: [],
          inspiration: true,
          sessionNotes: 'Scouting ahead behind the second pillar.',
        },
      },
      timeline: [
        {
          id: 'log-1',
          timestamp: '2026-10-18T21:15:00.000Z',
          sceneId: 'scene-1-locanda',
          sceneTitle: 'The Black Stag Inn',
          category: 'narrative',
          title: 'Meeting Bramante Garrick',
          details:
            'The party accepted the contract to explore the Sanctuary. Garrick handed over the iron key and revealed the family motto.',
          pinnedForRecap: true,
        },
        {
          id: 'log-2',
          timestamp: '2026-10-18T21:50:00.000Z',
          sceneId: 'scene-2-navata',
          sceneTitle: 'The Shattered Gate and the Nave of Urns',
          category: 'choice',
          title: 'Runic Mosaic Disarmed & Elira Rescued',
          details:
            'Kaelen spotted the pressure mechanism; Tharion used Lay on Hands (5 HP) to get Sister Elira back on her feet.',
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
      instanceName: 'Run #2 — Saturday Group (Weekend One-Shot)',
      groupName: 'The Twilight Blades (Mark, Luke, Sarah)',
      partyCharacterIds: ['pc-tharion', 'pc-kaelen', 'pc-brynja'],
      status: 'active',
      sessionCount: 1,
      currentSceneId: 'scene-1-locanda',
      visitedSceneIds: ['scene-1-locanda'],
      sceneNotes: {
        'scene-1-locanda':
          'This group took a much more direct approach: Brynja blessed the patrons in the tavern to calm the panic.',
      },
      pcStatus: {
        'pc-tharion': {
          characterId: 'pc-tharion',
          hpCurrent: 38,
          tempHp: 0,
          conditions: [],
          inspiration: false,
          sessionNotes: 'Ready to march up the hill.',
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
          sessionNotes: 'Holy symbol ready to turn undead.',
        },
      },
      timeline: [
        {
          id: 'log-sab-1',
          timestamp: '2026-10-20T16:30:00.000Z',
          sceneId: 'scene-1-locanda',
          sceneTitle: 'The Black Stag Inn',
          category: 'narrative',
          title: 'Oath in the Tavern',
          details:
            'Brynja promised Garrick to bring Sister Elira back safe without asking for an upfront gold advance.',
          pinnedForRecap: true,
        },
      ],
      activeCombat: null,
      startedAt: '2026-10-20T16:15:00.000Z',
      lastPlayedAt: '2026-10-20T17:00:00.000Z',
    },
  ],
};

export const SEED_DATABASE_IT: DndDatabase = {
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
          description:
            'Attacco con arma da mischia: +5 al tiro per colpire, portata 1,5m, un bersaglio. Colpito: 1d8 + 3 danni taglienti.',
          attackBonus: 5,
          damageFormula: '1d8+3',
        },
        {
          name: 'Incanalare Divinità: Ira della Natura',
          description: 'Rampicanti spettrali trattengono una creatura entro 3m (TS For/Des CD 13).',
        },
      ],
      spellsNotes:
        'Incantesimi preparati (CD 13, +5 colpire): Benedizione, Cura Ferite, Passo Velato, Punizione Marchiante.',
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
          description:
            'Attacco con incantesimo a distanza: +6 al tiro per colpire, gittata 36m. Colpito: 1d10 danni da fuoco.',
          attackBonus: 6,
          damageFormula: '1d10',
        },
        {
          name: 'Raggio Rovente / Dardo Incantato',
          description:
            '3 raggi da 2d6 fuoco ciascuno (+6 a colpire) oppure 3 dardi automatici da 1d4+1 forza.',
          attackBonus: 6,
          damageFormula: '2d6',
        },
      ],
      spellsNotes:
        'CD Incantesimi 14, Bonus attacco +6. Slot: 4 di 1° liv, 3 di 2° liv (Scudo, Individuazione del Magico, Frantumare, Passo Velato).',
      biographyOrLore:
        'Studiosa di iscrizioni pre-cataclisma, cerca il diario perduto dell’Arcimago Vaelor.',
      tags: ['Caster Arcano', 'AoE', 'Conoscenze', 'Party A'],
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
          description:
            'Una volta per turno infligge +2d6 danni extra se ha vantaggio o se un alleato è entro 1,5m dal bersaglio.',
        },
        {
          name: 'Azione Scaltra & Assassinare',
          description:
            'Scatto, Disimpegno o Nascondersi come azione bonus. Vantaggio contro chi non ha ancora agito nel primo turno.',
        },
      ],
      actions: [
        {
          name: 'Stocco Perfetto',
          description:
            'Attacco con arma da mischia: +6 a colpire, portata 1,5m. Colpito: 1d8 + 4 danni perforanti (+2d6 furtivo).',
          attackBonus: 6,
          damageFormula: '1d8+4',
        },
        {
          name: 'Arco Corto',
          description:
            'Attacco con arma a distanza: +6 a colpire, gittata 24/96m. Colpito: 1d6 + 4 danni perforanti.',
          attackBonus: 6,
          damageFormula: '1d6+4',
        },
      ],
      biographyOrLore:
        'Esploratore e scassinatore infallibile, conosce tutti i passaggi dei contrabbandieri.',
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
          description:
            'Impone svantaggio al tiro per colpire di un attaccante entro 9m che può vedere.',
        },
      ],
      actions: [
        {
          name: 'Martello da Guerra Consacrato',
          description:
            'Attacco con arma da mischia: +4 a colpire, portata 1,5m. Colpito: 1d8 + 2 danni contundenti.',
          attackBonus: 4,
          damageFormula: '1d8+2',
        },
        {
          name: 'Fiamma Sacra (Sacred Flame)',
          description:
            'TS Destrezza CD 14 o il bersaglio subisce 1d8 danni radiosi (ignora copertura).',
          damageFormula: '1d8',
        },
      ],
      spellsNotes:
        'CD 14, +6 attacco. Parola Guaritrice, Benedizione, Arma Spirituale, Raggio Rovente, Guardiani Spirituali (pergamena).',
      biographyOrLore:
        'Custode della Fiamma Perenne, determinata a purificare la Cripta Sussurrante.',
      tags: ['Healer', 'Supporto', 'Anti-Non Morti', 'Party B'],
      accentColor: '#eab308',
    },
    {
      id: 'npc-garrick',
      kind: 'npc',
      name: 'Bramante Garrick',
      playerOrRole: 'NPC — Locandiere & Informatore ("Il Cervo Nero")',
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
          description:
            'Attacco con arma a distanza: +3 a colpire, gittata 30/120m. Colpito: 1d10 + 1 danni perforanti.',
          attackBonus: 3,
          damageFormula: '1d10+1',
        },
      ],
      biographyOrLore:
        'Un veterano con una cicatrice sul sopracciglio sinistro. Parla a bassa voce quando nella sala ci sono forestieri.',
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
          description:
            'Una volta per sessione può benedire le armi del gruppo conferendo +1d4 danni radiosi per 1 ora.',
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
          name: 'Marcia Implacabile',
          description:
            'Gli scheletri si rialzano dai sarcofagi quando una creatura vivente supera le colonne runiche senza pronunciare il motto.',
        },
      ],
      actions: [
        {
          name: 'Spada Corta Arrugginita',
          description:
            'Attacco con arma da mischia: +4 a colpire, portata 1,5m. Colpito: 5 (1d6 + 2) danni perforanti.',
          attackBonus: 4,
          damageFormula: '1d6+2',
        },
        {
          name: 'Arco Corto Logoro',
          description:
            'Attacco con arma a distanza: +4 a colpire, gittata 24/96m. Colpito: 5 (1d6 + 2) danni perforanti.',
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
          description:
            'Attacco con arma da mischia: +3 a colpire, portata 1,5m. Colpito: 3 (1d4 + 1) danni perforanti + 3 (1d6) danni necrotici.',
          attackBonus: 3,
          damageFormula: '1d4+1+1d6',
        },
        {
          name: 'Dardo Necrotico (Distanza)',
          description:
            'Attacco con incantesimo a distanza: +4 a colpire, gittata 18m. Colpito: 9 (2d8) danni necrotici.',
          attackBonus: 4,
          damageFormula: '2d8',
        },
      ],
      biographyOrLore:
        'Indossa una maschera d’argento ossidato e sussurra litanie per alimentare il braciere.',
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
      damageResistances:
        'Necrotico, Freddo; Contundente, Perforante e Tagliente da attacchi non magici',
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
          description:
            'Vaelor si dissolve in cenere e si teletrasporta fino a 6m in uno spazio libero che può vedere senza provocare attacchi di opportunità.',
        },
        {
          name: 'Richiamo dei Caduti (2 Azioni Leggendarie)',
          description:
            'Un mucchio d’ossa nella stanza si riassembla in uno Scheletro Guardia Cripta con 10 PF.',
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
      description:
        'Il gruppo storico del giovedì sera: focalizzato su investigazione, ruolo e tattica bilanciata.',
      memberCharacterIds: ['pc-tharion', 'pc-lyra', 'pc-kaelen'],
    },
    {
      id: 'party-sabato',
      name: 'Le Lame del Crepuscolo (Gruppo Sabato)',
      description:
        'Secondo gruppo che gioca nel weekend la stessa avventura: formazione d’assalto sacro/furtivo.',
      memberCharacterIds: ['pc-tharion', 'pc-kaelen', 'pc-brynja'],
    },
  ],
  sfxCatalog: SEED_DATABASE_EN.sfxCatalog.map((s) => {
    const itMap: Record<string, { name: string; description: string }> = {
      'sfx-tavern-hearth': {
        name: 'Camino della Locanda & Brusio',
        description: 'Crepitio caldo del fuoco e atmosfera accogliente della locanda Il Cervo Nero.',
      },
      'sfx-rain-storm': {
        name: 'Pioggia Battente & Vento Notturno',
        description: 'Temporale esterno che batte contro le vetrate e nel cortile del santuario.',
      },
      'sfx-crypt-whispers': {
        name: 'Echi & Sussurri della Cripta',
        description: 'Drone basso oscuro con risonanze spettrali per l’esplorazione del dungeon.',
      },
      'sfx-combat-drums': {
        name: 'Tamburi di Battaglia (Loop Combat)',
        description: 'Ritmo incalzante di percussioni da guerra per accompagnare il Combat Tracker.',
      },
      'sfx-creaking-door': {
        name: 'Cancello / Porta di Pietra Pesante',
        description: 'Cigolio metallico profondo seguito dal tonfo della serratura antica.',
      },
      'sfx-thunder-clap': {
        name: 'Tuono Improvviso',
        description: 'Boato drammatico perfetto per rivelazioni o colpi di scena.',
      },
      'sfx-trap-trigger': {
        name: 'Scatto di Trappola Meccanica',
        description: 'Click metallico secco seguito dallo scocco di dardi o lame.',
      },
      'sfx-sword-clash': {
        name: 'Scontro di Lame & Acciaio',
        description: 'Impatto metallico d’inizio duello o imboscata.',
      },
      'sfx-dragon-roar': {
        name: 'Ruggito / Urlo Sepolcrale del Boss',
        description: 'Ruggito profondo e riverberato quando Lord Vaelor si risveglia dal trono.',
      },
      'sfx-arcane-blast': {
        name: 'Esplosione Arcana / Necrotica',
        description: 'Scarica di energia magica per incantesimi o attivazione del braciere.',
      },
      'sfx-healing-chime': {
        name: 'Luce Sacra & Guarigione',
        description: 'Accordo cristallino celestiale per cure, benedizioni o purificazione dell’altare.',
      },
      'sfx-war-horn': {
        name: 'Corno da Guerra Antico',
        description: 'Richiamo solenne di inizio sessione o arrivo dei rinforzi.',
      },
    };
    return itMap[s.id] ? { ...s, ...itMap[s.id] } : s;
  }),
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

export const SEED_DATABASE: DndDatabase = SEED_DATABASE_EN;

export function getSeedDatabase(lang: 'en' | 'it'): DndDatabase {
  return structuredClone(lang === 'it' ? SEED_DATABASE_IT : SEED_DATABASE_EN);
}
