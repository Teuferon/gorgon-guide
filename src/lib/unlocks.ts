import type { Ability, GameData, Recipe, Skill, SkillReward } from "./types";

export type UnlockKind = "recipe" | "ability" | "bonus" | "note";

export interface Unlock {
  level: number;
  kind: UnlockKind;
  /** Recipe name, ability name, bonus target skill name or the note text. */
  name: string;
  /** Internal name of the ability or skill, recipe ID for recipes. */
  ref?: string;
  note?: string;
  desc?: string;
}

export type UnlockData = {
  skills: Record<string, Skill>;
  recipes: Record<string, Recipe>;
  abilities: Record<string, Ability>;
};

const isOrcOnly = (r: SkillReward) => r.races?.length === 1 && r.races[0] === "Orc";

/** True for the Orc-only copy of an ability that also exists in a variant for the other races. */
function isOrcDuplicate(reward: SkillReward, all: SkillReward[]): boolean {
  if (!reward.ability || !isOrcOnly(reward)) return false;
  return all.some((r) => r !== reward && r.level === reward.level && r.ability && !isOrcOnly(r));
}

function toUnlock(reward: SkillReward, data: UnlockData): Unlock {
  if (reward.recipe !== undefined) {
    return {
      level: reward.level,
      kind: "recipe",
      name: data.recipes[String(reward.recipe)]?.name ?? `recept ${reward.recipe}`,
      ref: String(reward.recipe),
      note: reward.note,
    };
  }
  if (reward.ability) {
    const ab = data.abilities[reward.ability];
    return {
      level: reward.level,
      kind: "ability",
      name: ab?.name ?? reward.ability,
      ref: reward.ability,
      note: reward.note,
      desc: ab?.desc,
    };
  }
  if (reward.bonusToSkill) {
    return {
      level: reward.level,
      kind: "bonus",
      name: data.skills[reward.bonusToSkill]?.name ?? reward.bonusToSkill,
      ref: reward.bonusToSkill,
      note: reward.note,
    };
  }
  return { level: reward.level, kind: "note", name: reward.note ?? "" };
}

/**
 * Every reward of a skill in level order. Orc-only ability copies are dropped when the
 * other races have the same ability at that level, so each ability shows once.
 */
export function allRewards(data: UnlockData, skillKey: string): Unlock[] {
  const rewards = data.skills[skillKey]?.rewards ?? [];
  return rewards.filter((r) => !isOrcDuplicate(r, rewards)).map((r) => toUnlock(r, data));
}

/**
 * The next ability and recipe unlocks above the current level.
 * If there are none, falls back to bonus levels for other skills, so skills like Mycology
 * (bonus rewards only) still show something.
 */
export function nextUnlocks(data: UnlockData, skillKey: string, level: number, count = 3): Unlock[] {
  const upcoming = allRewards(data, skillKey).filter((u) => u.level > level);
  const main = upcoming.filter((u) => u.kind === "recipe" || u.kind === "ability");
  if (main.length > 0) return main.slice(0, count);
  return upcoming.filter((u) => u.kind === "bonus").slice(0, Math.min(count, 2));
}

export interface AdvancementHint {
  level: number;
  text: string;
}

/** All hints for raising the level cap, in level order. */
export function advancementHints(skill: Skill | undefined): AdvancementHint[] {
  return Object.entries(skill?.advancementHints ?? {})
    .map(([level, text]) => ({ level: Number(level), text }))
    .sort((a, b) => a.level - b.level);
}

/** The first hint at or above the current level, if any. */
export function nextAdvancementHint(skill: Skill | undefined, level: number): AdvancementHint | undefined {
  return advancementHints(skill).find((h) => h.level >= level);
}

/** NPC keys that train the skill, sorted by name. */
export function trainersFor(data: Pick<GameData, "npcs" | "trainersBySkill">, skillKey: string): string[] {
  return (data.trainersBySkill.get(skillKey) ?? [])
    .slice()
    .sort((a, b) => data.npcs[a].name.localeCompare(data.npcs[b].name));
}
