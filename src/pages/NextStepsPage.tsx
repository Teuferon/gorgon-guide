import { useState } from "react";
import { Link } from "react-router-dom";
import { useAppState } from "../store";
import { Toggle, WithData } from "../components/common";
import { SkillCard } from "../components/SkillCard";

export default function NextStepsPage() {
  const { state, dispatch } = useAppState();
  const [showDone, setShowDone] = useState(false);
  const [showLow, setShowLow] = useState(false);
  const tracked = Object.keys(state.tracked).filter((k) => state.tracked[k]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Další kroky</h1>
      <p className="text-muted">
        Karty ukazují recepty, které na vašem levelu ještě dávají XP, bonusy za první výrobu a nejbližší odemčení. XP u
        receptů je odhad. Vzorec poklesu XP při vyšším levelu z dat nevyplývá přesně, proto ho berte jako přibližný.
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Toggle checked={showDone} onChange={setShowDone}>zobrazit hotové</Toggle>
        <Toggle checked={showLow} onChange={setShowLow}>zobrazit i recepty s malým XP</Toggle>
        <label className="flex items-center gap-2">
          <span>Skrýt recepty pod</span>
          <select
            value={String(state.settings.usefulThreshold)}
            onChange={(e) => dispatch({ type: "setThreshold", value: Number(e.target.value) })}
            aria-label="Hranice užitečného XP"
          >
            <option value="0.9">90 % základního XP</option>
            <option value="0.7">70 % základního XP</option>
            <option value="0.5">50 % základního XP</option>
            <option value="0.3">30 % základního XP</option>
          </select>
        </label>
      </div>
      {tracked.length === 0 ? (
        <p>
          Nesledujete žádný skill. Zapněte „sleduji“ na stránce <Link to="/skilly">Moje skilly</Link>.
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
