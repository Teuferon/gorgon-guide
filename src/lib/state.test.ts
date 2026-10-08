import { describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  defaultState,
  exportState,
  getLevel,
  isTracked,
  loadState,
  parseImport,
  reduce,
  sanitizeState,
} from "./state";

describe("defaultState", () => {
  it("has the starting levels and tracked skills", () => {
    const s = defaultState();
    expect(getLevel(s, "Archery")).toBe(20);
    expect(getLevel(s, "AnimalHandling")).toBe(15);
    expect(getLevel(s, "Cooking")).toBe(0);
    for (const k of ["Fletching", "Cooking", "Gardening", "Mycology", "Foraging"]) expect(isTracked(s, k)).toBe(true);
    expect(isTracked(s, "Tanning")).toBe(false);
  });
});

describe("reduce", () => {
  it("clamps levels", () => {
    expect(getLevel(reduce(defaultState(), { type: "setLevel", skill: "Cooking", level: -4 }), "Cooking")).toBe(0);
    expect(getLevel(reduce(defaultState(), { type: "setLevel", skill: "Cooking", level: 9999 }), "Cooking")).toBe(150);
    expect(getLevel(reduce(defaultState(), { type: "setLevel", skill: "Cooking", level: 12.7 }), "Cooking")).toBe(12);
  });
  it("marks recipes done and undone", () => {
    const done = reduce(defaultState(), { type: "setRecipeDone", recipe: "5", done: true });
    expect(done.doneRecipes).toEqual({ "5": true });
    expect(reduce(done, { type: "setRecipeDone", recipe: "5", done: false }).doneRecipes).toEqual({});
  });
  it("adds, ticks and removes tasks", () => {
    let s = reduce(defaultState(), { type: "addTask", task: { id: "a", text: "x", done: false } });
    s = reduce(s, { type: "setTaskDone", id: "a", done: true });
    expect(s.customTasks[0].done).toBe(true);
    expect(reduce(s, { type: "removeTask", id: "a" }).customTasks).toEqual([]);
  });
});

describe("export and import", () => {
  it("round-trips the state", () => {
    let s = reduce(defaultState(), { type: "setLevel", skill: "Fletching", level: 33 });
    s = reduce(s, { type: "addTask", task: { id: "t", text: "Buy feathers", skill: "Fletching", targetLevel: 40, done: false } });
    s = reduce(s, { type: "setRecipeDone", recipe: "10001", done: true });
    const result = parseImport(exportState(s));
    expect(result).toEqual({ ok: true, state: s });
  });
  it("accepts a bare state object", () => {
    const result = parseImport(JSON.stringify(defaultState()));
    expect(result.ok).toBe(true);
  });
  it("rejects broken files", () => {
    expect(parseImport("not json").ok).toBe(false);
    expect(parseImport("[]").ok).toBe(false);
    expect(parseImport("{}").ok).toBe(false);
  });
  it("drops wrong types instead of crashing", () => {
    const s = sanitizeState({ levels: { A: "x", B: 5000, C: 3 }, tracked: { A: 1, B: true }, customTasks: [{ id: 1 }, { id: "i", text: "ok" }], doneRecipes: { "1": true, "2": false } })!;
    expect(s.levels).toEqual({ B: 150, C: 3 });
    expect(s.tracked).toEqual({ B: true });
    expect(s.customTasks).toEqual([{ id: "i", text: "ok", skill: undefined, targetLevel: undefined, done: false }]);
    expect(s.doneRecipes).toEqual({ "1": true });
  });
});

describe("loadState", () => {
  it("uses the defaults when storage is empty or corrupt", () => {
    expect(loadState({ getItem: () => null })).toEqual(defaultState());
    expect(loadState({ getItem: () => "{broken" })).toEqual(defaultState());
    expect(loadState(undefined)).toEqual(defaultState());
  });
  it("reads a saved state", () => {
    const saved = reduce(defaultState(), { type: "setLevel", skill: "Cooking", level: 7 });
    const storage = { getItem: (k: string) => (k === STORAGE_KEY ? JSON.stringify(saved) : null) };
    expect(getLevel(loadState(storage), "Cooking")).toBe(7);
  });
});
