import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { firstTimeRecipes, rankRecipes, xpToNextLevel } from "../lib/xp";
import { nextAdvancementHint, nextUnlocks, type Unlock } from "../lib/unlocks";
import { plural } from "../lib/skills";
import { getLevel } from "../lib/state";
import { useAppState } from "../store";
import { LevelInput, Toggle } from "./common";
import { RecipeRow } from "./RecipeRow";
import type { GameData } from "../lib/types";

const PAGE = 8;

const UNLOCK_LABEL: Record<Unlock["kind"], string> = {
  recipe: "recept",
  ability: "schopnost",
  bonus: "bonusový level pro",
  note: "odměna",
};

export function SkillCard({
  data,
  skillKey,
  showDone,
  showLow,
}: {
  data: GameData;
  skillKey: string;
  showDone: boolean;
  showLow: boolean;
}) {
  const { state, dispatch } = useAppState();
  const skill = data.skills[skillKey];
  const level = getLevel(state, skillKey);
  const [recipeLimit, setRecipeLimit] = useState(PAGE);
  const [firstLimit, setFirstLimit] = useState(PAGE);

  const recipes = data.recipesByRewardSkill.get(skillKey);
  const ranked = useMemo(
    () => rankRecipes(recipes ?? [], state.levels, skillKey, state.settings.usefulThreshold),
    [recipes, state.levels, skillKey, state.settings.usefulThreshold],
  );
  const shownRanked = showLow ? ranked : ranked.filter((r) => r.useful);
  const hiddenLow = ranked.length - ranked.filter((r) => r.useful).length;
  const firstTime = useMemo(
    () => firstTimeRecipes(recipes ?? [], state.levels, state.doneRecipes, showDone),
    [recipes, state.levels, state.doneRecipes, showDone],
  );
  const unlocks = nextUnlocks(data, skillKey, level);
  const hint = nextAdvancementHint(skill, level);
  const toNext = xpToNextLevel(data, skillKey, level);
  const tasks = state.customTasks.filter((t) => t.skill === skillKey && (showDone || !t.done));

  if (!skill) return null;

  return (
    <section className="bg-panel border border-line rounded-lg p-4 space-y-4" aria-label={skill.name}>
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold">
          <Link to={`/skill/${skillKey}`}>{skill.name}</Link>
        </h2>
        <label className="flex items-center gap-2">
          <span className="text-muted">level</span>
          <LevelInput
            value={level}
            label={`Level skillu ${skill.name}`}
            onChange={(n) => dispatch({ type: "setLevel", skill: skillKey, level: n })}
          />
        </label>
        {toNext !== undefined && (
          <span className="text-muted text-sm">XP na další level: {toNext} (tabulka {skill.xpTable})</span>
        )}
      </header>

      {tasks.length > 0 && (
        <div>
          <h3 className="font-medium mb-1">Vlastní úkoly</h3>
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  aria-label={`Hotovo: ${t.text}`}
                  onChange={(e) => dispatch({ type: "setTaskDone", id: t.id, done: e.target.checked })}
                />
                <span className={t.done ? "line-through text-muted" : ""}>{t.text}</span>
                {t.targetLevel !== undefined && (
                  <span className="text-muted text-sm">
                    cíl: level {t.targetLevel}
                    {level >= t.targetLevel ? " (splněno levelem)" : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-1">Další odemčení</h3>
        {unlocks.length > 0 ? (
          <ul className="space-y-0.5">
            {unlocks.map((u, i) => (
              <li key={i} title={u.desc}>
                <span className="text-accent">level {u.level}</span> {UNLOCK_LABEL[u.kind]} {u.name}
                {u.note && <span className="text-muted"> ({u.note})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted">Žádná další odměna v datech.</p>
        )}
        {hint && (
          <p className="text-sm text-muted mt-1">
            Strop XP u levelu {hint.level}: {hint.text}
          </p>
        )}
      </div>

      {!recipes || recipes.length === 0 ? (
        <p className="text-muted">
          Tento skill nemá recepty. Roste používáním ve hře a data neříkají, kolik XP které činnosti dávají.
        </p>
      ) : (
        <>
          <div>
            <h3 className="font-medium mb-1">
              Recepty podle XP <span className="text-warn text-sm font-normal">(odhad, vzorec poklesu XP není ověřený)</span>
            </h3>
            {shownRanked.length === 0 ? (
              <p className="text-muted">
                Na tomto levelu nezbývá recept s dost XP.
                {hiddenLow > 0 && ` Skryto ${hiddenLow} ${plural(hiddenLow, "recept", "recepty", "receptů")} s malým XP.`}
              </p>
            ) : (
              <ul>
                {shownRanked.slice(0, recipeLimit).map((r) => (
                  <RecipeRow key={r.recipe.id} data={data} recipe={r.recipe} xp={r.xp} factor={r.factor} dim={!r.useful} />
                ))}
              </ul>
            )}
            {shownRanked.length > recipeLimit && (
              <button className="btn mt-2" onClick={() => setRecipeLimit((n) => n + PAGE)}>
                Zobrazit dalších (zbývá {shownRanked.length - recipeLimit})
              </button>
            )}
            {!showLow && hiddenLow > 0 && shownRanked.length > 0 && (
              <p className="text-sm text-muted mt-1">
                Skryto {hiddenLow} {plural(hiddenLow, "recept", "recepty", "receptů")} s malým XP.
              </p>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-1">První výroba (bonus XP)</h3>
            {firstTime.length === 0 ? (
              <p className="text-muted">Žádný dostupný recept s bonusem za první výrobu.</p>
            ) : (
              <ul>
                {firstTime.slice(0, firstLimit).map((r) => (
                  <RecipeRow
                    key={r.id}
                    data={data}
                    recipe={r}
                    dim={!!state.doneRecipes[r.id]}
                    firstTime={{
                      done: !!state.doneRecipes[r.id],
                      onChange: (done) => dispatch({ type: "setRecipeDone", recipe: r.id, done }),
                    }}
                  />
                ))}
              </ul>
            )}
            {firstTime.length > firstLimit && (
              <button className="btn mt-2" onClick={() => setFirstLimit((n) => n + PAGE)}>
                Zobrazit dalších (zbývá {firstTime.length - firstLimit})
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

/** Switch used on the home page, kept here so the card and the page share the wording. */
export function ShowDoneToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return <Toggle checked={checked} onChange={onChange}>zobrazit hotové</Toggle>;
}
