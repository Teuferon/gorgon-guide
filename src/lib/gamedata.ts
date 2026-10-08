import type { GameData, RawGameData, RecipeEntry } from "./types";

/** Builds the lookup indexes on top of the raw JSON. Pure, used by the loader and by tests. */
export function createGameData(raw: RawGameData): GameData {
  const recipesByRewardSkill = new Map<string, RecipeEntry[]>();
  const recipesByRequiredSkill = new Map<string, RecipeEntry[]>();
  const push = (m: Map<string, RecipeEntry[]>, k: string, r: RecipeEntry) => {
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  };
  for (const [id, recipe] of Object.entries(raw.recipes)) {
    const entry: RecipeEntry = { ...recipe, id };
    push(recipesByRequiredSkill, recipe.skill, entry);
    push(recipesByRewardSkill, recipe.xpSkill ?? recipe.skill, entry);
  }
  const byLevel = (a: RecipeEntry, b: RecipeEntry) => a.level - b.level || a.name.localeCompare(b.name);
  for (const m of [recipesByRewardSkill, recipesByRequiredSkill]) {
    for (const list of m.values()) list.sort(byLevel);
  }

  const trainersBySkill = new Map<string, string[]>();
  for (const [key, npc] of Object.entries(raw.npcs)) {
    for (const skill of npc.trains ?? []) {
      const list = trainersBySkill.get(skill);
      if (list) list.push(key);
      else trainersBySkill.set(skill, [key]);
    }
  }

  const itemsByKeyword = new Map<string, string[]>();
  for (const [id, item] of Object.entries(raw.items)) {
    for (const kw of item.keywords ?? []) {
      const list = itemsByKeyword.get(kw);
      if (list) list.push(id);
      else itemsByKeyword.set(kw, [id]);
    }
  }

  return { ...raw, recipesByRewardSkill, recipesByRequiredSkill, trainersBySkill, itemsByKeyword };
}
