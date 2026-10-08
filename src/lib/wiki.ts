import type { GameData, WikiBuy, WikiData, WikiItemLocation } from "./types";

/**
 * Helpers for the community data from the wiki (src/data/wiki-*.json, docs/wiki-data.md).
 * Everything built here carries the URL of its wiki page, so the UI can link every fact.
 */

export type WikiSource = Pick<GameData, "wiki">;

/** Page URL from a title. The wiki uses underscores for spaces. */
export function wikiUrl(wiki: WikiData, title: string): string {
  return wiki.meta.pageUrlTemplate.replace("{title}", encodeURIComponent(title.replace(/ /g, "_")));
}

export interface NpcLocation {
  /** For example "Serbule, Serbule Keep: around the eastern gate". */
  text: string;
  url: string;
}

/** Where an NPC stands according to the wiki. Undefined when the wiki has no entry. */
export function npcLocation(data: WikiSource, npcKey: string): NpcLocation | undefined {
  const n = data.wiki.npcs[npcKey];
  if (!n) return undefined;
  const place = [n.zone, n.town && n.town !== n.zone ? n.town : undefined].filter(Boolean).join(", ");
  const detail = n.location?.trim().replace(/\.$/, "");
  const text = [place, detail].filter(Boolean).join(": ");
  if (!text) return undefined;
  return { text, url: wikiUrl(data.wiki, n.wiki) };
}

export interface PriceInfo {
  cost: number;
  qty: number;
  currency: string;
  /** Cost per piece, for sorting and display. */
  perUnit: number;
  favor?: string;
  /** The vendor's "Items sold" page. */
  url: string;
}

export function priceInfo(wiki: WikiData, buy: WikiBuy): PriceInfo {
  const qty = buy.qty && buy.qty > 0 ? buy.qty : 1;
  return {
    cost: buy.cost,
    qty,
    currency: buy.currency ?? "councils",
    perUnit: buy.cost / qty,
    favor: buy.favor,
    url: wikiUrl(wiki, `${buy.npc}/Items sold`),
  };
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** "7 councils" or "37 councils for 5 (7.4 each)". */
export function formatPrice(p: PriceInfo): string {
  if (p.qty === 1) return `${num(p.cost)} ${p.currency}`;
  return `${num(p.cost)} ${p.currency} for ${p.qty} (${num(p.perUnit)} each)`;
}

export interface DropInfo {
  mob: string;
  /** First zone the wiki lists for the monster. */
  zone?: string;
  rarity?: string;
  url: string;
}

export interface GatherInfo {
  skill: string;
  level?: number;
  zones: string[];
  where?: string;
}

export interface WikiItemInfo {
  /** Wiki page of the item. */
  url: string;
  drops: DropInfo[];
  /** All monsters that drop it, as reported on the wiki. */
  dropTotal: number;
  skin: DropInfo[];
  butcher: DropInfo[];
  gather: GatherInfo[];
  harvestZones: string[];
  grow?: { seed: string; level: number; growTime: string };
  note?: string;
}

const MAX_DROPS = 4;

function mobInfo(wiki: WikiData, mob: string, rarity?: string): DropInfo {
  return { mob, zone: wiki.monsters[mob]?.zones?.[0]?.zone, rarity, url: wikiUrl(wiki, mob) };
}

function buildItemInfo(wiki: WikiData, loc: WikiItemLocation): WikiItemInfo | undefined {
  const drops = (loc.loot ?? []).slice(0, MAX_DROPS).map((l) => mobInfo(wiki, l.mob, l.rarity));
  const skin = (loc.skin ?? []).slice(0, MAX_DROPS).map((m) => mobInfo(wiki, m));
  const butcher = (loc.butcher ?? []).slice(0, MAX_DROPS).map((m) => mobInfo(wiki, m));
  const gather = (loc.gather ?? []).map((g) => ({
    skill: g.skill,
    level: g.level,
    zones: g.zones ?? [],
    where: g.where,
  }));
  const harvestZones = gather.length === 0 ? (loc.harvestZones ?? []).slice(0, 6) : [];
  const grow = loc.grow ? { seed: loc.grow.seed, level: loc.grow.level, growTime: loc.grow.growTime } : undefined;
  const note = loc.gatherNote ?? loc.note;
  if (!drops.length && !skin.length && !butcher.length && !gather.length && !harvestZones.length && !grow) return undefined;
  return {
    url: wikiUrl(wiki, loc.wiki ?? loc.name),
    drops,
    dropTotal: loc.lootTotal ?? loc.loot?.length ?? 0,
    skin,
    butcher,
    gather,
    harvestZones,
    grow,
    note,
  };
}

/** Wiki facts about where an item comes from, or undefined when the wiki has nothing. */
export function resolveWikiItem(data: WikiSource, itemId: number | string): WikiItemInfo | undefined {
  const loc = data.wiki.itemLocations[String(itemId)];
  return loc ? buildItemInfo(data.wiki, loc) : undefined;
}

/** Wiki prices for an item, cheapest per piece first. */
export function wikiBuys(data: WikiSource, itemId: number | string): { buy: WikiBuy; price: PriceInfo }[] {
  const loc = data.wiki.itemLocations[String(itemId)];
  return (loc?.buy ?? [])
    .filter((b) => typeof b.cost === "number")
    .map((buy) => ({ buy, price: priceInfo(data.wiki, buy) }))
    .sort((a, b) => Number(a.price.currency !== "councils") - Number(b.price.currency !== "councils") || a.price.perUnit - b.price.perUnit);
}
