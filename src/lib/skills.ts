import type { Skill } from "./types";

export const DEFAULT_LEVELS: Record<string, number> = {
  Archery: 20,
  AnimalHandling: 15,
};

export const DEFAULT_TRACKED: string[] = [
  "Archery",
  "AnimalHandling",
  "Fletching",
  "Cooking",
  "Gardening",
  "Mycology",
  "Foraging",
];

/**
 * Skill filter for the "Moje skilly" list. A skill is a player skill when
 *  1. it has an XP table. Umbrella skills (Anatomy, Genetics, Performance, Phrenology,
 *     Augmentation, Cosmetology) have "xpTable: None" in the data and cannot be leveled,
 *  2. and it has content: at least one reward (ability, recipe, bonus level, note) or one
 *     recipe. Skills with neither (Axe, Autodidacticism, Cartography, Notoriety and a few
 *     more) are placeholders for features the game does not use yet.
 * Skills the game hides at level 0 (hideWhenZero, for example Druid) are kept, because the
 * player has to start them somewhere.
 * The list offers a switch to show the filtered skills as well.
 */
export function isPlayerSkill(skill: Skill, recipeCount: number): boolean {
  if (!skill.xpTable) return false;
  return (skill.rewards?.length ?? 0) > 0 || recipeCount > 0;
}

export interface SkillRow {
  key: string;
  skill: Skill;
  /** False when the filter would hide the skill. */
  player: boolean;
}

export interface SkillFilter {
  query: string;
  showHidden: boolean;
  /** Skills that stay visible regardless of the filter (tracked, level above 0). */
  keep?: (key: string) => boolean;
}

export function filterSkills(
  skills: Record<string, Skill>,
  recipeCounts: Map<string, number>,
  filter: SkillFilter,
): SkillRow[] {
  const q = filter.query.trim().toLowerCase();
  const rows: SkillRow[] = [];
  for (const [key, skill] of Object.entries(skills)) {
    const player = isPlayerSkill(skill, recipeCounts.get(key) ?? 0);
    if (!player && !filter.showHidden && !filter.keep?.(key)) continue;
    if (q && !skill.name.toLowerCase().includes(q) && !key.toLowerCase().includes(q)) continue;
    rows.push({ key, skill, player });
  }
  rows.sort((a, b) => a.skill.name.localeCompare(b.skill.name));
  return rows;
}

export function groupByCombat(rows: SkillRow[]): { combat: SkillRow[]; other: SkillRow[] } {
  return {
    combat: rows.filter((r) => r.skill.combat),
    other: rows.filter((r) => !r.skill.combat),
  };
}

/** Czech plural: 1 recept, 2 až 4 recepty, jinak receptů. */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}
