import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { filterSkills, groupByCombat, type SkillRow } from "../lib/skills";
import { exportState, getLevel, isTracked, parseImport } from "../lib/state";
import { useAppState } from "../store";
import { LevelInput, Toggle, WithData } from "../components/common";
import type { GameData } from "../lib/types";

function SkillTable({ rows }: { rows: SkillRow[] }) {
  const { state, dispatch } = useAppState();
  if (rows.length === 0) return <p className="text-muted">Nothing found.</p>;
  return (
    <ul className="divide-y divide-line border border-line rounded-lg bg-panel">
      {rows.map(({ key, skill, player }) => (
        <li key={key} className="flex flex-wrap items-center gap-3 px-3 py-2">
          <Link to={`/skill/${key}`} className="flex-1 min-w-40">
            {skill.name}
            {!player && <span className="text-muted text-sm"> (hidden by the filter)</span>}
          </Link>
          <label className="flex items-center gap-2">
            <span className="text-muted text-sm">level</span>
            <LevelInput
              value={getLevel(state, key)}
              label={`Level of ${skill.name}`}
              onChange={(n) => dispatch({ type: "setLevel", skill: key, level: n })}
            />
          </label>
          <Toggle
            checked={isTracked(state, key)}
            onChange={(v) => dispatch({ type: "setTracked", skill: key, tracked: v })}
          >
            tracking
          </Toggle>
        </li>
      ))}
    </ul>
  );
}

function Backup() {
  const { state, dispatch } = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string>();

  const download = () => {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gorgon-guide-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const result = parseImport(await file.text());
    if (result.ok) {
      dispatch({ type: "replace", state: result.state });
      setMessage("Import done. The data in this browser was replaced.");
    } else {
      setMessage(`Import failed. ${result.error}`);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <section className="bg-panel border border-line rounded-lg p-3 space-y-2">
      <h2 className="font-semibold">Backup</h2>
      <p className="text-muted text-sm">
        Export saves your levels, tracked skills, checked-off recipes and custom tasks to one JSON file. Import replaces
        that data in this browser.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn" onClick={download}>Export to file</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>Import from file</button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </div>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

function SkillsList({ data }: { data: GameData }) {
  const { state } = useAppState();
  const [query, setQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const recipeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const [k, list] of data.recipesByRewardSkill) m.set(k, list.length);
    return m;
  }, [data]);
  const rows = filterSkills(data.skills, recipeCounts, {
    query,
    showHidden,
    keep: (k) => isTracked(state, k) || getLevel(state, k) > 0,
  });
  const { combat, other } = groupByCombat(rows);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4">
        <input
          type="search"
          placeholder="Search skills"
          aria-label="Search skills"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-64 max-w-full"
        />
        <Toggle checked={showHidden} onChange={setShowHidden}>show skills without content</Toggle>
      </div>
      <h2 className="text-xl font-semibold mt-2">Combat skills ({combat.length})</h2>
      <SkillTable rows={combat} />
      <h2 className="text-xl font-semibold mt-2">Other skills ({other.length})</h2>
      <SkillTable rows={other} />
    </>
  );
}

export default function SkillsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My skills</h1>
      <p className="text-muted">
        Enter your level and turn on "tracking" for the skills you want on the Next steps page. A level of 0 means you
        have not learned the skill yet. Skills that cannot be leveled or have no content in the game data are hidden.
        Skills you track or have a level in always show.
      </p>
      <Backup />
      <WithData>{(data) => <SkillsList data={data} />}</WithData>
    </div>
  );
}
