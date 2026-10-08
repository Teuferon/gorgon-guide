import { describe, expect, it } from "vitest";
import { fixtureData } from "./fixture";
import { formatPrice, npcLocation, priceInfo, resolveWikiItem, wikiBuys, wikiUrl } from "./wiki";

const data = fixtureData();

describe("wikiUrl", () => {
  it("uses underscores for spaces and escapes slashes", () => {
    expect(wikiUrl(data.wiki, "Cheap Beef")).toBe("https://wiki.example/wiki/Cheap_Beef");
    expect(wikiUrl(data.wiki, "Chef/Items sold")).toBe("https://wiki.example/wiki/Chef%2FItems_sold");
  });
});

describe("npcLocation", () => {
  it("joins zone, town and place", () => {
    expect(npcLocation(data, "NPC_Chef")?.text).toBe("Town, Chef's Kitchen: Next to the oven");
  });
  it("works with only a zone and returns undefined for unknown NPCs", () => {
    expect(npcLocation(data, "NPC_Smith")).toEqual({ text: "Town", url: "https://wiki.example/wiki/Smith" });
    expect(npcLocation(data, "NPC_Nobody")).toBeUndefined();
  });
});

describe("prices", () => {
  it("computes the price per piece and formats it", () => {
    const p = priceInfo(data.wiki, { npc: "Chef", cost: 37, qty: 5 });
    expect(p.perUnit).toBeCloseTo(7.4);
    expect(formatPrice(p)).toBe("37 councils for 5 (7.4 each)");
    expect(formatPrice(priceInfo(data.wiki, { npc: "X", cost: 7, currency: "gold" }))).toBe("7 gold");
    expect(p.url).toBe("https://wiki.example/wiki/Chef%2FItems_sold");
  });
  it("sorts councils before gold, cheapest first", () => {
    expect(wikiBuys(data, 100).map((b) => b.buy.npc)).toEqual(["Chef", "Peddler", "Gold Seller"]);
  });
});

describe("resolveWikiItem", () => {
  it("lists drops with their zone, the total and a link", () => {
    const info = resolveWikiItem(data, 100)!;
    expect(info.drops).toEqual([
      { mob: "Rat", zone: "Starter", rarity: undefined, url: "https://wiki.example/wiki/Rat" },
      { mob: "Wolf", zone: "Middle", rarity: "common", url: "https://wiki.example/wiki/Wolf" },
    ]);
    expect(info.dropTotal).toBe(7);
    expect(info.url).toBe("https://wiki.example/wiki/Salt");
  });
  it("returns nothing when the wiki knows no location", () => {
    expect(resolveWikiItem(data, 999)).toBeUndefined();
    expect(resolveWikiItem(data, 200)).toBeUndefined();
  });
});
