import { createGameData } from "./gamedata";
import type { RawGameData, Recipe } from "./types";

const recipe = (r: Partial<Recipe> & Pick<Recipe, "name" | "skill" | "level" | "xp">): Recipe => ({
  internal: r.name.replace(/\s/g, ""),
  xpFirst: r.xp * 4,
  ...r,
});

/** Small hand-made data set for the unit tests. */
export function fixtureData() {
  const raw: RawGameData = {
    meta: { gameDataVersion: "0", generatedAt: "", source: "", iconUrlTemplate: "", copyright: "", counts: {} },
    skills: {
      Cooking: {
        id: 1,
        name: "Cooking",
        xpTable: "T",
        advancementHints: { "60": "later", "50": "gain favor with Someone" },
        rewards: [
          { level: 5, recipe: 4 },
          { level: 10, bonusToSkill: "Fletching" },
          { level: 20, recipe: 5 },
          { level: 30, recipe: 6 },
          { level: 40, recipe: 7 },
        ],
      },
      Archery: {
        id: 2,
        name: "Archery",
        combat: true,
        xpTable: "T",
        rewards: [
          { level: 1, ability: "Shot1", races: ["Human"] },
          { level: 1, ability: "OrcShot1", races: ["Orc"] },
          { level: 4, ability: "Aimed1", races: ["Human"] },
          { level: 4, ability: "OrcAimed1", races: ["Orc"] },
        ],
      },
      Mycology: { id: 3, name: "Mycology", xpTable: "T", rewards: [{ level: 10, bonusToSkill: "Alchemy" }, { level: 20, bonusToSkill: "Pig" }] },
      Anatomy: { id: 4, name: "Anatomy", umbrella: true },
      Axe: { id: 5, name: "Axe", combat: true, xpTable: "T" },
      Fletching: { id: 6, name: "Fletching", xpTable: "T" },
      Alchemy: { id: 7, name: "Alchemy", xpTable: "T" },
      Pig: { id: 8, name: "Pig", xpTable: "T" },
    },
    xptables: { T: [10, 20, 30] },
    recipes: {
      "1": recipe({ name: "Easy", skill: "Cooking", level: 0, xp: 10, dropOff: { level: 10, pct: 0.1, rate: 5 }, ingredients: [{ id: 100, name: "Salt", qty: 1 }, { id: 101, name: "Meat", qty: 2 }, { keywords: ["CheapMeat"], name: "Cheap Meat", qty: 1 }] }),
      "2": recipe({ name: "Mid", skill: "Cooking", level: 10, xp: 40, dropOff: { level: 20, pct: 0.1, rate: 5 } }),
      "3": recipe({ name: "Hard", skill: "Cooking", level: 30, xp: 120 }),
      "4": recipe({ name: "Zero XP", skill: "Cooking", level: 0, xp: 0, xpFirst: 100 }),
      "5": recipe({ name: "Hidden", skill: "Cooking", level: 0, xp: 50, notObtainable: true }),
      "6": recipe({ name: "No XP", skill: "Cooking", level: 0, xp: 50, noXp: true }),
      "7": recipe({ name: "Cross", skill: "Alchemy", level: 5, xp: 30, xpSkill: "Cooking" }),
    },
    items: {
      "100": { name: "Salt", value: 3, stack: 100, icon: 1 },
      "101": { name: "Raw Meat", value: 7, stack: 10, icon: 2 },
      "102": { name: "Cheap Beef", value: 2, stack: 10, icon: 3, keywords: ["CheapMeat"] },
      "103": { name: "Cheap Pork", value: 1, stack: 10, icon: 4, keywords: ["CheapMeat"] },
      "200": { name: "Cookbook", value: 50, stack: 1, icon: 5 },
    },
    recipeSources: {
      "1": { training: ["NPC_Chef"] },
      "2": { skill: [{ skill: "Cooking", level: 10 }] },
      "3": { quest: [9], item: [200] },
    },
    itemSources: {
      "100": { vendor: ["NPC_Chef", "NPC_Missing"], recipe: [1] },
      "101": { other: ["Monster", "CorpseButchering", "Effect"], recipe: [1, 2, 3] },
      "102": { other: ["ResourceInteractor:(This entity is no longer used)"] },
    },
    npcs: {
      NPC_Chef: { name: "Chef", area: "AreaTown", storeFavor: "Comfortable", services: ["Store"], trains: ["Cooking"], trainFavor: "Neutral" },
      NPC_Smith: { name: "Smith", area: "AreaTown", services: [], trains: ["Cooking", "Archery"] },
    },
    areas: { AreaTown: "Town" },
    quests: { "9": { name: "Feed the King", npc: "AreaTown/NPC_Chef", location: "Town" } },
    abilities: {
      Shot1: { name: "Shot", skill: "Archery", level: 1 },
      OrcShot1: { name: "Shot", skill: "Archery", level: 1 },
      Aimed1: { name: "Aimed Shot", skill: "Archery", level: 4 },
      OrcAimed1: { name: "Aimed Shot", skill: "Archery", level: 4 },
    },
  };
  return createGameData(raw);
}
