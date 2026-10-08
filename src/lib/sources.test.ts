import { describe, expect, it } from "vitest";
import { fixtureData } from "./fixture";
import { describeRecipeSource, resolveIngredient, resolveItemSource, resolveRecipeSources } from "./sources";

const data = fixtureData();

describe("resolveItemSource", () => {
  it("prefers vendors and skips NPCs missing from the data", () => {
    const s = resolveItemSource(data, 100);
    expect(s.labels).toEqual([]);
    expect(s.vendors).toEqual([{ npc: "NPC_Chef", npcName: "Chef", areaName: "Town", favor: "Comfortable" }]);
  });
  it("labels other sources in Czech and drops the useless ones", () => {
    const s = resolveItemSource(data, 101);
    expect(s.vendors).toEqual([]);
    expect(s.labels).toEqual(["drop z monster", "porcování těl", "craft z receptu Easy, Mid a 1 dalších"]);
  });
  it("falls back when only an unused source exists or the item is unknown", () => {
    expect(resolveItemSource(data, 102).labels).toEqual(["zdroj není v datech"]);
    expect(resolveItemSource(data, 999).labels).toEqual(["zdroj není v datech"]);
  });
});

describe("resolveIngredient", () => {
  it("returns the base value, not a price", () => {
    const ing = resolveIngredient(data, { id: 100, name: "Salt", qty: 1 });
    expect(ing).toMatchObject({ kind: "item", name: "Salt", baseValue: 3, qty: 1 });
  });
  it("lists the cheapest matching items for a keyword ingredient", () => {
    const ing = resolveIngredient(data, { keywords: ["CheapMeat"], name: "Cheap Meat", qty: 1 });
    expect(ing.kind).toBe("keyword");
    if (ing.kind === "keyword") expect(ing.examples.map((e) => e.name)).toEqual(["Cheap Pork", "Cheap Beef"]);
  });
});

describe("resolveRecipeSources", () => {
  it("describes trainers, skill rewards, quests and items", () => {
    expect(resolveRecipeSources(data, 1).map(describeRecipeSource)).toEqual(["trenér Chef (Town)"]);
    expect(resolveRecipeSources(data, 2).map(describeRecipeSource)).toEqual(["odměna za level 10 ve skillu Cooking"]);
    expect(resolveRecipeSources(data, 3).map(describeRecipeSource)).toEqual([
      "quest „Feed the King“ (Chef, Town)",
      "z položky Cookbook",
    ]);
  });
  it("reports a missing source", () => {
    expect(resolveRecipeSources(data, 5)).toEqual([{ kind: "unknown" }]);
  });
});
