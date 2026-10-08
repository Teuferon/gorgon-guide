import type { Levels } from "./xp";

export interface RoadmapSource {
  label: string;
  url: string;
}

export interface Condition {
  /** Internal skill name, for example "Fletching". */
  skill: string;
  /** The milestone condition is met when the skill level is at least this. */
  level: number;
}

export interface Milestone {
  id: string;
  title: string;
  detail: string;
  sources: RoadmapSource[];
  /** When every condition is met, the milestone counts as done without a manual tick. */
  auto?: Condition[];
}

export interface Phase {
  id: string;
  title: string;
  milestones: Milestone[];
}

export interface Roadmap {
  phases: Phase[];
}

export type ManualDone = Record<string, unknown>;

export function allMilestones(roadmap: Roadmap): Milestone[] {
  return roadmap.phases.flatMap((p) => p.milestones);
}

export interface ConditionProgress extends Condition {
  current: number;
  met: boolean;
}

export function conditionProgress(m: Milestone, levels: Levels): ConditionProgress[] {
  return (m.auto ?? []).map((c) => {
    const current = levels[c.skill] ?? 0;
    return { ...c, current, met: current >= c.level };
  });
}

/** True when the milestone has conditions and the levels meet all of them. */
export function isAutoDone(m: Milestone, levels: Levels): boolean {
  const progress = conditionProgress(m, levels);
  return progress.length > 0 && progress.every((p) => p.met);
}

/** Done by levels or ticked off by hand. */
export function isDone(m: Milestone, levels: Levels, manual: ManualDone): boolean {
  return isAutoDone(m, levels) || manual[m.id] === true;
}

/** The first open milestones in roadmap order. */
export function nextOpen(roadmap: Roadmap, levels: Levels, manual: ManualDone, count = 3): Milestone[] {
  return allMilestones(roadmap)
    .filter((m) => !isDone(m, levels, manual))
    .slice(0, count);
}

/** Problems in the roadmap content, for the content test. Empty when the content is valid. */
export function validateRoadmap(roadmap: Roadmap, skills: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const m of allMilestones(roadmap)) {
    if (ids.has(m.id)) problems.push(`duplicate id ${m.id}`);
    ids.add(m.id);
    if (!m.title.trim() || !m.detail.trim()) problems.push(`${m.id}: empty title or detail`);
    if (m.sources.length === 0) problems.push(`${m.id}: no sources`);
    for (const s of m.sources) {
      if (!s.url.startsWith("https://")) problems.push(`${m.id}: bad url ${s.url}`);
    }
    for (const c of m.auto ?? []) {
      if (!(c.skill in skills)) problems.push(`${m.id}: unknown skill ${c.skill}`);
      if (!Number.isInteger(c.level) || c.level < 1) problems.push(`${m.id}: bad level for ${c.skill}`);
    }
  }
  return problems;
}
