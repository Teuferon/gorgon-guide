import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { clampLevel } from "../lib/state";
import { useAppState } from "../store";
import { Toggle, WithData } from "../components/common";

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

function TaskForm({ skills }: { skills: [string, string][] }) {
  const { dispatch } = useAppState();
  const [text, setText] = useState("");
  const [skill, setSkill] = useState("");
  const [target, setTarget] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    dispatch({
      type: "addTask",
      task: {
        id: newId(),
        text: trimmed,
        skill: skill || undefined,
        targetLevel: skill && target !== "" ? clampLevel(Number(target)) : undefined,
        done: false,
      },
    });
    setText("");
    setTarget("");
  };

  return (
    <form onSubmit={submit} className="bg-panel border border-line rounded-lg p-3 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
      <label className="grid gap-1">
        <span className="text-sm text-muted">Úkol</span>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} placeholder="Například koupit 20 Feathers" />
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-muted">Skill (volitelné)</span>
        <select value={skill} onChange={(e) => setSkill(e.target.value)}>
          <option value="">bez skillu</option>
          {skills.map(([k, name]) => (
            <option key={k} value={k}>{name}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-sm text-muted">Cílový level</span>
        <input
          type="number"
          min={0}
          max={150}
          className="w-24"
          disabled={!skill}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
      </label>
      <button type="submit" className="btn">Přidat</button>
    </form>
  );
}

export default function TasksPage() {
  const { state, dispatch } = useAppState();
  const [showDone, setShowDone] = useState(false);
  const tasks = state.customTasks.filter((t) => showDone || !t.done);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Vlastní úkoly</h1>
      <p className="text-muted">
        Úkol svázaný se skillem se ukáže i na jeho kartě na stránce <Link to="/">Další kroky</Link>.
      </p>
      <WithData>
        {(data) => (
          <>
            <TaskForm
              skills={Object.entries(data.skills)
                .filter(([, s]) => s.xpTable)
                .map(([k, s]): [string, string] => [k, s.name])
                .sort((a, b) => a[1].localeCompare(b[1]))}
            />
            <Toggle checked={showDone} onChange={setShowDone}>zobrazit hotové</Toggle>
            {tasks.length === 0 ? (
              <p className="text-muted">Žádné úkoly.</p>
            ) : (
              <ul className="divide-y divide-line border border-line rounded-lg bg-panel">
                {tasks.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={t.done}
                      aria-label={`Hotovo: ${t.text}`}
                      onChange={(e) => dispatch({ type: "setTaskDone", id: t.id, done: e.target.checked })}
                    />
                    <span className={`flex-1 min-w-40 ${t.done ? "line-through text-muted" : ""}`}>{t.text}</span>
                    {t.skill && (
                      <Link to={`/skill/${t.skill}`} className="text-sm">
                        {data.skills[t.skill]?.name ?? t.skill}
                        {t.targetLevel !== undefined ? `, level ${t.targetLevel}` : ""}
                      </Link>
                    )}
                    <button className="btn" onClick={() => dispatch({ type: "removeTask", id: t.id })}>Smazat</button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </WithData>
    </div>
  );
}
