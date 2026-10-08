import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { advancementHints, allRewards, trainersFor } from "../lib/unlocks";
import { estimateXp, groupByLevelBand } from "../lib/xp";
import { getLevel, isTracked } from "../lib/state";
import { hasGuide, loadGuide } from "../lib/guides";
import { useAppState } from "../store";
import { Badge, LevelInput, Toggle, WithData } from "../components/common";
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
      <h2 className="text-xl font-semibold">Průvodce</h2>
      <div className="guide bg-panel border border-line rounded-lg p-4">
        {text === undefined ? <p className="text-muted">Načítám.</p> : <Markdown>{text}</Markdown>}
      </div>
    </section>
  );
}

const KIND_LABEL = { recipe: "recept", ability: "schopnost", bonus: "bonusový level pro", note: "" } as const;

function Detail({ data, skillKey }: { data: GameData; skillKey: string }) {
  const { state, dispatch } = useAppState();
  const skill = data.skills[skillKey];
  if (!skill) {
    return (
      <p>
        Skill „{skillKey}“ v datech není. <Link to="/skilly">Zpět na seznam skillů</Link>.
      </p>
    );
  }
  const level = getLevel(state, skillKey);
  const rewards = allRewards(data, skillKey);
  const hints = advancementHints(skill);
  const trainers = trainersFor(data, skillKey);
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
              label={`Level skillu ${skill.name}`}
              onChange={(n) => dispatch({ type: "setLevel", skill: skillKey, level: n })}
            />
          </label>
          <Toggle
            checked={isTracked(state, skillKey)}
            onChange={(v) => dispatch({ type: "setTracked", skill: skillKey, tracked: v })}
          >
            sleduji
          </Toggle>
          {skill.maxLevel && <span className="text-muted text-sm">XP tabulka sahá do levelu {skill.maxLevel}</span>}
        </div>
      </header>

      {hints.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Zvyšování stropu levelu</h2>
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
        <h2 className="text-xl font-semibold">Odměny za levely</h2>
        {rewards.length === 0 ? (
          <p className="text-muted">Skill nemá v datech žádné odměny.</p>
        ) : (
          <ol className="bg-panel border border-line rounded-lg p-3 space-y-1">
            {rewards.map((u, i) => (
              <li key={i} className={u.level <= level ? "text-muted" : ""} title={u.desc}>
                <span className="inline-block w-20 text-accent">level {u.level}</span>
                {KIND_LABEL[u.kind]} {u.name}
                {u.note && u.kind !== "note" && <span className="text-muted"> ({u.note})</span>}
                {u.level <= level && <span className="text-good"> hotovo</span>}
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Trenéři</h2>
        {trainers.length === 0 ? (
          <p className="text-muted">Žádný NPC tento skill v datech neučí.</p>
        ) : (
          <ul className="bg-panel border border-line rounded-lg p-3 space-y-1">
            {trainers.map((k) => {
              const npc = data.npcs[k];
              return (
                <li key={k}>
                  {npc.name} <span className="text-muted">({data.areas[npc.area] ?? npc.area})</span>
                  {npc.trainFavor && <span className="text-muted">, trénink od favoru {npc.trainFavor}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">
          Recepty ({recipes.length}){" "}
          <span className="text-warn text-sm font-normal">XP je odhad pro váš level, vzorec není ověřený</span>
        </h2>
        {bands.length === 0 ? (
          <p className="text-muted">Skill nemá recepty. Roste používáním ve hře.</p>
        ) : (
          bands.map((b) => (
            <details key={b.from} open={level >= b.from && level <= b.to} className="bg-panel border border-line rounded-lg">
              <summary className="cursor-pointer px-3 py-2 font-medium">
                Levely {b.from} až {b.to} <Badge>{b.recipes.length}</Badge>
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
