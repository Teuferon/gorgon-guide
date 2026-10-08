import { useState } from "react";
import { conditionProgress, isAutoDone, isDone, type Milestone } from "../lib/roadmap";
import { roadmap } from "../lib/roadmapData";
import { useAppState } from "../store";
import { Toggle, WikiLink, WithData } from "../components/common";
import { WhereYouAre } from "../components/WhereYouAre";
import type { GameData } from "../lib/types";

function MilestoneRow({ m, data }: { m: Milestone; data: GameData }) {
  const { state, dispatch } = useAppState();
  const auto = isAutoDone(m, state.levels);
  const done = isDone(m, state.levels, state.roadmapDone);
  const progress = conditionProgress(m, state.levels);
  return (
    <li className={`py-3 border-t border-line first:border-t-0 ${done ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          aria-label={`Done: ${m.title}`}
          checked={done}
          disabled={auto}
          title={auto ? "Done because your levels meet the conditions" : undefined}
          onChange={(e) => dispatch({ type: "setMilestoneDone", id: m.id, done: e.target.checked })}
        />
        <div className="space-y-1">
          <div className="font-medium">{m.title}</div>
          <p className="text-sm text-muted">{m.detail}</p>
          {progress.length > 0 && (
            <p className="text-sm">
              Completes by level:{" "}
              {progress.map((p, i) => (
                <span key={p.skill} className={p.met ? "text-good" : ""}>
                  {i > 0 && ", "}
                  {data.skills[p.skill]?.name ?? p.skill} {p.level} (you: {p.current})
                </span>
              ))}
            </p>
          )}
          <p className="text-sm text-muted">
            Sources:{" "}
            {m.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ", "}
                <WikiLink href={s.url} title="Open the source page">{s.label}</WikiLink>
              </span>
            ))}
          </p>
        </div>
      </div>
    </li>
  );
}

export default function RoadmapPage() {
  const { state } = useAppState();
  const [showDone, setShowDone] = useState(false);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Roadmap</h1>
      <p className="text-muted">
        The overall leveling order for an Archery and Animal Handling character. It is a suggestion built from the wiki
        and fan guides, not a verified meta. Milestones with a level condition finish by themselves when your levels
        reach it. Tick the others off by hand.
      </p>
      <WhereYouAre />
      <Toggle checked={showDone} onChange={setShowDone}>show completed</Toggle>
      <WithData>
        {(data) => (
          <div className="space-y-4">
            {roadmap.phases.map((phase) => {
              const visible = phase.milestones.filter((m) => showDone || !isDone(m, state.levels, state.roadmapDone));
              if (visible.length === 0) return null;
              return (
                <section key={phase.id} className="bg-panel border border-line rounded-lg p-4">
                  <h2 className="text-lg font-semibold mb-1">{phase.title}</h2>
                  <ul>
                    {visible.map((m) => (
                      <MilestoneRow key={m.id} m={m} data={data} />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </WithData>
    </div>
  );
}
