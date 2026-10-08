import { describe, expect, it } from "vitest";
import { fixtureData } from "./fixture";
import { filterSkills, groupByCombat, isPlayerSkill, plural } from "./skills";

const data = fixtureData();
const counts = new Map([...data.recipesByRewardSkill].map(([k, v]) => [k, v.length]));

describe("isPlayerSkill", () => {
  it("rejects umbrella skills without an XP table and skills without content", () => {
    expect(isPlayerSkill(data.skills.Anatomy, 0)).toBe(false);
    expect(isPlayerSkill(data.skills.Axe, 0)).toBe(false);
  });
  it("accepts skills with rewards or recipes", () => {
    expect(isPlayerSkill(data.skills.Archery, 0)).toBe(true);
    expect(isPlayerSkill(data.skills.Alchemy, 3)).toBe(true);
  });
});

describe("filterSkills", () => {
  it("hides placeholder skills unless asked or kept", () => {
    const keys = (r: ReturnType<typeof filterSkills>) => r.map((x) => x.key);
    expect(keys(filterSkills(data.skills, counts, { query: "", showHidden: false }))).not.toContain("Axe");
    expect(keys(filterSkills(data.skills, counts, { query: "", showHidden: true }))).toContain("Axe");
    expect(keys(filterSkills(data.skills, counts, { query: "", showHidden: false, keep: (k) => k === "Axe" }))).toContain("Axe");
  });
  it("searches by name case-insensitively and sorts by name", () => {
    const rows = filterSkills(data.skills, counts, { query: "COOK", showHidden: false });
    expect(rows.map((r) => r.key)).toEqual(["Cooking"]);
  });
  it("splits combat and other skills", () => {
    const { combat, other } = groupByCombat(filterSkills(data.skills, counts, { query: "", showHidden: true }));
    expect(combat.map((r) => r.key)).toContain("Archery");
    expect(other.map((r) => r.key)).toContain("Cooking");
  });
});

describe("plural", () => {
  it("follows Czech forms", () => {
    expect([1, 3, 5].map((n) => plural(n, "recept", "recepty", "receptů"))).toEqual(["recept", "recepty", "receptů"]);
  });
});
