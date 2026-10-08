import type { DropOff, GameData, RecipeEntry } from "./types";

export type Levels = Record<string, number>;

export const DEFAULT_USEFUL_THRESHOLD = 0.5;

/**
 * ESTIMATE, the formula is not verified against the game (docs/data-sources.md, gap 10).
 *
 * Reading used here: the recipe gives its full XP while the reward skill is below
 * dropOff.level. From dropOff.level on, the XP falls by `pct` of the base XP for every
 * `rate` levels, and the first step already applies at dropOff.level itself.
 * Example with the common values (pct 0.1, rate 5): 100 % below the drop-off level,
 * 90 % for 5 levels, 80 % for the next 5 and so on, down to 0.
 */
export function dropOffFactor(dropOff: DropOff | undefined, rewardLevel: number): number {
  if (!dropOff || dropOff.pct <= 0) return 1;
  if (rewardLevel < dropOff.level) return 1;
  const steps = dropOff.rate > 0 ? Math.floor((rewardLevel - dropOff.level) / dropOff.rate) + 1 : 1;
  return Math.max(0, 1 - dropOff.pct * steps);
}

/** Estimated XP of one craft at the given level of the reward skill. */
export function estimateXp(recipe: Pick<RecipeEntry, "xp" | "dropOff">, rewardLevel: number): number {
  return recipe.xp * dropOffFactor(recipe.dropOff, rewardLevel);
}

export interface RankedRecipe {
  recipe: RecipeEntry;
  /** Estimated XP per craft at the current level. */
  xp: number;
  /** Share of the base XP that is left (1 means no drop-off). */
  factor: number;
  /** True when factor is at or above the threshold. */
  useful: boolean;
}

/** Recipes that give XP, can be crafted at the given levels and exist in the game. */
function isCraftable(recipe: RecipeEntry, levels: Levels): boolean {
  if (recipe.notObtainable || recipe.noXp) return false;
  return (levels[recipe.skill] ?? 0) >= recipe.level;
}

/**
 * Recipes the player can craft at the current levels that still give XP, best first.
 * `recipes` are the recipes rewarding `rewardSkill`. The requirement is checked against the
 * level of the recipe's own skill, the drop-off against the level of the reward skill.
 */
export function rankRecipes(
  recipes: RecipeEntry[],
  levels: Levels,
  rewardSkill: string,
  threshold: number = DEFAULT_USEFUL_THRESHOLD,
): RankedRecipe[] {
  const rewardLevel = levels[rewardSkill] ?? 0;
  const ranked: RankedRecipe[] = [];
  for (const recipe of recipes) {
    if (recipe.xp <= 0 || !isCraftable(recipe, levels)) continue;
    const factor = dropOffFactor(recipe.dropOff, rewardLevel);
    if (factor <= 0) continue;
    ranked.push({ recipe, xp: recipe.xp * factor, factor, useful: factor >= threshold });
  }
  ranked.sort((a, b) => b.xp - a.xp || b.recipe.level - a.recipe.level || a.recipe.name.localeCompare(b.recipe.name));
  return ranked;
}

/** Recipes with a first-time bonus the player can craft now, biggest bonus first. */
export function firstTimeRecipes(
  recipes: RecipeEntry[],
  levels: Levels,
  done: Record<string, unknown>,
  showDone = false,
): RecipeEntry[] {
  return recipes
    .filter((r) => r.xpFirst > 0 && isCraftable(r, levels) && (showDone || !done[r.id]))
    .sort((a, b) => b.xpFirst - a.xpFirst || b.level - a.level || a.name.localeCompare(b.name));
}

/** XP needed to go from `level` to `level + 1`, or undefined past the end of the table. */
export function xpToNextLevel(
  data: Pick<GameData, "skills" | "xptables">,
  skill: string,
  level: number,
): number | undefined {
  const tableName = data.skills[skill]?.xpTable;
  const table = tableName ? data.xptables[tableName] : undefined;
  return table?.[level];
}

export interface LevelBand {
  from: number;
  to: number;
  recipes: RecipeEntry[];
}

/** Groups recipes into level bands of `size` levels (0 to 9, 10 to 19, ...), skipping empty bands. */
export function groupByLevelBand(recipes: RecipeEntry[], size = 10): LevelBand[] {
  const bands = new Map<number, RecipeEntry[]>();
  for (const r of recipes) {
    const from = Math.floor(r.level / size) * size;
    const list = bands.get(from);
    if (list) list.push(r);
    else bands.set(from, [r]);
  }
  return [...bands.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([from, list]) => ({ from, to: from + size - 1, recipes: list }));
}
