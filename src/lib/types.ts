// Types for the trimmed game data in src/data/ (schema: docs/data-sources.md).

export interface Meta {
  gameDataVersion: string;
  generatedAt: string;
  source: string;
  iconUrlTemplate: string;
  copyright: string;
  counts: Record<string, number>;
}

export interface SkillReward {
  level: number;
  recipe?: number;
  ability?: string;
  races?: string[];
  bonusToSkill?: string;
  note?: string;
}

export interface Skill {
  id: number;
  name: string;
  desc?: string;
  combat?: boolean;
  umbrella?: boolean;
  parents?: string[];
  xpTable?: string;
  maxLevel?: number;
  maxBonusLevels?: number;
  hideWhenZero?: boolean;
  advancementHints?: Record<string, string>;
  rewards?: SkillReward[];
}

export interface DropOff {
  level: number;
  pct: number;
  rate: number;
}

export interface RecipeIngredient {
  id?: number;
  keywords?: string[];
  name: string;
  qty: number;
  consumeChance?: number;
  durability?: number;
}

export interface RecipeResult {
  id: number;
  name: string;
  qty: number;
  chance?: number;
}

export interface Recipe {
  name: string;
  internal: string;
  skill: string;
  level: number;
  xp: number;
  xpFirst: number;
  xpSkill?: string;
  dropOff?: DropOff;
  noXp?: boolean;
  prereq?: number;
  maxUses?: number;
  resetSeconds?: number;
  keywords?: string[];
  notObtainable?: boolean;
  ingredients?: RecipeIngredient[];
  results?: RecipeResult[];
  protoResults?: RecipeResult[];
  costs?: { currency: string; price: number }[];
}

export interface RecipeEntry extends Recipe {
  id: string;
}

export interface Item {
  name: string;
  value: number;
  stack: number;
  icon: number;
  keywords?: string[];
  equipSlot?: string;
  notObtainable?: boolean;
}

export interface RecipeSource {
  training?: string[];
  skill?: { skill: string; level: number }[];
  item?: number[];
  quest?: number[];
  hangout?: string[];
  gift?: string[];
  other?: string[];
}

export interface ItemSource {
  vendor?: string[];
  barter?: string[];
  gift?: string[];
  hangout?: string[];
  quest?: number[];
  recipe?: number[];
  item?: number[];
  other?: string[];
}

export interface Npc {
  name: string;
  area: string;
  storeFavor?: string;
  trains?: string[];
  trainFavor?: string;
  services: string[];
}

export interface Quest {
  name: string;
  npc?: string;
  location?: string;
}

export interface Ability {
  name: string;
  skill: string;
  level: number;
  desc?: string;
  damageType?: string;
  resetTime?: number;
  powerCost?: number;
  upgradeOf?: string;
  icon?: number;
}

/** Community data from the wiki (src/data/wiki-*.json, see docs/wiki-data.md). Not official. */
export interface WikiMeta {
  generatedAt: string;
  source: string;
  /** Page URL with a {title} placeholder. Spaces in the title become underscores. */
  pageUrlTemplate: string;
}

export interface WikiZone {
  name: string;
  page: string;
  kind: string;
  levels?: string;
  minLevel?: number;
  maxLevel?: number;
  connects?: string[];
  monsters?: { name: string; lootLevel?: number; health?: number }[];
  harvest?: Record<string, string[]>;
  npcs?: string[];
}

export interface WikiMonster {
  type?: string;
  zones?: { zone: string; where?: string; lootLevel?: number; health?: number; time?: string }[];
  skin?: string[];
  butcher?: string[];
  tame?: { level: number; type: string };
}

export interface WikiBuy {
  npc: string;
  zone?: string;
  cost: number;
  qty?: number;
  favor?: string;
  currency?: string;
}

export interface WikiItemLocation {
  name: string;
  wiki?: string;
  skin?: string[];
  skinBonus?: string[];
  butcher?: string[];
  butcherBonus?: string[];
  skull?: string[];
  loot?: { mob: string; rarity?: string }[];
  lootTotal?: number;
  dropZones?: string[];
  gather?: { skill: string; level?: number; zones?: string[]; where?: string; creatures?: string[] }[];
  harvestZones?: string[];
  grow?: { seed: string; level: number; growTime: string; fertilizer: string };
  buy?: WikiBuy[];
  gatherNote?: string;
  note?: string;
}

export interface WikiNpc {
  name: string;
  zone?: string;
  town?: string;
  location?: string;
  wander?: string;
  detail?: string;
  wiki: string;
}

export interface WikiData {
  meta: WikiMeta;
  zones: Record<string, WikiZone>;
  monsters: Record<string, WikiMonster>;
  itemLocations: Record<string, WikiItemLocation>;
  npcs: Record<string, WikiNpc>;
}

export interface RawGameData {
  wiki: WikiData;
  meta: Meta;
  skills: Record<string, Skill>;
  xptables: Record<string, number[]>;
  recipes: Record<string, Recipe>;
  items: Record<string, Item>;
  recipeSources: Record<string, RecipeSource>;
  itemSources: Record<string, ItemSource>;
  npcs: Record<string, Npc>;
  areas: Record<string, string>;
  quests: Record<string, Quest>;
  abilities: Record<string, Ability>;
}

export interface GameData extends RawGameData {
  /** Recipes by the skill that receives the XP (xpSkill, else skill), sorted by level. */
  recipesByRewardSkill: Map<string, RecipeEntry[]>;
  /** Recipes by the skill whose level they require, sorted by level. */
  recipesByRequiredSkill: Map<string, RecipeEntry[]>;
  /** NPC keys by trained skill. */
  trainersBySkill: Map<string, string[]>;
  /** Item ids by keyword, built on first use. */
  itemsByKeyword: Map<string, string[]>;
}
