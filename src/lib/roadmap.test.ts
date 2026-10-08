import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { allMilestones, conditionProgress, isAutoDone, isDone, nextOpen, validateRoadmap, type Roadmap } from "./roadmap";
import { defaultState, reduce, sanitizeState } from "./state";

const src = [{ label: "s", url: "https://x" }];
const roadmap: Roadmap = {
  phases: [
    {
      id: "p1",
      title: "One",
      milestones: [
        { id: "m1", title: "Auto", detail: "d", sources: src, auto: [{ skill: "Fletching", level: 33 }] },
        { id: "m2", title: "Manual", detail: "d", sources: src },
      ],
    },
    {
      id: "p2",
      title: "Two",
      milestones: [
        { id: "m3", title: "Two skills", detail: "d", sources: src, auto: [{ skill: "Archery", level: 50 }, { skill: "Mycology", level: 10 }] },
        { id: "m4", title: "Last", detail: "d", sources: src },
      ],
    },
  ],
};

describe("milestone completion", () => {
  it("completes by levels when every condition is met", () => {
    const m3 = allMilestones(roadmap)[2];
    expect(isAutoDone(m3, { Archery: 50, Mycology: 9 })).toBe(false);
    expect(isAutoDone(m3, { Archery: 50, Mycology: 10 })).toBe(true);
    expect(conditionProgress(m3, { Archery: 50 }).map((p) => [p.skill, p.current, p.met])).toEqual([
      ["Archery", 50, true],
      ["Mycology", 0, false],
    ]);
  });
  it("never auto-completes without conditions, manual ticks work", () => {
    const m2 = allMilestones(roadmap)[1];
    expect(isAutoDone(m2, { Fletching: 99 })).toBe(false);
    expect(isDone(m2, {}, {})).toBe(false);
    expect(isDone(m2, {}, { m2: true })).toBe(true);
  });
});

describe("nextOpen", () => {
  it("returns the first open milestones in order and skips done ones", () => {
    expect(nextOpen(roadmap, { Fletching: 20 }, {}, 3).map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    expect(nextOpen(roadmap, { Fletching: 33 }, { m2: true }, 3).map((m) => m.id)).toEqual(["m3", "m4"]);
    expect(nextOpen(roadmap, { Fletching: 33 }, { m2: true, m3: true, m4: true })).toEqual([]);
  });
});

describe("state integration", () => {
  it("stores manual milestone ticks and keeps them through sanitize", () => {
    const s = reduce(defaultState(), { type: "setMilestoneDone", id: "m2", done: true });
    expect(sanitizeState(JSON.parse(JSON.stringify(s)))!.roadmapDone).toEqual({ m2: true });
    expect(reduce(s, { type: "setMilestoneDone", id: "m2", done: false }).roadmapDone).toEqual({});
  });
});

describe("content file", () => {
  it("is valid: unique ids, known skills, sources with https links", () => {
    const content = JSON.parse(readFileSync(new URL("../content/roadmap.json", import.meta.url), "utf8")) as Roadmap;
    const skills = JSON.parse(readFileSync(new URL("../data/skills.json", import.meta.url), "utf8"));
    expect(validateRoadmap(content, skills)).toEqual([]);
    expect(allMilestones(content).length).toBeGreaterThan(10);
  });
});
