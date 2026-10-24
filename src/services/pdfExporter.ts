import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage, RGB } from 'pdf-lib';
import {
  CharacterEntity,
  DND_ABILITY_META,
  DND_SKILLS,
  formatMod,
  formatProficientSavesSummary,
  formatProficientSkillsSummary,
  formatSignedBonus,
  getModValue,
  getProficiencyBonus,
  getSavingThrowTotalBonus,
  getSkillTotalBonus,
} from '../types/dnd';

const COLOR_CRIMSON = rgb(0.345, 0.094, 0.051); // #58180D
const COLOR_GOLD = rgb(0.72, 0.56, 0.25); // #B88F40
const COLOR_DARK = rgb(0.14, 0.08, 0.05);
const COLOR_MUTED = rgb(0.38, 0.32, 0.27);
const COLOR_PARCHMENT = rgb(0.992, 0.965, 0.898); // #FDF6E5
const COLOR_BOX_BG = rgb(0.96, 0.92, 0.82);
const COLOR_WHITE = rgb(1, 1, 1);

function sanitizePdfText(input: string | undefined): string {
  if (!input) return '';
  return input
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/•/g, '*')
    .replace(/✦/g, '*')
    .replace(/★/g, '*')
    .replace(/[^\x00-\xFF]/g, '');
}

function wrapTextLines(
  text: string,
  font: PDFFont,
  fontSize: number,
  maxWidth: number
): string[] {
  const clean = sanitizePdfText(text);
  const paragraphs = clean.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let currentLine = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${currentLine} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = words[i];
      }
    }
    lines.push(currentLine);
  }
  return lines;
}

async function tryEmbedPortrait(pdfDoc: PDFDocument, portraitUrl?: string) {
  if (!portraitUrl) return null;
  try {
    if (portraitUrl.startsWith('data:image/png')) {
      const base64 = portraitUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return await pdfDoc.embedPng(bytes);
    }
    if (portraitUrl.startsWith('data:image/jpeg') || portraitUrl.startsWith('data:image/jpg')) {
      const base64 = portraitUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      return await pdfDoc.embedJpg(bytes);
    }
    const res = await fetch(portraitUrl);
    const buf = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('png') || portraitUrl.toLowerCase().endsWith('.png')) {
      return await pdfDoc.embedPng(buf);
    }
    return await pdfDoc.embedJpg(buf);
  } catch {
    return null;
  }
}

function drawLabeledFrame(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  fontBold: PDFFont,
  bgColor: RGB = COLOR_WHITE
) {
  // Outer bevel box
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: bgColor,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1.2,
  });
  // Inner subtle border
  page.drawRectangle({
    x: x + 2.5,
    y: y + 2.5,
    width: w - 5,
    height: h - 5,
    borderColor: COLOR_GOLD,
    borderWidth: 0.5,
  });
  // Bottom centered label
  const cleanLabel = sanitizePdfText(label).toUpperCase();
  const labelWidth = fontBold.widthOfTextAtSize(cleanLabel, 6.5);
  page.drawText(cleanLabel, {
    x: x + (w - labelWidth) / 2,
    y: y + 5,
    size: 6.5,
    font: fontBold,
    color: COLOR_CRIMSON,
  });
}

/**
 * Generates an Official 5e Character Sheet PDF (A4, 595.28 x 841.89 pt)
 * with pre-filled values AND editable AcroForm fields so players/DMs can
 * either print immediately or continue editing in any PDF viewer.
 */
export async function generateOfficialPcSheetPdf(
  character: CharacterEntity,
  lang: 'en' | 'it',
  runtimeOverrides?: {
    playerOverride?: string;
    customNameOverride?: string;
    hpCurrent?: number;
    tempHp?: number;
    inspiration?: boolean;
    sessionNotes?: string;
  }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontSerifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const form = pdfDoc.getForm();
  const tr = (en: string, it: string) => (lang === 'it' ? it : en);

  // Page Parchment Background
  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: COLOR_PARCHMENT,
  });

  // Decorative Outer Frame
  page.drawRectangle({
    x: 16,
    y: 16,
    width: width - 32,
    height: height - 32,
    borderColor: COLOR_CRIMSON,
    borderWidth: 2,
  });
  page.drawRectangle({
    x: 19,
    y: 19,
    width: width - 38,
    height: height - 38,
    borderColor: COLOR_GOLD,
    borderWidth: 0.75,
  });

  // ================= TOP BANNER (Official 5e Header) =================
  const headerY = height - 96;
  const headerH = 70;
  page.drawRectangle({
    x: 24,
    y: headerY,
    width: width - 48,
    height: headerH,
    color: COLOR_BOX_BG,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1.5,
  });

  // D&D 5e Dragon Header Badge
  page.drawText('DUNGEONS & DRAGONS 5E', {
    x: 34,
    y: headerY + headerH - 14,
    size: 7.5,
    font: fontBold,
    color: COLOR_CRIMSON,
  });

  // Character Name Field (Left half of banner)
  const heroName = sanitizePdfText(runtimeOverrides?.customNameOverride || character.name);
  const nameField = form.createTextField('CharacterName');
  nameField.setText(heroName);
  nameField.addToPage(page, {
    x: 34,
    y: headerY + 18,
    width: 215,
    height: 26,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1,
  });
  nameField.setFontSize(13);
  page.drawText(tr('CHARACTER NAME', 'NOME PERSONAGGIO'), {
    x: 34,
    y: headerY + 7,
    size: 6.5,
    font: fontBold,
    color: COLOR_MUTED,
  });

  // Right Grid of 6 Metadata Fields in Header (Class & Level, Background, Player Name, Species/Race, Alignment, Experience/Role)
  const metaX = 260;
  const metaW = width - 24 - metaX - 10;
  const colW = metaW / 3;

  const rawPlayer =
    runtimeOverrides?.playerOverride !== undefined
      ? runtimeOverrides.playerOverride
      : character.isPreGenBlueprint
      ? tr('Unassigned (Pre-Gen)', 'Non assegnato (Pre-Gen)')
      : character.playerOrRole.replace(/^(Player:|Giocatore:)\s*/i, '');

  const headerMeta: { name: string; label: string; value: string }[] = [
    {
      name: 'ClassAndLevel',
      label: tr('CLASS & LEVEL', 'CLASSE & LIVELLO'),
      value: `${character.classOrArchetype || tr('Adventurer', 'Avventuriero')} (${character.levelOrCr})`,
    },
    {
      name: 'Background',
      label: tr('BACKGROUND', 'BACKGROUND'),
      value: character.background || (character.tags[0] ?? tr('Heroic', 'Eroico')),
    },
    {
      name: 'PlayerName',
      label: tr('PLAYER NAME', 'NOME GIOCATORE'),
      value: rawPlayer,
    },
    {
      name: 'SpeciesRace',
      label: tr('RACE / SPECIES', 'RAZZA / SPECIE'),
      value: `${character.creatureType} (${character.size})`,
    },
    {
      name: 'Alignment',
      label: tr('ALIGNMENT', 'ALLINEAMENTO'),
      value: character.alignment,
    },
    {
      name: 'RoleOrTemplate',
      label: tr('ARCHETYPE / ID', 'ARCHETIPO / ID'),
      value: character.isPreGenBlueprint
        ? tr('Pre-Generated Blueprint', 'Blueprint Pre-Generato')
        : character.id,
    },
  ];

  headerMeta.forEach((item, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const fx = metaX + col * colW;
    const fy = row === 0 ? headerY + 40 : headerY + 13;
    const tf = form.createTextField(item.name);
    tf.setText(sanitizePdfText(item.value));
    tf.addToPage(page, {
      x: fx,
      y: fy,
      width: colW - 6,
      height: 16,
      textColor: COLOR_DARK,
      backgroundColor: COLOR_WHITE,
      borderColor: COLOR_GOLD,
      borderWidth: 0.7,
    });
    tf.setFontSize(8);
    page.drawText(item.label, {
      x: fx,
      y: fy - 7,
      size: 5.5,
      font: fontBold,
      color: COLOR_MUTED,
    });
  });

  // ================= 3-COLUMN BODY LAYOUT =================
  const bodyTop = headerY - 10;
  const bodyBottom = 26;
  const bodyH = bodyTop - bodyBottom;

  // Column 1: x=24..206 (Width 182) -> 6 Ability Scores + Inspiration + Prof Bonus + Saving Throws + All 18 Skills + Passive Perception
  // Column 2: x=214..394 (Width 180) -> AC, Initiative, Speed, HP Max/Current, Temp HP, Hit Dice, Death Saves, Attacks & Spellcasting, Spells & Equipment
  // Column 3: x=402..571 (Width 169) -> Portrait Box, Features & Traits, Proficiencies & Languages, Backstory & Notes

  const col1X = 24;
  const col1W = 182;
  const col2X = 214;
  const col2W = 180;
  const col3X = 402;
  const col3W = width - 24 - col3X;

  // ---------- COLUMN 1 LEFT STRIP: 6 ABILITY SCORES (x=24..76) ----------
  const abBoxW = 50;
  const abBoxH = 68;
  const abGap = 8;

  DND_ABILITY_META.forEach((ab, idx) => {
    const score = character.abilities[ab.key];
    const modStr = formatMod(score);
    const boxY = bodyTop - (idx + 1) * abBoxH - idx * abGap;

    page.drawRectangle({
      x: col1X,
      y: boxY,
      width: abBoxW,
      height: abBoxH,
      color: COLOR_BOX_BG,
      borderColor: COLOR_CRIMSON,
      borderWidth: 1.3,
    });

    const title = lang === 'it' ? ab.shortIt : ab.shortEn;
    const tw = fontBold.widthOfTextAtSize(title, 8);
    page.drawText(title, {
      x: col1X + (abBoxW - tw) / 2,
      y: boxY + abBoxH - 12,
      size: 8,
      font: fontBold,
      color: COLOR_CRIMSON,
    });

    // Big Modifier Field
    const modField = form.createTextField(`AbilityMod_${ab.key}`);
    modField.setText(modStr);
    modField.addToPage(page, {
      x: col1X + 7,
      y: boxY + 24,
      width: abBoxW - 14,
      height: 26,
      textColor: COLOR_DARK,
      backgroundColor: COLOR_WHITE,
      borderColor: COLOR_CRIMSON,
      borderWidth: 1,
    });
    modField.setFontSize(13);

    // Oval/Pill Score at bottom
    const scoreField = form.createTextField(`AbilityScore_${ab.key}`);
    scoreField.setText(String(score));
    scoreField.addToPage(page, {
      x: col1X + 12,
      y: boxY + 4,
      width: abBoxW - 24,
      height: 15,
      textColor: COLOR_DARK,
      backgroundColor: COLOR_PARCHMENT,
      borderColor: COLOR_GOLD,
      borderWidth: 0.8,
    });
    scoreField.setFontSize(8.5);
  });

  // ---------- COLUMN 1 RIGHT SUB-COLUMN: INSPIRATION, PROF BONUS, SAVES, 18 SKILLS ----------
  const sub1X = col1X + abBoxW + 6;
  const sub1W = col1W - abBoxW - 6;

  // Inspiration Box
  const inspY = bodyTop - 26;
  page.drawRectangle({
    x: sub1X,
    y: inspY,
    width: sub1W,
    height: 26,
    color: COLOR_WHITE,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1,
  });
  const inspCheck = form.createCheckBox('Inspiration');
  inspCheck.addToPage(page, {
    x: sub1X + 5,
    y: inspY + 5,
    width: 15,
    height: 15,
    borderColor: COLOR_CRIMSON,
  });
  if (runtimeOverrides?.inspiration) inspCheck.check();
  page.drawText(tr('INSPIRATION', 'ISPIRAZIONE'), {
    x: sub1X + 26,
    y: inspY + 9,
    size: 7.5,
    font: fontBold,
    color: COLOR_CRIMSON,
  });

  // Proficiency Bonus Box
  const pb = getProficiencyBonus(character);
  const pbY = inspY - 30;
  page.drawRectangle({
    x: sub1X,
    y: pbY,
    width: sub1W,
    height: 26,
    color: COLOR_WHITE,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1,
  });
  const pbField = form.createTextField('ProficiencyBonus');
  pbField.setText(formatSignedBonus(pb));
  pbField.addToPage(page, {
    x: sub1X + 4,
    y: pbY + 4,
    width: 24,
    height: 18,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_BOX_BG,
    borderColor: COLOR_GOLD,
    borderWidth: 0.8,
  });
  pbField.setFontSize(9.5);
  page.drawText(tr('PROFICIENCY BONUS', 'BONUS COMPETENZA'), {
    x: sub1X + 32,
    y: pbY + 9,
    size: 6.8,
    font: fontBold,
    color: COLOR_CRIMSON,
  });

  // Saving Throws Frame (6 abilities)
  const savesH = 112;
  const savesY = pbY - savesH - 6;
  drawLabeledFrame(
    page,
    sub1X,
    savesY,
    sub1W,
    savesH,
    tr('Saving Throws', 'Tiri Salvezza'),
    fontBold
  );

  DND_ABILITY_META.forEach((ab, idx) => {
    const rowY = savesY + savesH - 20 - idx * 14.5;
    const { total, proficient } = getSavingThrowTotalBonus(character, ab.key);

    const cb = form.createCheckBox(`SaveProf_${ab.key}`);
    cb.addToPage(page, {
      x: sub1X + 5,
      y: rowY,
      width: 9,
      height: 9,
      borderColor: COLOR_CRIMSON,
    });
    if (proficient) cb.check();

    const tf = form.createTextField(`SaveMod_${ab.key}`);
    tf.setText(formatSignedBonus(total));
    tf.addToPage(page, {
      x: sub1X + 17,
      y: rowY - 1,
      width: 20,
      height: 11,
      textColor: COLOR_DARK,
      backgroundColor: COLOR_BOX_BG,
      borderWidth: 0,
    });
    tf.setFontSize(7.5);

    page.drawText(lang === 'it' ? ab.fullIt : ab.fullEn, {
      x: sub1X + 40,
      y: rowY + 1,
      size: 7.2,
      font: proficient ? fontBold : fontRegular,
      color: COLOR_DARK,
    });
  });

  // All 18 Skills Frame
  const skillsH = 308;
  const skillsY = savesY - skillsH - 6;
  drawLabeledFrame(
    page,
    sub1X,
    skillsY,
    sub1W,
    skillsH,
    tr('Skills (All 18)', 'Abilita (Tutte le 18)'),
    fontBold
  );

  DND_SKILLS.forEach((sk, idx) => {
    const rowY = skillsY + skillsH - 20 - idx * 15.6;
    const { total, rank } = getSkillTotalBonus(character, sk.id);
    const abMeta = DND_ABILITY_META.find((a) => a.key === sk.ability)!;
    const abShort = lang === 'it' ? abMeta.shortIt : abMeta.shortEn;

    const cb = form.createCheckBox(`SkillProf_${sk.id}`);
    cb.addToPage(page, {
      x: sub1X + 5,
      y: rowY,
      width: 9,
      height: 9,
      borderColor: COLOR_CRIMSON,
    });
    if (rank > 0) cb.check();

    const tf = form.createTextField(`SkillMod_${sk.id}`);
    tf.setText(formatSignedBonus(total));
    tf.addToPage(page, {
      x: sub1X + 16,
      y: rowY - 1,
      width: 20,
      height: 11,
      textColor: COLOR_DARK,
      backgroundColor: rank === 2 ? COLOR_PARCHMENT : COLOR_BOX_BG,
      borderWidth: 0,
    });
    tf.setFontSize(7.5);

    const skillName = sanitizePdfText(lang === 'it' ? sk.labelIt : sk.labelEn);
    const suffix = rank === 2 ? ' (E)' : '';
    page.drawText(`${skillName}${suffix}`, {
      x: sub1X + 38,
      y: rowY + 1,
      size: 6.7,
      font: rank > 0 ? fontBold : fontRegular,
      color: COLOR_DARK,
    });

    page.drawText(`(${abShort})`, {
      x: sub1X + sub1W - 24,
      y: rowY + 1,
      size: 5.5,
      font: fontRegular,
      color: COLOR_MUTED,
    });
  });

  // Passive Perception Bar at bottom of Column 1
  const passY = bodyBottom;
  const passH = 26;
  page.drawRectangle({
    x: col1X,
    y: passY,
    width: col1W,
    height: passH,
    color: COLOR_BOX_BG,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1.2,
  });
  const passField = form.createTextField('PassivePerception');
  passField.setText(String(character.passivePerception));
  passField.addToPage(page, {
    x: col1X + 5,
    y: passY + 4,
    width: 26,
    height: 18,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_CRIMSON,
    borderWidth: 0.8,
  });
  passField.setFontSize(9.5);
  page.drawText(tr('PASSIVE WISDOM (PERCEPTION)', 'SAGGEZZA PASSIVA (PERCEZIONE)'), {
    x: col1X + 36,
    y: passY + 9,
    size: 6.8,
    font: fontBold,
    color: COLOR_CRIMSON,
  });

  // ================= COLUMN 2: COMBAT VITALS, ATTACKS & SPELLS =================
  // Top Vitals Row: AC, Initiative, Speed
  const vitalsH = 54;
  const vitalsY = bodyTop - vitalsH;
  const vitalBoxW = (col2W - 8) / 3;

  // 1. Armor Class
  drawLabeledFrame(page, col2X, vitalsY, vitalBoxW, vitalsH, tr('Armor Class', 'Classe Arm.'), fontBold, COLOR_BOX_BG);
  const acField = form.createTextField('AC');
  acField.setText(String(character.ac));
  acField.addToPage(page, {
    x: col2X + 10,
    y: vitalsY + 18,
    width: vitalBoxW - 20,
    height: 26,
    textColor: COLOR_CRIMSON,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.8,
  });
  acField.setFontSize(13);

  // 2. Initiative
  const initX = col2X + vitalBoxW + 4;
  drawLabeledFrame(page, initX, vitalsY, vitalBoxW, vitalsH, tr('Initiative', 'Iniziativa'), fontBold, COLOR_BOX_BG);
  const initField = form.createTextField('Initiative');
  initField.setText(formatSignedBonus(character.initiativeBonus));
  initField.addToPage(page, {
    x: initX + 10,
    y: vitalsY + 18,
    width: vitalBoxW - 20,
    height: 26,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.8,
  });
  initField.setFontSize(13);

  // 3. Speed
  const spdX = initX + vitalBoxW + 4;
  drawLabeledFrame(page, spdX, vitalsY, vitalBoxW, vitalsH, tr('Speed', 'Velocita'), fontBold, COLOR_BOX_BG);
  const spdField = form.createTextField('Speed');
  spdField.setText(sanitizePdfText(character.speed));
  spdField.addToPage(page, {
    x: spdX + 6,
    y: vitalsY + 18,
    width: vitalBoxW - 12,
    height: 26,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.8,
  });
  spdField.setFontSize(9.5);

  // Hit Points & Temp HP Box
  const hpBoxH = 88;
  const hpBoxY = vitalsY - hpBoxH - 6;
  drawLabeledFrame(
    page,
    col2X,
    hpBoxY,
    col2W,
    hpBoxH,
    tr('Hit Points & Temporary HP', 'Punti Ferita Attuali & Temporanei'),
    fontBold
  );

  page.drawText(tr('Hit Point Maximum:', 'Punti Ferita Massimi:'), {
    x: col2X + 8,
    y: hpBoxY + hpBoxH - 16,
    size: 7,
    font: fontBold,
    color: COLOR_MUTED,
  });
  const hpMaxField = form.createTextField('HPMax');
  hpMaxField.setText(String(character.hpMax));
  hpMaxField.addToPage(page, {
    x: col2X + 82,
    y: hpBoxY + hpBoxH - 19,
    width: 40,
    height: 13,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_BOX_BG,
    borderWidth: 0,
  });
  hpMaxField.setFontSize(8.5);

  // Current HP
  const currentHpVal =
    runtimeOverrides?.hpCurrent !== undefined ? runtimeOverrides.hpCurrent : character.hpMax;
  const hpCurrField = form.createTextField('HPCurrent');
  hpCurrField.setText(String(currentHpVal));
  hpCurrField.addToPage(page, {
    x: col2X + 8,
    y: hpBoxY + 20,
    width: 105,
    height: 36,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_BOX_BG,
    borderColor: COLOR_GOLD,
    borderWidth: 0.8,
  });
  hpCurrField.setFontSize(16);

  // Temp HP
  const tempHpVal = runtimeOverrides?.tempHp ? String(runtimeOverrides.tempHp) : '';
  const tempHpField = form.createTextField('HPTemp');
  tempHpField.setText(tempHpVal);
  tempHpField.addToPage(page, {
    x: col2X + 120,
    y: hpBoxY + 20,
    width: col2W - 128,
    height: 36,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_BOX_BG,
    borderColor: COLOR_GOLD,
    borderWidth: 0.8,
  });
  tempHpField.setFontSize(13);
  page.drawText(tr('TEMP HP', 'PF TEMP'), {
    x: col2X + 126,
    y: hpBoxY + 58,
    size: 6,
    font: fontBold,
    color: COLOR_MUTED,
  });

  // Hit Dice & Death Saves Row
  const hdBoxH = 48;
  const hdBoxY = hpBoxY - hdBoxH - 6;
  const hdW = (col2W - 6) / 2;

  drawLabeledFrame(page, col2X, hdBoxY, hdW, hdBoxH, tr('Hit Dice', 'Dadi Vita'), fontBold);
  const hdField = form.createTextField('HitDice');
  hdField.setText(sanitizePdfText(character.hitDiceFormula));
  hdField.addToPage(page, {
    x: col2X + 8,
    y: hdBoxY + 16,
    width: hdW - 16,
    height: 22,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_BOX_BG,
    borderWidth: 0,
  });
  hdField.setFontSize(10);

  const dsX = col2X + hdW + 6;
  drawLabeledFrame(page, dsX, hdBoxY, hdW, hdBoxH, tr('Death Saves', 'TS contro Morte'), fontBold);
  page.drawText(tr('Successes', 'Successi'), {
    x: dsX + 6,
    y: hdBoxY + 30,
    size: 6,
    font: fontBold,
    color: COLOR_DARK,
  });
  page.drawText(tr('Failures', 'Fallimenti'), {
    x: dsX + 6,
    y: hdBoxY + 18,
    size: 6,
    font: fontBold,
    color: COLOR_DARK,
  });
  for (let i = 0; i < 3; i++) {
    const scb = form.createCheckBox(`DeathSaveSuccess_${i + 1}`);
    scb.addToPage(page, { x: dsX + 46 + i * 12, y: hdBoxY + 29, width: 8, height: 8 });
    const fcb = form.createCheckBox(`DeathSaveFail_${i + 1}`);
    fcb.addToPage(page, { x: dsX + 46 + i * 12, y: hdBoxY + 17, width: 8, height: 8 });
  }

  // Attacks & Spellcasting Box
  const atkBoxH = 225;
  const atkBoxY = hdBoxY - atkBoxH - 6;
  drawLabeledFrame(
    page,
    col2X,
    atkBoxY,
    col2W,
    atkBoxH,
    tr('Attacks & Actions', 'Attacchi & Azioni'),
    fontBold
  );

  // Table header for first 3 weapon/spell slots
  page.drawText(tr('NAME', 'NOME'), { x: col2X + 8, y: atkBoxY + atkBoxH - 14, size: 6, font: fontBold, color: COLOR_MUTED });
  page.drawText(tr('ATK BONUS', 'BONUS ATT'), { x: col2X + 88, y: atkBoxY + atkBoxH - 14, size: 6, font: fontBold, color: COLOR_MUTED });
  page.drawText(tr('DAMAGE/TYPE', 'DANNI/TIPO'), { x: col2X + 128, y: atkBoxY + atkBoxH - 14, size: 6, font: fontBold, color: COLOR_MUTED });

  for (let i = 0; i < 3; i++) {
    const act = character.actions[i];
    const rowY = atkBoxY + atkBoxH - 32 - i * 18;
    const wName = form.createTextField(`WeaponName_${i + 1}`);
    wName.setText(sanitizePdfText(act?.name || ''));
    wName.addToPage(page, {
      x: col2X + 6,
      y: rowY,
      width: 78,
      height: 14,
      backgroundColor: COLOR_BOX_BG,
      borderWidth: 0,
    });
    wName.setFontSize(7.5);

    const wBonus = form.createTextField(`WeaponBonus_${i + 1}`);
    wBonus.setText(act?.attackBonus !== undefined ? formatSignedBonus(act.attackBonus) : '');
    wBonus.addToPage(page, {
      x: col2X + 87,
      y: rowY,
      width: 36,
      height: 14,
      backgroundColor: COLOR_BOX_BG,
      borderWidth: 0,
    });
    wBonus.setFontSize(7.5);

    const wDmg = form.createTextField(`WeaponDamage_${i + 1}`);
    wDmg.setText(sanitizePdfText(act?.damageFormula || ''));
    wDmg.addToPage(page, {
      x: col2X + 126,
      y: rowY,
      width: col2W - 132,
      height: 14,
      backgroundColor: COLOR_BOX_BG,
      borderWidth: 0,
    });
    wDmg.setFontSize(7.5);
  }

  // Detailed Action Descriptions Multiline Field
  const actionsDetailText = character.actions
    .map((a) => `${a.name}: ${a.description}`)
    .concat(
      (character.reactionsOrLegendary || []).map((r) => `[Reazione/Legg.] ${r.name}: ${r.description}`)
    )
    .join('\n\n');

  const atkDetailsField = form.createTextField('AttacksAndActionsDetails');
  atkDetailsField.enableMultiline();
  atkDetailsField.setText(sanitizePdfText(actionsDetailText));
  atkDetailsField.addToPage(page, {
    x: col2X + 6,
    y: atkBoxY + 18,
    width: col2W - 12,
    height: atkBoxH - 94,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.5,
  });
  atkDetailsField.setFontSize(7.2);

  // Spells, Armor & Equipment Box (Bottom of Column 2)
  const eqBoxY = bodyBottom;
  const eqBoxH = atkBoxY - eqBoxY - 6;
  drawLabeledFrame(
    page,
    col2X,
    eqBoxY,
    col2W,
    eqBoxH,
    tr('Spells, Armor & Equipment', 'Incantesimi, Armatura & Equip.'),
    fontBold
  );

  const equipText = [
    character.acNote ? `${tr('Armor', 'Armatura')}: ${character.acNote}` : '',
    character.damageResistances
      ? `${tr('Resistances', 'Resistenze')}: ${character.damageResistances}`
      : '',
    character.spellsNotes ? `${tr('Spells', 'Incantesimi')}:\n${character.spellsNotes}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const eqField = form.createTextField('SpellsAndEquipment');
  eqField.enableMultiline();
  eqField.setText(sanitizePdfText(equipText));
  eqField.addToPage(page, {
    x: col2X + 6,
    y: eqBoxY + 18,
    width: col2W - 12,
    height: eqBoxH - 26,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.5,
  });
  eqField.setFontSize(7.5);

  // ================= COLUMN 3: PORTRAIT, TRAITS, PROFICIENCIES & LORE =================
  let col3CursorTop = bodyTop;

  // 1. Character Portrait Frame (if portraitUrl present, or decorative crest frame)
  const portraitH = 140;
  const portraitY = col3CursorTop - portraitH;
  drawLabeledFrame(
    page,
    col3X,
    portraitY,
    col3W,
    portraitH,
    tr('Character Portrait', 'Ritratto Personaggio'),
    fontBold,
    COLOR_BOX_BG
  );

  const embeddedImage = await tryEmbedPortrait(pdfDoc, character.portraitUrl);
  if (embeddedImage) {
    const availW = col3W - 16;
    const availH = portraitH - 26;
    const dims = embeddedImage.scaleToFit(availW, availH);
    page.drawImage(embeddedImage, {
      x: col3X + (col3W - dims.width) / 2,
      y: portraitY + 18 + (availH - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    });
  } else {
    // Stylized D&D Emblem Placeholder with Initials
    const initials = character.name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const iw = fontSerifBold.widthOfTextAtSize(initials, 28);
    page.drawText(initials, {
      x: col3X + (col3W - iw) / 2,
      y: portraitY + portraitH / 2 - 4,
      size: 28,
      font: fontSerifBold,
      color: COLOR_CRIMSON,
    });
  }

  col3CursorTop = portraitY - 6;

  // 2. Features & Class Traits Box
  const traitsH = 230;
  const traitsY = col3CursorTop - traitsH;
  drawLabeledFrame(
    page,
    col3X,
    traitsY,
    col3W,
    traitsH,
    tr('Features & Special Traits', 'Privilegi & Tratti Speciali'),
    fontBold
  );

  const traitsText = character.traits
    .map((t) => `* ${t.name}: ${t.description}`)
    .join('\n\n');

  const traitsField = form.createTextField('FeaturesAndTraits');
  traitsField.enableMultiline();
  traitsField.setText(sanitizePdfText(traitsText));
  traitsField.addToPage(page, {
    x: col3X + 6,
    y: traitsY + 18,
    width: col3W - 12,
    height: traitsH - 26,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.5,
  });
  traitsField.setFontSize(7.5);

  col3CursorTop = traitsY - 6;

  // 3. Senses, Languages & Other Proficiencies
  const profBoxH = 110;
  const profBoxY = col3CursorTop - profBoxH;
  drawLabeledFrame(
    page,
    col3X,
    profBoxY,
    col3W,
    profBoxH,
    tr('Senses & Languages', 'Sensi, Linguaggi & Competenze'),
    fontBold
  );

  const sensesLangText = [
    character.senses ? `${tr('Senses', 'Sensi')}: ${character.senses}` : '',
    character.languages ? `${tr('Languages', 'Linguaggi')}: ${character.languages}` : '',
    character.tags.length ? `${tr('Tags / Roles', 'Ruoli')}: ${character.tags.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const langField = form.createTextField('SensesAndLanguages');
  langField.enableMultiline();
  langField.setText(sanitizePdfText(sensesLangText));
  langField.addToPage(page, {
    x: col3X + 6,
    y: profBoxY + 18,
    width: col3W - 12,
    height: profBoxH - 26,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.5,
  });
  langField.setFontSize(7.5);

  col3CursorTop = profBoxY - 6;

  // 4. Backstory, Personality & Session Notes
  const loreBoxY = bodyBottom;
  const loreBoxH = col3CursorTop - loreBoxY;
  drawLabeledFrame(
    page,
    col3X,
    loreBoxY,
    col3W,
    loreBoxH,
    tr('Backstory & Session Notes', 'Biografia & Note di Sessione'),
    fontBold
  );

  const combinedLore = [
    character.biographyOrLore,
    runtimeOverrides?.sessionNotes
      ? `[${tr('Session Notes', 'Note Sessione')}]: ${runtimeOverrides.sessionNotes}`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const loreField = form.createTextField('BackstoryAndNotes');
  loreField.enableMultiline();
  loreField.setText(sanitizePdfText(combinedLore));
  loreField.addToPage(page, {
    x: col3X + 6,
    y: loreBoxY + 18,
    width: col3W - 12,
    height: loreBoxH - 26,
    textColor: COLOR_DARK,
    backgroundColor: COLOR_WHITE,
    borderColor: COLOR_GOLD,
    borderWidth: 0.5,
  });
  loreField.setFontSize(7.5);

  return await pdfDoc.save();
}

/**
 * Generates an Official D&D 5e Monster Manual / NPC Statblock PDF (A4)
 */
export async function generateOfficialStatblockPdf(
  character: CharacterEntity,
  lang: 'en' | 'it'
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const fontSansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const tr = (en: string, it: string) => (lang === 'it' ? it : en);

  // Parchment Card Background
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: height - 56,
    color: COLOR_PARCHMENT,
    borderColor: COLOR_CRIMSON,
    borderWidth: 2,
  });

  // Top & Bottom Orange-Gold Bar
  page.drawRectangle({
    x: 28,
    y: height - 36,
    width: width - 56,
    height: 8,
    color: COLOR_GOLD,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1,
  });
  page.drawRectangle({
    x: 28,
    y: 28,
    width: width - 56,
    height: 8,
    color: COLOR_GOLD,
    borderColor: COLOR_CRIMSON,
    borderWidth: 1,
  });

  const leftX = 48;
  let cursorY = height - 68;
  let textMaxW = width - 96;

  // Embed Portrait on Top-Right if available
  const embeddedImg = await tryEmbedPortrait(pdfDoc, character.portraitUrl);
  if (embeddedImg) {
    const imgBoxW = 135;
    const imgBoxH = 135;
    const imgX = width - 48 - imgBoxW;
    const imgY = height - 56 - imgBoxH;
    page.drawRectangle({
      x: imgX - 4,
      y: imgY - 4,
      width: imgBoxW + 8,
      height: imgBoxH + 8,
      color: COLOR_BOX_BG,
      borderColor: COLOR_CRIMSON,
      borderWidth: 1.5,
    });
    const dims = embeddedImg.scaleToFit(imgBoxW, imgBoxH);
    page.drawImage(embeddedImg, {
      x: imgX + (imgBoxW - dims.width) / 2,
      y: imgY + (imgBoxH - dims.height) / 2,
      width: dims.width,
      height: dims.height,
    });
    textMaxW = width - 96 - imgBoxW - 20;
  }

  // Name & Subtitle
  page.drawText(sanitizePdfText(character.name).toUpperCase(), {
    x: leftX,
    y: cursorY,
    size: 20,
    font: fontBold,
    color: COLOR_CRIMSON,
  });
  cursorY -= 16;

  const typeLine = `${character.size} ${character.creatureType}, ${character.alignment}${
    character.classOrArchetype ? ` - ${character.classOrArchetype}` : ''
  }`;
  page.drawText(sanitizePdfText(typeLine), {
    x: leftX,
    y: cursorY,
    size: 11,
    font: fontItalic,
    color: COLOR_DARK,
  });
  cursorY -= 14;

  page.drawText(sanitizePdfText(`${character.playerOrRole}  |  ${character.levelOrCr}`), {
    x: leftX,
    y: cursorY,
    size: 9.5,
    font: fontSansBold,
    color: COLOR_CRIMSON,
  });
  cursorY -= 12;

  // Tapered Rule
  const drawCrimsonRule = (y: number, w: number) => {
    page.drawLine({
      start: { x: leftX, y },
      end: { x: leftX + w, y },
      thickness: 2,
      color: COLOR_CRIMSON,
    });
  };

  drawCrimsonRule(cursorY, textMaxW);
  cursorY -= 16;

  // Core Vitals
  const vitalsLines: [string, string][] = [
    [tr('Armor Class', 'Classe Armatura'), `${character.ac} ${character.acNote || ''}`.trim()],
    [tr('Hit Points', 'Punti Ferita'), `${character.hpMax} (${character.hitDiceFormula})`],
    [
      tr('Speed & Initiative', 'Velocita & Iniziativa'),
      `${character.speed} (${tr('Init', 'Iniz')} ${formatSignedBonus(character.initiativeBonus)})`,
    ],
  ];

  for (const [label, val] of vitalsLines) {
    const lText = sanitizePdfText(`${label}: `);
    const lw = fontBold.widthOfTextAtSize(lText, 10.5);
    page.drawText(lText, { x: leftX, y: cursorY, size: 10.5, font: fontBold, color: COLOR_CRIMSON });
    page.drawText(sanitizePdfText(val), {
      x: leftX + lw,
      y: cursorY,
      size: 10.5,
      font: fontRegular,
      color: COLOR_DARK,
    });
    cursorY -= 14;
  }

  // If image was present, ensure we clear its bottom before full-width ability scores
  if (embeddedImg && cursorY > height - 205) {
    cursorY = height - 205;
  }

  const fullW = width - 96;
  drawCrimsonRule(cursorY, fullW);
  cursorY -= 16;

  // 6 Ability Scores Row
  const abColW = fullW / 6;
  DND_ABILITY_META.forEach((ab, idx) => {
    const score = character.abilities[ab.key];
    const ax = leftX + idx * abColW;
    const label = lang === 'it' ? ab.shortIt : ab.shortEn;
    page.drawText(label, {
      x: ax + 12,
      y: cursorY,
      size: 10,
      font: fontSansBold,
      color: COLOR_CRIMSON,
    });
    page.drawText(`${score} (${formatMod(score)})`, {
      x: ax + 6,
      y: cursorY - 13,
      size: 10,
      font: fontRegular,
      color: COLOR_DARK,
    });
  });
  cursorY -= 26;

  drawCrimsonRule(cursorY, fullW);
  cursorY -= 16;

  // Secondary Attributes (Saves, Skills, Resistances, Senses, Languages)
  const savesStr = character.savingThrows || formatProficientSavesSummary(character, lang);
  const skillsStr = character.skills || formatProficientSkillsSummary(character, lang);

  const secondaryRows: [string, string | undefined][] = [
    [tr('Saving Throws', 'Tiri Salvezza'), savesStr],
    [tr('Skills', 'Abilita'), skillsStr],
    [tr('Damage Resistances / Immunities', 'Resistenze / Immunita'), character.damageResistances],
    [
      tr('Senses', 'Sensi'),
      character.senses || `${tr('Passive Perception', 'Percezione Passiva')} ${character.passivePerception}`,
    ],
    [tr('Languages', 'Linguaggi'), character.languages],
    [tr('Challenge / Level', 'Grado di Sfida / Livello'), character.levelOrCr],
  ];

  for (const [label, val] of secondaryRows) {
    if (!val) continue;
    const prefix = `${sanitizePdfText(label)}: `;
    const pw = fontBold.widthOfTextAtSize(prefix, 10);
    page.drawText(prefix, { x: leftX, y: cursorY, size: 10, font: fontBold, color: COLOR_CRIMSON });
    const wrapped = wrapTextLines(val, fontRegular, 10, fullW - pw);
    wrapped.forEach((line, lIdx) => {
      page.drawText(line, {
        x: lIdx === 0 ? leftX + pw : leftX,
        y: cursorY,
        size: 10,
        font: fontRegular,
        color: COLOR_DARK,
      });
      cursorY -= 13;
    });
  }

  cursorY -= 4;
  drawCrimsonRule(cursorY, fullW);
  cursorY -= 16;

  const drawEntriesSection = (title: string | null, entries: CharacterEntity['traits']) => {
    if (!entries || entries.length === 0) return;
    if (title) {
      cursorY -= 4;
      page.drawText(sanitizePdfText(title).toUpperCase(), {
        x: leftX,
        y: cursorY,
        size: 12.5,
        font: fontBold,
        color: COLOR_CRIMSON,
      });
      page.drawLine({
        start: { x: leftX, y: cursorY - 3 },
        end: { x: leftX + fullW, y: cursorY - 3 },
        thickness: 1,
        color: COLOR_CRIMSON,
      });
      cursorY -= 16;
    }

    for (const entry of entries) {
      if (cursorY < 56) break;
      const combined = `${entry.name}. ${entry.description}`;
      const lines = wrapTextLines(combined, fontRegular, 10, fullW);
      lines.forEach((line, idx) => {
        if (cursorY < 48) return;
        if (idx === 0) {
          const namePart = `${sanitizePdfText(entry.name)}. `;
          const nw = fontBold.widthOfTextAtSize(namePart, 10);
          page.drawText(namePart, {
            x: leftX,
            y: cursorY,
            size: 10,
            font: fontBold,
            color: COLOR_CRIMSON,
          });
          const rest = line.slice(namePart.length);
          page.drawText(rest, {
            x: leftX + nw,
            y: cursorY,
            size: 10,
            font: fontRegular,
            color: COLOR_DARK,
          });
        } else {
          page.drawText(line, {
            x: leftX,
            y: cursorY,
            size: 10,
            font: fontRegular,
            color: COLOR_DARK,
          });
        }
        cursorY -= 13;
      });
      cursorY -= 4;
    }
  };

  drawEntriesSection(null, character.traits);
  drawEntriesSection(tr('Actions', 'Azioni'), character.actions);
  drawEntriesSection(
    tr('Reactions & Legendary Actions', 'Reazioni & Azioni Leggendarie'),
    character.reactionsOrLegendary || []
  );

  if ((character.spellsNotes || character.biographyOrLore) && cursorY > 80) {
    const extraEntries = [];
    if (character.spellsNotes) {
      extraEntries.push({
        name: tr('Spells & Notes', 'Incantesimi & Note'),
        description: character.spellsNotes,
      });
    }
    if (character.biographyOrLore) {
      extraEntries.push({
        name: tr('Lore & Roleplay', 'Background & Interpretazione'),
        description: character.biographyOrLore,
      });
    }
    drawEntriesSection(tr('Additional Lore & Notes', 'Note & Background'), extraEntries);
  }

  return await pdfDoc.save();
}

/**
 * Exports any CharacterEntity (PC, NPC, or Monster/Boss) to its Official D&D 5e PDF format
 * and triggers a file download.
 */
export async function downloadOfficialCharacterPdf(
  character: CharacterEntity,
  lang: 'en' | 'it',
  mode?: 'pc_sheet' | 'statblock',
  runtimeOverrides?: {
    playerOverride?: string;
    customNameOverride?: string;
    hpCurrent?: number;
    tempHp?: number;
    inspiration?: boolean;
    sessionNotes?: string;
  }
): Promise<void> {
  const effectiveMode = mode || (character.kind === 'pc' ? 'pc_sheet' : 'statblock');
  const bytes =
    effectiveMode === 'pc_sheet'
      ? await generateOfficialPcSheetPdf(character, lang, runtimeOverrides)
      : await generateOfficialStatblockPdf(character, lang);

  const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = (runtimeOverrides?.customNameOverride || character.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = effectiveMode === 'pc_sheet' ? '5e-character-sheet' : '5e-statblock';
  a.href = url;
  a.download = `${slug || 'character'}-${suffix}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
