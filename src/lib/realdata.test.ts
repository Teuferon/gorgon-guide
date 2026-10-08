// Smoke tests against the real trimmed data in src/data/. They catch schema changes after a data refresh.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createGameData } from "./gamedata";
import { DEFAULT_LEVELS, filterSkills } from "./skills";
import { describeRecipeSource, resolveIngredient, resolveRecipeSources, resolveTrainers } from "./sources";
import { nextUnlocks } from "./unlocks";
import { findTameable, findTrainingZones } from "./training";
import { resolveItemSource } from "./sources";
import { npcLocation } from "./wiki";
import { firstTimePlan, firstTimeRecipes, introRecipes, rankRecipes } from "./xp";
import type { RawGameData } from "./types";

const read = (name: string) => JSON.parse(readFileSync(new URL(`../data/${name}.json`, import.meta.url), "utf8"));
const data = createGameData({
  meta: read("meta"),
  skills: read("skills"),
  xptables: read("xptables"),
  recipes: read("recipes"),
  items: read("items"),
  recipeSources: read("recipe-sources"),
  itemSources: read("item-sources"),
  npcs: read("npcs"),
  areas: read("areas"),
  quests: read("quests"),
  abilities: read("abilities"),
  wiki: {
    meta: read("wiki-meta"),
    zones: read("wiki-zones"),
    monsters: read("wiki-monsters"),
    itemLocations: read("wiki-item-locations"),
    npcs: read("wiki-npcs"),
  },
} as RawGameData);

describe("real data", () => {
  it("has the skills the app tracks by default", () => {
    for (const k of ["Archery", "AnimalHandling", "Fletching", "Cooking", "Gardening", "Mycology", "Foraging"]) {
      expect(data.skills[k]?.name).toBeTruthy();
    }
  });

  it("ranks Cooking recipes at level 20 and resolves their ingredients and sources", () => {
    const levels = { Cooking: 20 };
    const ranked = rankRecipes(data.recipesByRewardSkill.get("Cooking")!, levels, "Cooking");
    expect(ranked.length).toBeGreaterThan(10);
    expect(ranked[0].xp).toBeGreaterThanOrEqual(ranked[1].xp);
    for (const r of ranked.slice(0, 20)) {
      for (const ing of r.recipe.ingredients ?? []) expect(resolveIngredient(data, ing).qty).toBeGreaterThan(0);
      expect(resolveRecipeSources(data, r.recipe.id).map(describeRecipeSource).length).toBeGreaterThan(0);
    }
    expect(firstTimeRecipes(data.recipesByRewardSkill.get("Cooking")!, levels, {}).length).toBeGreaterThan(0);
  });

  it("plans first-craft bonuses ahead and lists trainers for an unlearned skill", () => {
    const plan = firstTimePlan(data.recipesByRewardSkill.get("Cooking")!, { Cooking: 20 }, {});
    expect(plan.ahead).toHaveLength(5);
    expect(plan.ahead.every((r) => r.level > 20)).toBe(true);
    expect(resolveTrainers(data, "Fletching").map((t) => t.npcName)).toContain("Elahil");
    expect(introRecipes(data.recipesByRewardSkill.get("Fletching")!)).toHaveLength(5);
  });

  it("adds wiki prices, drops and NPC locations", () => {
    const salt = resolveItemSource(data, 5001);
    expect(salt.vendors.some((v) => v.price && v.price.url.startsWith("https://wiki.projectgorgon.com/wiki/"))).toBe(true);
    const feathers = resolveItemSource(data, 1139);
    expect(feathers.wiki?.drops.length).toBeGreaterThan(0);
    expect(feathers.wiki?.drops[0].url).toContain("https://wiki.projectgorgon.com/wiki/");
    expect(npcLocation(data, "NPC_Elahil")?.text).toContain("Serbule");
  });

  it("finds training spots for the starting levels", () => {
    expect(findTrainingZones(data.wiki, 20).length).toBeGreaterThan(0);
    expect(findTrainingZones(data.wiki, 20).some((z) => z.monsters.length > 0)).toBe(true);
    expect(findTameable(data.wiki, 15).length).toBeGreaterThan(0);
  });

  it("finds next unlocks for Archery at level 20", () => {
    const next = nextUnlocks(data, "Archery", DEFAULT_LEVELS.Archery);
    expect(next).toHaveLength(3);
    expect(next[0].level).toBeGreaterThan(20);
  });

  it("hides umbrella skills and keeps Druid", () => {
    const counts = new Map([...data.recipesByRewardSkill].map(([k, v]) => [k, v.length]));
    const keys = filterSkills(data.skills, counts, { query: "", showHidden: false }).map((r) => r.key);
    expect(keys).not.toContain("Anatomy");
    expect(keys).toContain("Druid");
    expect(keys).toContain("Mentalism");
  });
});
