import { DEFAULT_LEVELS, DEFAULT_TRACKED } from "./skills";
import { DEFAULT_USEFUL_THRESHOLD, type RankBy } from "./xp";

export const STORAGE_KEY = "gorgon-guide-state";
export const STATE_VERSION = 1;
export const MAX_LEVEL_INPUT = 150;

export interface CustomTask {
  id: string;
  text: string;
  /** Internal skill name, the task shows on that skill's card. */
  skill?: string;
  targetLevel?: number;
  done: boolean;
}

export interface Settings {
  /** Recipes with a lower share of their base XP than this are hidden (0 to 1). */
  usefulThreshold: number;
  /** How the recipe list is sorted, see RankBy. */
  rankBy: RankBy;
}

export interface AppState {
  version: number;
  levels: Record<string, number>;
  tracked: Record<string, boolean>;
  /** Recipe IDs whose first-time bonus the player already took. */
  doneRecipes: Record<string, true>;
  /** Roadmap milestone IDs ticked off by hand. */
  roadmapDone: Record<string, true>;
  customTasks: CustomTask[];
  settings: Settings;
}

export function defaultState(): AppState {
  return {
    version: STATE_VERSION,
    levels: { ...DEFAULT_LEVELS },
    tracked: Object.fromEntries(DEFAULT_TRACKED.map((k) => [k, true])),
    doneRecipes: {},
    roadmapDone: {},
    customTasks: [],
    settings: { usefulThreshold: DEFAULT_USEFUL_THRESHOLD, rankBy: "now" },
  };
}

export const getLevel = (s: AppState, skill: string): number => s.levels[skill] ?? 0;
export const isTracked = (s: AppState, skill: string): boolean => s.tracked[skill] === true;

export function clampLevel(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(MAX_LEVEL_INPUT, Math.max(0, Math.floor(n)));
}

export type Action =
  | { type: "setLevel"; skill: string; level: number }
  | { type: "setTracked"; skill: string; tracked: boolean }
  | { type: "setRecipeDone"; recipe: string; done: boolean }
  | { type: "setMilestoneDone"; id: string; done: boolean }
  | { type: "addTask"; task: CustomTask }
  | { type: "setTaskDone"; id: string; done: boolean }
  | { type: "removeTask"; id: string }
  | { type: "setThreshold"; value: number }
  | { type: "setRankBy"; value: RankBy }
  | { type: "replace"; state: AppState };

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "setLevel":
      return { ...state, levels: { ...state.levels, [action.skill]: clampLevel(action.level) } };
    case "setTracked":
      return { ...state, tracked: { ...state.tracked, [action.skill]: action.tracked } };
    case "setRecipeDone": {
      const doneRecipes = { ...state.doneRecipes };
      if (action.done) doneRecipes[action.recipe] = true;
      else delete doneRecipes[action.recipe];
      return { ...state, doneRecipes };
    }
    case "setMilestoneDone": {
      const roadmapDone = { ...state.roadmapDone };
      if (action.done) roadmapDone[action.id] = true;
      else delete roadmapDone[action.id];
      return { ...state, roadmapDone };
    }
    case "addTask":
      return { ...state, customTasks: [...state.customTasks, action.task] };
    case "setTaskDone":
      return {
        ...state,
        customTasks: state.customTasks.map((t) => (t.id === action.id ? { ...t, done: action.done } : t)),
      };
    case "removeTask":
      return { ...state, customTasks: state.customTasks.filter((t) => t.id !== action.id) };
    case "setThreshold":
      return { ...state, settings: { ...state.settings, usefulThreshold: Math.min(1, Math.max(0, action.value)) } };
    case "setRankBy":
      return { ...state, settings: { ...state.settings, rankBy: action.value } };
    case "replace":
      return action.state;
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Turns untrusted data (localStorage content or an imported file) into a valid state.
 * Unknown fields are dropped, wrong types fall back to the defaults. Returns undefined when
 * the value is not an object at all.
 */
export function sanitizeState(raw: unknown): AppState | undefined {
  if (!isObject(raw)) return undefined;
  const base = defaultState();

  const levels: Record<string, number> = {};
  if (isObject(raw.levels)) {
    for (const [k, v] of Object.entries(raw.levels)) if (typeof v === "number") levels[k] = clampLevel(v);
  }
  const tracked: Record<string, boolean> = {};
  if (isObject(raw.tracked)) {
    for (const [k, v] of Object.entries(raw.tracked)) if (typeof v === "boolean") tracked[k] = v;
  }
  const doneRecipes: Record<string, true> = {};
  if (isObject(raw.doneRecipes)) {
    for (const [k, v] of Object.entries(raw.doneRecipes)) if (v === true) doneRecipes[k] = true;
  }
  const roadmapDone: Record<string, true> = {};
  if (isObject(raw.roadmapDone)) {
    for (const [k, v] of Object.entries(raw.roadmapDone)) if (v === true) roadmapDone[k] = true;
  }
  const customTasks: CustomTask[] = [];
  if (Array.isArray(raw.customTasks)) {
    for (const t of raw.customTasks) {
      if (!isObject(t) || typeof t.id !== "string" || typeof t.text !== "string") continue;
      customTasks.push({
        id: t.id,
        text: t.text,
        skill: typeof t.skill === "string" && t.skill ? t.skill : undefined,
        targetLevel: typeof t.targetLevel === "number" ? clampLevel(t.targetLevel) : undefined,
        done: t.done === true,
      });
    }
  }
  let usefulThreshold = base.settings.usefulThreshold;
  if (isObject(raw.settings) && typeof raw.settings.usefulThreshold === "number") {
    usefulThreshold = Math.min(1, Math.max(0, raw.settings.usefulThreshold));
  }
  const rankBy: RankBy =
    isObject(raw.settings) && (raw.settings.rankBy === "now" || raw.settings.rankBy === "repeat")
      ? raw.settings.rankBy
      : base.settings.rankBy;
  return {
    version: STATE_VERSION,
    levels,
    tracked,
    doneRecipes,
    roadmapDone,
    customTasks,
    settings: { usefulThreshold, rankBy },
  };
}

export const EXPORT_FORMAT = "gorgon-guide";

export function exportState(state: AppState, now: Date = new Date()): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: STATE_VERSION, exportedAt: now.toISOString(), state }, null, 2);
}

export type ImportResult = { ok: true; state: AppState } | { ok: false; error: string };

/** Parses an exported file. Accepts the wrapper from exportState or a bare state object. */
export function parseImport(text: string): ImportResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "The file is not valid JSON." };
  }
  const candidate = isObject(json) && isObject(json.state) ? json.state : json;
  const state = sanitizeState(candidate);
  if (!state) return { ok: false, error: "The file does not contain app data." };
  if (!isObject(candidate) || !("levels" in candidate || "tracked" in candidate)) {
    return { ok: false, error: "The file has no levels or tracked skills." };
  }
  return { ok: true, state };
}

export function loadState(storage: Pick<Storage, "getItem"> | undefined): AppState {
  try {
    const text = storage?.getItem(STORAGE_KEY);
    if (text) {
      const state = sanitizeState(JSON.parse(text));
      if (state) return state;
    }
  } catch {
    // corrupt or blocked storage, start from the defaults
  }
  return defaultState();
}

export function saveState(storage: Pick<Storage, "setItem"> | undefined, state: AppState): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked, the app keeps working in memory
  }
}
