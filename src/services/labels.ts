/**
 * Labels are free-text tags stored in the `tags` array of assets, characters (PCs, NPCs, monsters),
 * sound effects and scene encounters. They are unrelated to the `@entity[...]` markdown references used in story text.
 * These helpers are shared by every entity list so labels behave identically everywhere.
 */

/** Trim, drop empties and de-duplicate case-insensitively (first spelling wins). */
export function normalizeLabels(labels: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of labels) {
    const label = String(raw).trim().replace(/\s+/g, ' ');
    const key = label.toLowerCase();
    if (!label || seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

/** Every distinct label across the given entity lists, sorted alphabetically, with usage counts. */
export function collectLabels(
  ...lists: ReadonlyArray<ReadonlyArray<{ tags?: string[] }>>
): { label: string; count: number }[] {
  const counts = new Map<string, { label: string; count: number }>();
  for (const list of lists) {
    for (const item of list) {
      for (const label of normalizeLabels(item.tags ?? [])) {
        const key = label.toLowerCase();
        const entry = counts.get(key);
        if (entry) entry.count += 1;
        else counts.set(key, { label, count: 1 });
      }
    }
  }
  return [...counts.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** True when the entity carries every selected label (case-insensitive). No selection matches all. */
export function hasAllLabels(tags: readonly string[] | undefined, selected: readonly string[]): boolean {
  if (selected.length === 0) return true;
  const own = new Set((tags ?? []).map((t) => t.trim().toLowerCase()));
  return selected.every((s) => own.has(s.trim().toLowerCase()));
}

/** Add a label to a filter selection unless it is already there (case-insensitive). */
export function addLabelFilter(selected: readonly string[], label: string): string[] {
  return selected.some((s) => s.toLowerCase() === label.toLowerCase()) ? [...selected] : [...selected, label];
}
