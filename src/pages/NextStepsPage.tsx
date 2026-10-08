import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../store";
import { Toggle, WithData } from "../components/common";
import { SkillCard } from "../components/SkillCard";
import { WhereYouAre } from "../components/WhereYouAre";
import type { RankBy } from "../lib/xp";

export default function NextStepsPage() {
  const { state, dispatch } = useAppState();
  const [showDone, setShowDone] = useState(false);
  const [showLow, setShowLow] = useState(false);
  const tracked = Object.keys(state.tracked).filter((k) => state.tracked[k]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Next steps</h1>
      <p className="text-muted">
        Each card shows the recipes that still give XP at your level, the first-craft bonuses and the next unlocks. XP
        values for recipes are an estimate. The game data does not say exactly how XP drops when your level is higher
        than the recipe needs, so treat the numbers as approximate.
      </p>
      <WhereYouAre />
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Toggle checked={showDone} onChange={setShowDone}>show completed</Toggle>
        <Toggle checked={showLow} onChange={setShowLow}>show low-XP recipes</Toggle>
        <label className="flex items-center gap-2">
          <span>Hide recipes below</span>
          <select
            value={String(state.settings.usefulThreshold)}
            onChange={(e) => dispatch({ type: "setThreshold", value: Number(e.target.value) })}
            aria-label="Useful XP threshold"
          >
            <option value="0.9">90% of base XP</option>
            <option value="0.7">70% of base XP</option>
            <option value="0.5">50% of base XP</option>
            <option value="0.3">30% of base XP</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span>Sort by</span>
          <select
            value={state.settings.rankBy}
            onChange={(e) => dispatch({ type: "setRankBy", value: e.target.value as RankBy })}
            aria-label="Recipe sort order"
          >
            <option value="now">next craft, with first-craft bonus</option>
            <option value="repeat">XP per craft only</option>
          </select>
        </label>
      </div>
      {tracked.length === 0 ? (
        <p>
          You are not tracking any skill. Turn on "tracking" on the <Link to="/skills">My skills</Link> page.
        </p>
      ) : (
        <WithData>
          {(data) => (
            <div className="grid gap-4">
              {tracked
                .filter((k) => data.skills[k])
                .map((k) => (
                  <SkillCard key={k} data={data} skillKey={k} showDone={showDone} showLow={showLow} />
                ))}
            </div>
          )}
        </WithData>
      )}
    </div>
  );
}
