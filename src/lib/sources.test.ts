import { describe, expect, it } from "vitest";
import { fixtureData } from "./fixture";
import { describeRecipeSource, resolveIngredient, resolveItemSource, resolveRecipeSources, resolveTrainers } from "./sources";

const data = fixtureData();

describe("resolveItemSource", () => {
  it("prefers vendors over other sources and skips NPCs missing from the data", () => {
    const s = resolveItemSource(data, 100);
    expect(s.labels).toEqual([]);
    expect(s.vendors.map((v) => v.npcName)).toEqual(["Chef", "Peddler", "Gold Seller"]);
  });
  it("adds wiki prices and locations on top of the official vendor and prefers the wiki favor", () => {
    const [chef, peddler, gold] = resolveItemSource(data, 100).vendors;
    expect(chef).toMatchObject({ npc: "NPC_Chef", areaName: "Town", favor: "Neutral" });
    expect(chef.price).toMatchObject({ cost: 37, qty: 5, currency: "councils" });
    expect(chef.price!.perUnit).toBeCloseTo(7.4);
    expect(chef.location).toEqual({ text: "Town, Chef's Kitchen: Next to the oven", url: "https://wiki.example/wiki/Chef" });
    expect(peddler).toMatchObject({ npc: "", npcName: "Peddler", areaName: "Hills" });
    expect(gold.price!.currency).toBe("gold");
  });
  it("labels other sources and drops the useless ones", () => {
    const s = resolveItemSource(data, 101);
    expect(s.vendors).toEqual([]);
    expect(s.labels).toEqual(["monster drop", "butchering corpses", "crafted from recipe Easy, Mid and 1 more"]);
  });
  it("attaches wiki drop and gathering facts", () => {
    const s = resolveItemSource(data, 101);
    expect(s.wiki?.skin.map((d) => d.mob)).toEqual(["Wolf"]);
    expect(s.wiki?.gather[0]).toMatchObject({ skill: "Foraging", level: 5, zones: ["Starter", "Middle"] });
  });
  it("uses wiki-only knowledge instead of the missing-source label", () => {
    const s = resolveItemSource(data, 102);
    expect(s.labels).toEqual([]);
    expect(s.wiki?.drops[0].mob).toBe("Ghost");
  });
  it("falls back when the item is unknown everywhere", () => {
    expect(resolveItemSource(data, 999).labels).toEqual(["source not in the data"]);
  });
});

describe("resolveIngredient", () => {
  it("keeps the base value next to the vendors", () => {
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
    expect(resolveRecipeSources(data, 1).map(describeRecipeSource)).toEqual(["trainer Chef (Town)"]);
    expect(resolveRecipeSources(data, 2).map(describeRecipeSource)).toEqual(["reward for reaching level 10 in Cooking"]);
    expect(resolveRecipeSources(data, 3).map(describeRecipeSource)).toEqual([
      'quest "Feed the King" (Chef, Town)',
      "taught by the item Cookbook",
    ]);
  });
  it("adds the wiki location of a trainer", () => {
    const [s] = resolveRecipeSources(data, 1);
    expect(s.kind === "training" && s.location?.text).toBe("Town, Chef's Kitchen: Next to the oven");
  });
  it("reports a missing source", () => {
    expect(resolveRecipeSources(data, 5)).toEqual([{ kind: "unknown" }]);
  });
});

describe("resolveTrainers", () => {
  it("lists trainers with the wiki location", () => {
    const trainers = resolveTrainers(data, "Cooking");
    expect(trainers.map((t) => t.npcName)).toEqual(["Chef", "Smith"]);
    expect(trainers[0].location?.url).toBe("https://wiki.example/wiki/Chef");
    expect(trainers[0].favor).toBeUndefined();
  });
});
