import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { firstTimePlan, introRecipes, rankRecipes, xpToNextLevel } from "../lib/xp";
import { nextAdvancementHint, nextUnlocks, type Unlock } from "../lib/unlocks";
import { resolveTrainers } from "../lib/sources";
import { plural } from "../lib/skills";
import { getLevel } from "../lib/state";
import { hasGuide } from "../lib/guides";
import { useAppState } from "../store";
import { LevelInput } from "./common";
import { RecipeRow } from "./RecipeRow";
import { TrainingSpots } from "./TrainingSpots";
import type { GameData, RecipeEntry } from "../lib/types";

const PAGE = 8;

const UNLOCK_LABEL: Record<Unlock["kind"], string> = {
  recipe: "recipe",
  ability: "ability",
  bonus: "bonus level for",
  note: "reward",
};

/** Level 0: the skill is not learned yet. Shows where to learn it and what it unlocks first. */
function LearnSection({ data, skillKey, intro }: { data: GameData; skillKey: string; intro: RecipeEntry[] }) {
  const trainers = resolveTrainers(data, skillKey);
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Not learned yet</h3>
      <p className="text-muted text-sm">Set the level to 1 or higher once you have learned the skill.</p>
      {trainers.length > 0 ? (
        <ul className="list-disc pl-5">
          {trainers.map((t) => (
            <li key={t.npc}>
              Trainer {t.npcName}
              {t.areaName && ` (${t.areaName})`}
              {t.favor && <span className="text-muted">, trains from favor {t.favor}</span>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">No NPC trains this skill in the game data.</p>
      )}
      <p className="text-muted text-sm">The unlock cost is not part of the game data.</p>
      {intro.length > 0 && (
        <div>
          <h4 className="font-medium mb-1">First recipes</h4>
          <ul>
            {intro.map((r) => (
              <RecipeRow key={r.id} data={data} recipe={r} firstBonus={r.xpFirst} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Skills without recipes: a short line, a guide link and the slot for training spots. */
function NoRecipes({ skillKey, name, level, combat }: { skillKey: string; name: string; level: number; combat: boolean }) {
  return (
    <div className="space-y-2">
      <p className="text-muted">
        {name} has no crafting recipes in the game data. {combat ? "You level it by fighting." : "You level it by using it in the game."}{" "}
        {hasGuide(skillKey) ? (
          <Link to={`/skill/${skillKey}`}>Open the {name} guide.</Link>
        ) : (
          <Link to={`/skill/${skillKey}`}>See the {name} page.</Link>
        )}
      </p>
      <TrainingSpots skillKey={skillKey} level={level} />
    </div>
  );
}

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
  const hasRecipes = !!recipes && recipes.length > 0;
  const notLearned = level === 0;
  const { threshold, rankBy } = { threshold: state.settings.usefulThreshold, rankBy: state.settings.rankBy };
  const ranked = useMemo(
    () =>
      notLearned ? [] : rankRecipes(recipes ?? [], state.levels, skillKey, { threshold, rankBy, done: state.doneRecipes }),
    [notLearned, recipes, state.levels, skillKey, threshold, rankBy, state.doneRecipes],
  );
  const shownRanked = showLow ? ranked : ranked.filter((r) => r.useful);
  const hiddenLow = ranked.length - ranked.filter((r) => r.useful).length;
  const plan = useMemo(
    () => firstTimePlan(recipes ?? [], state.levels, state.doneRecipes, showDone),
    [recipes, state.levels, state.doneRecipes, showDone],
  );
  const intro = useMemo(() => (notLearned ? introRecipes(recipes ?? []) : []), [notLearned, recipes]);
  const unlocks = nextUnlocks(data, skillKey, level);
  const hint = nextAdvancementHint(skill, level);
  const toNext = xpToNextLevel(data, skillKey, level);
  const tasks = state.customTasks.filter((t) => t.skill === skillKey && (showDone || !t.done));

  if (!skill) return null;

  const firstTimeRow = (r: RecipeEntry, ahead: boolean) => (
    <RecipeRow
      key={r.id}
      data={data}
      recipe={r}
      ahead={ahead}
      dim={!!state.doneRecipes[r.id]}
      firstBonus={r.xpFirst}
      firstTime={{
        done: !!state.doneRecipes[r.id],
        onChange: (done) => dispatch({ type: "setRecipeDone", recipe: r.id, done }),
      }}
    />
  );

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
            label={`Level of ${skill.name}`}
            onChange={(n) => dispatch({ type: "setLevel", skill: skillKey, level: n })}
          />
        </label>
        {toNext !== undefined && !notLearned && <span className="text-muted text-sm">XP to the next level: {toNext}</span>}
      </header>

      {tasks.length > 0 && (
        <div>
          <h3 className="font-medium mb-1">Your tasks</h3>
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={t.done}
                  aria-label={`Done: ${t.text}`}
                  onChange={(e) => dispatch({ type: "setTaskDone", id: t.id, done: e.target.checked })}
                />
                <span className={t.done ? "line-through text-muted" : ""}>{t.text}</span>
                {t.targetLevel !== undefined && (
                  <span className="text-muted text-sm">
                    target: level {t.targetLevel}
                    {level >= t.targetLevel ? " (reached)" : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {notLearned && <LearnSection data={data} skillKey={skillKey} intro={intro} />}

      <div>
        <h3 className="font-medium mb-1">Next unlocks</h3>
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
          <p className="text-muted">No further rewards in the data.</p>
        )}
        {hint && (
          <p className="text-sm text-muted mt-1">
            XP cap at level {hint.level}: {hint.text}
          </p>
        )}
      </div>

      {!hasRecipes ? (
        <NoRecipes skillKey={skillKey} name={skill.name} level={level} combat={!!skill.combat} />
      ) : (
        !notLearned && (
          <>
            <div>
              <h3 className="font-medium mb-1">
                Recipes by XP <span className="text-warn text-sm font-normal">(estimate, the XP drop-off formula is not verified)</span>
              </h3>
              {shownRanked.length === 0 ? (
                <p className="text-muted">
                  No recipe at this level gives enough XP.
                  {hiddenLow > 0 && ` ${hiddenLow} low-XP ${plural(hiddenLow, "recipe is", "recipes are")} hidden.`}
                </p>
              ) : (
                <ul>
                  {shownRanked.slice(0, recipeLimit).map((r) => (
                    <RecipeRow
                      key={r.recipe.id}
                      data={data}
                      recipe={r.recipe}
                      xp={r.xp}
                      factor={r.factor}
                      firstBonus={r.firstBonus}
                      dim={!r.useful}
                    />
                  ))}
                </ul>
              )}
              {shownRanked.length > recipeLimit && (
                <button className="btn mt-2" onClick={() => setRecipeLimit((n) => n + PAGE)}>
                  Show more ({shownRanked.length - recipeLimit} left)
                </button>
              )}
              {!showLow && hiddenLow > 0 && shownRanked.length > 0 && (
                <p className="text-sm text-muted mt-1">
                  {hiddenLow} low-XP {plural(hiddenLow, "recipe is", "recipes are")} hidden.
                </p>
              )}
            </div>

            <div>
              <h3 className="font-medium mb-1">First-craft bonus</h3>
              {plan.now.length === 0 ? (
                <p className="text-muted">No recipe with a first-craft bonus is available at this level.</p>
              ) : (
                <ul>{plan.now.slice(0, firstLimit).map((r) => firstTimeRow(r, false))}</ul>
              )}
              {plan.now.length > firstLimit && (
                <button className="btn mt-2" onClick={() => setFirstLimit((n) => n + PAGE)}>
                  Show more ({plan.now.length - firstLimit} left)
                </button>
              )}
              {plan.ahead.length > 0 && (
                <>
                  <h4 className="font-medium mt-3 mb-1">Coming up</h4>
                  <ul>{plan.ahead.map((r) => firstTimeRow(r, true))}</ul>
                </>
              )}
            </div>
          </>
        )
      )}
    </section>
  );
}
