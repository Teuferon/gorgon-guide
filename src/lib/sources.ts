import type { GameData, RecipeIngredient } from "./types";

/** Subset of the game data the source resolution reads. */
export type SourceData = Pick<
  GameData,
  "npcs" | "areas" | "items" | "itemSources" | "recipes" | "quests" | "recipeSources" | "skills" | "itemsByKeyword"
>;

export interface VendorInfo {
  npc: string;
  npcName: string;
  areaName: string;
  /** Minimum favor for the shop, only set when it is higher than the default. */
  favor?: string;
}

export interface ItemSourceInfo {
  vendors: VendorInfo[];
  /** Czech labels for sources other than a vendor. Empty when a vendor sells the item. */
  labels: string[];
}

export type ResolvedIngredient =
  | {
      kind: "item";
      id: number;
      name: string;
      qty: number;
      /** Base value from the game data. This is not a shop price. */
      baseValue?: number;
      source: ItemSourceInfo;
    }
  | {
      kind: "keyword";
      keywords: string[];
      name: string;
      qty: number;
      examples: { id: string; name: string; baseValue: number }[];
    };

const DEFAULT_FAVORS = new Set(["Despised", "Neutral"]);
const MAX_LABELS = 4;

function areaName(data: Pick<SourceData, "areas">, key: string | undefined): string {
  if (!key) return "";
  return data.areas[key] ?? key.replace(/^Area/, "");
}

function vendorInfo(data: SourceData, npcKey: string): VendorInfo | undefined {
  const npc = data.npcs[npcKey];
  if (!npc) return undefined; // test or admin NPCs that are not in npcs.json
  const favor = npc.storeFavor && !DEFAULT_FAVORS.has(npc.storeFavor) ? npc.storeFavor : undefined;
  return { npc: npcKey, npcName: npc.name, areaName: areaName(data, npc.area), favor };
}

/** Czech labels for the source types that have no ID (item-sources "other" field). */
const OTHER_LABELS: Record<string, string> = {
  Monster: "drop z monster",
  CorpseSkinning: "stahování z kůže",
  CorpseButchering: "porcování těl",
  CorpseSkullExtraction: "získání z lebky",
  Angling: "rybaření",
  TreasureMap: "poklad z mapy",
  ResourceInteractor: "sběr ze zdroje ve světě",
  CraftedInteractor: "vyrobený objekt ve světě",
  QuestObjectiveMacGuffin: "předmět z questu",
};

function describeOther(raw: string): string | undefined {
  const idx = raw.indexOf(":");
  const type = idx === -1 ? raw : raw.slice(0, idx);
  const detail = idx === -1 ? undefined : raw.slice(idx + 1);
  if (type === "Effect") return undefined; // the effect text is not useful to the player
  if (detail?.includes("no longer used")) return undefined;
  const label = OTHER_LABELS[type];
  if (!label) return undefined;
  return type === "CraftedInteractor" && detail ? `${label} (${detail})` : label;
}

function npcLabel(data: SourceData, key: string): string {
  const npc = data.npcs[key];
  return npc ? npc.name : key.replace(/^NPC_/, "");
}

/** Where an item comes from. A vendor wins over every other source. */
export function resolveItemSource(data: SourceData, itemId: number | string): ItemSourceInfo {
  const src = data.itemSources[String(itemId)];
  if (!src) return { vendors: [], labels: ["zdroj není v datech"] };

  const vendors = (src.vendor ?? []).map((k) => vendorInfo(data, k)).filter((v): v is VendorInfo => !!v);
  if (vendors.length > 0) return { vendors, labels: [] };

  const labels: string[] = [];
  const add = (l: string | undefined) => {
    if (l && !labels.includes(l)) labels.push(l);
  };
  for (const o of src.other ?? []) add(describeOther(o));
  const recipeNames = (src.recipe ?? []).map((id) => data.recipes[String(id)]?.name).filter((n): n is string => !!n);
  if (recipeNames.length > 0) {
    const shown = recipeNames.slice(0, 2).join(", ");
    add(`craft z receptu ${shown}${recipeNames.length > 2 ? ` a ${recipeNames.length - 2} dalších` : ""}`);
  }
  if (src.barter?.length) add(`výměna u NPC ${src.barter.slice(0, 2).map((k) => npcLabel(data, k)).join(", ")}`);
  if (src.quest?.length) {
    const q = data.quests[String(src.quest[0])];
    add(q ? `odměna za quest „${q.name}“` : "odměna za quest");
  }
  if (src.gift?.length) add("dárek od NPC");
  if (src.hangout?.length) add("odměna z hang-outu s NPC");
  if (src.item?.length) add("získáš z jiné položky");
  if (labels.length === 0) labels.push("zdroj není v datech");
  return { vendors: [], labels: labels.slice(0, MAX_LABELS) };
}

/** Looks up an ingredient. Keyword ingredients ("any Cheap Meat") list a few matching items. */
export function resolveIngredient(data: SourceData, ing: RecipeIngredient): ResolvedIngredient {
  if (ing.id !== undefined) {
    const item = data.items[String(ing.id)];
    return {
      kind: "item",
      id: ing.id,
      name: item?.name ?? ing.name,
      qty: ing.qty,
      baseValue: item?.value,
      source: resolveItemSource(data, ing.id),
    };
  }
  const keywords = ing.keywords ?? [];
  let matches: string[] | undefined;
  for (const kw of keywords) {
    const ids = new Set(data.itemsByKeyword.get(kw) ?? []);
    matches = matches ? matches.filter((id) => ids.has(id)) : [...ids];
  }
  const examples = (matches ?? [])
    .filter((id) => !data.items[id]?.notObtainable)
    .map((id) => ({ id, name: data.items[id]?.name ?? id, baseValue: data.items[id]?.value ?? 0 }))
    .sort((a, b) => a.baseValue - b.baseValue || a.name.localeCompare(b.name))
    .slice(0, 4);
  return { kind: "keyword", keywords, name: ing.name, qty: ing.qty, examples };
}

export type RecipeSourceInfo =
  | { kind: "training"; npc: string; npcName: string; areaName: string }
  | { kind: "skill"; skill: string; skillName: string; level: number }
  | { kind: "quest"; name: string; npcName?: string; location?: string }
  | { kind: "item"; name: string }
  | { kind: "hangout"; npcName: string; areaName: string }
  | { kind: "gift"; npcName: string; areaName: string }
  | { kind: "unknown" };

/** Where a recipe is learned. */
export function resolveRecipeSources(data: SourceData, recipeId: number | string): RecipeSourceInfo[] {
  const src = data.recipeSources[String(recipeId)];
  const out: RecipeSourceInfo[] = [];
  if (src) {
    const npcInfo = (key: string) => ({
      npcName: npcLabel(data, key),
      areaName: areaName(data, data.npcs[key]?.area),
    });
    for (const key of src.training ?? []) out.push({ kind: "training", npc: key, ...npcInfo(key) });
    for (const s of src.skill ?? []) {
      out.push({ kind: "skill", skill: s.skill, skillName: data.skills[s.skill]?.name ?? s.skill, level: s.level });
    }
    for (const id of src.quest ?? []) {
      const q = data.quests[String(id)];
      const npcKey = q?.npc?.split("/").pop();
      out.push({
        kind: "quest",
        name: q?.name ?? `quest ${id}`,
        npcName: npcKey ? npcLabel(data, npcKey) : undefined,
        location: q?.location,
      });
    }
    for (const id of src.item ?? []) out.push({ kind: "item", name: data.items[String(id)]?.name ?? `položka ${id}` });
    for (const key of src.hangout ?? []) out.push({ kind: "hangout", ...npcInfo(key) });
    for (const key of src.gift ?? []) out.push({ kind: "gift", ...npcInfo(key) });
  }
  if (out.length === 0) out.push({ kind: "unknown" });
  return out;
}

/** Czech one-line description of a recipe source. */
export function describeRecipeSource(s: RecipeSourceInfo): string {
  switch (s.kind) {
    case "training":
      return s.areaName ? `trenér ${s.npcName} (${s.areaName})` : `trenér ${s.npcName}`;
    case "skill":
      return `odměna za level ${s.level} ve skillu ${s.skillName}`;
    case "quest": {
      const where = [s.npcName, s.location].filter(Boolean).join(", ");
      return where ? `quest „${s.name}“ (${where})` : `quest „${s.name}“`;
    }
    case "item":
      return `z položky ${s.name}`;
    case "hangout":
      return `hang-out s ${s.npcName}${s.areaName ? ` (${s.areaName})` : ""}`;
    case "gift":
      return `dárek pro ${s.npcName}${s.areaName ? ` (${s.areaName})` : ""}`;
    case "unknown":
      return "zdroj není v datech (možná výchozí recept)";
  }
}
