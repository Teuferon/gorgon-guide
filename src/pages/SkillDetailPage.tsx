import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { advancementHints, allRewards } from "../lib/unlocks";
import { resolveTrainers } from "../lib/sources";
import { estimateXp, groupByLevelBand } from "../lib/xp";
import { getLevel, isTracked } from "../lib/state";
import { hasGuide, loadGuide } from "../lib/guides";
import { useAppState } from "../store";
import { Badge, LevelInput, Toggle, WikiLink, WithData } from "../components/common";
import { RecipeRow } from "../components/RecipeRow";
import type { GameData } from "../lib/types";

function Guide({ skillKey }: { skillKey: string }) {
  const [text, setText] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    setText(undefined);
    loadGuide(skillKey).then((t) => !cancelled && setText(t));
    return () => {
      cancelled = true;
    };
  }, [skillKey]);
  if (!hasGuide(skillKey)) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Guide</h2>
      <div className="guide bg-panel border border-line rounded-lg p-4">
        {text === undefined ? <p className="text-muted">Loading.</p> : <Markdown>{text}</Markdown>}
      </div>
    </section>
  );
}

const KIND_LABEL = { recipe: "recipe", ability: "ability", bonus: "bonus level for", note: "" } as const;

function Detail({ data, skillKey }: { data: GameData; skillKey: string }) {
  const { state, dispatch } = useAppState();
  const skill = data.skills[skillKey];
  if (!skill) {
    return (
      <p>
        There is no skill "{skillKey}" in the data. <Link to="/skills">Back to the skill list</Link>.
      </p>
    );
  }
  const level = getLevel(state, skillKey);
  const rewards = allRewards(data, skillKey);
  const hints = advancementHints(skill);
  const trainers = resolveTrainers(data, skillKey);
  const recipes = (data.recipesByRequiredSkill.get(skillKey) ?? []).filter((r) => !r.notObtainable);
  const bands = groupByLevelBand(recipes);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{skill.name}</h1>
        {skill.desc && <p className="text-muted">{skill.desc}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-muted">level</span>
            <LevelInput
              value={level}
              label={`Level of ${skill.name}`}
              onChange={(n) => dispatch({ type: "setLevel", skill: skillKey, level: n })}
            />
          </label>
          <Toggle
            checked={isTracked(state, skillKey)}
            onChange={(v) => dispatch({ type: "setTracked", skill: skillKey, tracked: v })}
          >
            tracking
          </Toggle>
          {skill.maxLevel && <span className="text-muted text-sm">The XP table goes up to level {skill.maxLevel}</span>}
        </div>
      </header>

      {hints.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Raising the level cap</h2>
          <ul className="bg-panel border border-line rounded-lg p-3 space-y-1">
            {hints.map((h) => (
              <li key={h.level} className={level >= h.level ? "text-muted" : ""}>
                <span className="text-accent">level {h.level}</span> {h.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Level rewards</h2>
        {rewards.length === 0 ? (
          <p className="text-muted">This skill has no rewards in the data.</p>
        ) : (
          <ol className="bg-panel border border-line rounded-lg p-3 space-y-1">
            {rewards.map((u, i) => (
              <li key={i} className={u.level <= level ? "text-muted" : ""} title={u.desc}>
                <span className="inline-block w-20 text-accent">level {u.level}</span>
                {KIND_LABEL[u.kind]} {u.name}
                {u.note && u.kind !== "note" && <span className="text-muted"> ({u.note})</span>}
                {u.level <= level && <span className="text-good"> reached</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Trainers</h2>
        {trainers.length === 0 ? (
          <p className="text-muted">No NPC trains this skill in the data.</p>
        ) : (
          <ul className="bg-panel border border-line rounded-lg p-3 space-y-1">
            {trainers.map((t) => (
              <li key={t.npc}>
                {t.npcName}{" "}
                <span className="text-muted">
                  (
                  {t.location ? <WikiLink href={t.location.url}>{t.location.text}</WikiLink> : t.areaName}
                  )
                </span>
                {t.favor && <span className="text-muted">, trains from favor {t.favor}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">
          Recipes ({recipes.length}){" "}
          <span className="text-warn text-sm font-normal">XP is an estimate for your level, the formula is not verified</span>
        </h2>
        {bands.length === 0 ? (
          <p className="text-muted">This skill has no recipes. You level it by using it in the game.</p>
        ) : (
          bands.map((b) => (
            <details key={b.from} open={level >= b.from && level <= b.to} className="bg-panel border border-line rounded-lg">
              <summary className="cursor-pointer px-3 py-2 font-medium">
                Levels {b.from} to {b.to} <Badge>{b.recipes.length}</Badge>
              </summary>
              <ul className="px-3 pb-2">
                {b.recipes.map((r) => (
                  <RecipeRow
                    key={r.id}
                    data={data}
                    recipe={r}
                    dim={level < r.level}
                    xp={r.xp > 0 && !r.noXp ? estimateXp(r, getLevel(state, r.xpSkill ?? r.skill)) : undefined}
                  />
                ))}
              </ul>
            </details>
          ))
        )}
      </section>

      <Guide skillKey={skillKey} />
    </div>
  );
}

export default function SkillDetailPage() {
  const { name = "" } = useParams();
  return (
    <WithData>{(data) => <Detail data={data} skillKey={name} />}</WithData>
  );
}
