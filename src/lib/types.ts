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

export interface RawGameData {
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
