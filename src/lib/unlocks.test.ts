import { describe, expect, it } from "vitest";
import { fixtureData } from "./fixture";
import { advancementHints, allRewards, nextAdvancementHint, nextUnlocks, trainersFor } from "./unlocks";

const data = fixtureData();

describe("nextUnlocks", () => {
  it("returns the next recipes and abilities above the level, in order", () => {
    const next = nextUnlocks(data, "Cooking", 5, 2);
    expect(next.map((u) => [u.level, u.name])).toEqual([[20, "Hidden"], [30, "No XP"]]);
  });
  it("does not repeat Orc copies of abilities", () => {
    const next = nextUnlocks(data, "Archery", 0, 3);
    expect(next.map((u) => u.ref)).toEqual(["Shot1", "Aimed1"]);
  });
  it("falls back to bonus levels when a skill has no ability or recipe rewards", () => {
    const next = nextUnlocks(data, "Mycology", 0, 3);
    expect(next.map((u) => [u.kind, u.name])).toEqual([["bonus", "Alchemy"], ["bonus", "Pig"]]);
  });
  it("returns nothing past the last reward", () => {
    expect(nextUnlocks(data, "Cooking", 99)).toEqual([]);
  });
});

describe("allRewards", () => {
  it("keeps bonus rewards in the timeline", () => {
    expect(allRewards(data, "Cooking").some((u) => u.kind === "bonus")).toBe(true);
  });
});

describe("advancement hints", () => {
  it("sorts by level and finds the next one", () => {
    const skill = data.skills.Cooking;
    expect(advancementHints(skill).map((h) => h.level)).toEqual([50, 60]);
    expect(nextAdvancementHint(skill, 20)?.level).toBe(50);
    expect(nextAdvancementHint(skill, 50)?.level).toBe(50);
    expect(nextAdvancementHint(skill, 61)).toBeUndefined();
  });
});

describe("trainersFor", () => {
  it("lists NPCs that train the skill", () => {
    expect(trainersFor(data, "Cooking")).toEqual(["NPC_Chef", "NPC_Smith"]);
    expect(trainersFor(data, "Fletching")).toEqual([]);
  });
});
