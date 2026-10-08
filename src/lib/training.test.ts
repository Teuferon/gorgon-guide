import { describe, expect, it } from "vitest";
import { fixtureData } from "./fixture";
import { findTameable, findTrainingZones } from "./training";

const { wiki } = fixtureData();

describe("findTrainingZones", () => {
  it("includes zones that contain the level and zones a little away, closest first", () => {
    const zones = findTrainingZones(wiki, 5);
    expect(zones.map((z) => [z.name, z.distance])).toEqual([["Starter", 0], ["Middle", 5]]);
  });
  it("lists monsters by how close their loot level is, with links", () => {
    const starter = findTrainingZones(wiki, 5)[0];
    expect(starter.monsters.map((m) => [m.name, m.level])).toEqual([["Rat", 3], ["Wolf", 8]]);
    expect(starter.monsters[0].url).toBe("https://wiki.example/wiki/Rat");
    expect(starter.url).toBe("https://wiki.example/wiki/Starter");
  });
  it("skips zones without a level range, without monsters or too far away", () => {
    const names = findTrainingZones(wiki, 20).map((z) => z.name);
    expect(names).not.toContain("Sewer");
    expect(names).not.toContain("Empty");
    expect(names).not.toContain("High");
  });
  it("ranks zones with known monsters first and flags zones without monster levels", () => {
    const zones = findTrainingZones(wiki, 20);
    expect(zones.map((z) => z.name)).toEqual(["Middle", "Vague"]);
    expect(zones[0].monsters.map((m) => m.name)).toEqual(["Bear"]);
    expect(zones[1].noMonsterLevels).toBe(true);
  });
  it("respects the limits", () => {
    expect(findTrainingZones(wiki, 5, { maxZones: 1 })).toHaveLength(1);
    expect(findTrainingZones(wiki, 5, { maxMonsters: 1 })[0].monsters).toHaveLength(1);
  });
});

describe("findTameable", () => {
  it("lists animals near the level, highest tame level first", () => {
    expect(findTameable(wiki, 15).map((t) => [t.name, t.tameLevel])).toEqual([["Cat", 20], ["Tiger", 16]]);
  });
  it("adds the zone and links", () => {
    const [cat] = findTameable(wiki, 15);
    expect(cat).toMatchObject({
      zone: "Middle",
      petType: "Big Cat",
      url: "https://wiki.example/wiki/Cat",
      zoneUrl: "https://wiki.example/wiki/Middle_Lands",
    });
  });
  it("returns nothing when no animal is near", () => {
    expect(findTameable(wiki, 100)).toEqual([]);
  });
});
