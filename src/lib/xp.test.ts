import { describe, expect, it } from "vitest";
import { fixtureData } from "./fixture";
import { dropOffFactor, estimateXp, firstTimeRecipes, groupByLevelBand, rankRecipes, xpToNextLevel } from "./xp";

const data = fixtureData();
const cooking = data.recipesByRewardSkill.get("Cooking")!;

describe("dropOffFactor", () => {
  const d = { level: 10, pct: 0.1, rate: 5 };
  it("is 1 without drop-off data or below the drop-off level", () => {
    expect(dropOffFactor(undefined, 50)).toBe(1);
    expect(dropOffFactor({ level: 0, pct: 0, rate: 0 }, 50)).toBe(1);
    expect(dropOffFactor(d, 9)).toBe(1);
  });
  it("loses pct per rate levels from the drop-off level", () => {
    expect(dropOffFactor(d, 10)).toBeCloseTo(0.9);
    expect(dropOffFactor(d, 14)).toBeCloseTo(0.9);
    expect(dropOffFactor(d, 15)).toBeCloseTo(0.8);
    expect(dropOffFactor(d, 30)).toBeCloseTo(0.5);
  });
  it("never goes below 0", () => {
    expect(dropOffFactor(d, 200)).toBe(0);
  });
  it("estimateXp scales the base XP", () => {
    expect(estimateXp({ xp: 100, dropOff: d }, 15)).toBeCloseTo(80);
  });
});

describe("rankRecipes", () => {
  it("lists only craftable recipes with XP, best first", () => {
    const ranked = rankRecipes(cooking, { Cooking: 10, Alchemy: 5 }, "Cooking");
    expect(ranked.map((r) => r.recipe.name)).toEqual(["Mid", "Cross", "Easy"]);
  });
  it("drops recipes the level does not allow and the unobtainable ones", () => {
    const names = rankRecipes(cooking, { Cooking: 0 }, "Cooking").map((r) => r.recipe.name);
    expect(names).toEqual(["Easy"]);
  });
  it("checks the requirement against the recipe skill, not the reward skill", () => {
    const withoutAlchemy = rankRecipes(cooking, { Cooking: 10 }, "Cooking").map((r) => r.recipe.name);
    expect(withoutAlchemy).not.toContain("Cross");
  });
  it("flags low-XP recipes and removes the ones at 0", () => {
    // Easy: drop-off from level 10, at level 30 the factor is 0.5 (threshold) and at 60 it is 0
    const at30 = rankRecipes(cooking, { Cooking: 30, Alchemy: 5 }, "Cooking", 0.7).find((r) => r.recipe.name === "Easy")!;
    expect(at30.factor).toBeCloseTo(0.5);
    expect(at30.useful).toBe(false);
    const at60 = rankRecipes(cooking, { Cooking: 60 }, "Cooking").map((r) => r.recipe.name);
    expect(at60).not.toContain("Easy");
  });
});

describe("firstTimeRecipes", () => {
  it("lists craftable recipes with a bonus and hides done ones", () => {
    const levels = { Cooking: 10, Alchemy: 5 };
    expect(firstTimeRecipes(cooking, levels, {}).map((r) => r.name)).toEqual(["Mid", "Cross", "Zero XP", "Easy"]);
    expect(firstTimeRecipes(cooking, levels, { "2": true }).map((r) => r.name)).not.toContain("Mid");
    expect(firstTimeRecipes(cooking, levels, { "2": true }, true).map((r) => r.name)).toContain("Mid");
  });
});

describe("groupByLevelBand", () => {
  it("groups by ten levels and skips empty bands", () => {
    const bands = groupByLevelBand(cooking);
    expect(bands.map((b) => [b.from, b.to])).toEqual([[0, 9], [10, 19], [30, 39]]);
  });
});

describe("xpToNextLevel", () => {
  it("reads the table at the current level", () => {
    expect(xpToNextLevel(data, "Cooking", 0)).toBe(10);
    expect(xpToNextLevel(data, "Cooking", 2)).toBe(30);
    expect(xpToNextLevel(data, "Cooking", 3)).toBeUndefined();
    expect(xpToNextLevel(data, "Anatomy", 0)).toBeUndefined();
  });
});
