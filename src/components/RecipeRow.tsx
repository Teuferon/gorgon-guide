import { useState } from "react";
import { describeRecipeSource, resolveIngredient, resolveRecipeSources, type ResolvedIngredient } from "../lib/sources";
import { Badge, fmtXp } from "./common";
import type { GameData, RecipeEntry } from "../lib/types";

export interface RecipeRowProps {
  data: GameData;
  recipe: RecipeEntry;
  /** Estimated XP per craft. Leave out to hide the XP badge. */
  xp?: number;
  factor?: number;
  dim?: boolean;
  /** First-time bonus shown next to the regular XP (0 or undefined hides it). */
  firstBonus?: number;
  /** Shows "from level X" instead of "level X", for recipes above the current level. */
  ahead?: boolean;
  /** Set to show a first-time checkbox. */
  firstTime?: { done: boolean; onChange: (done: boolean) => void };
}

function Ingredient({ ing }: { ing: ResolvedIngredient }) {
  if (ing.kind === "keyword") {
    return (
      <li>
        {ing.qty}x {ing.name} (any item with the keyword {ing.keywords.join(", ")})
        {ing.examples.length > 0 && (
          <span className="text-muted">
            , for example {ing.examples.map((e) => `${e.name} (base value ${e.baseValue})`).join(", ")}
          </span>
        )}
      </li>
    );
  }
  const { source } = ing;
  return (
    <li>
      {ing.qty}x {ing.name}
      {ing.baseValue !== undefined && <span className="text-muted">, base value {ing.baseValue}</span>}
      <div className="text-muted text-sm">
        {source.vendors.length > 0 ? (
          <>
            sold by{" "}
            {source.vendors
              .slice(0, 3)
              .map((v) => `${v.npcName}${v.areaName ? ` (${v.areaName})` : ""}${v.favor ? `, favor ${v.favor}` : ""}`)
              .join("; ")}
            {source.vendors.length > 3 && ` and ${source.vendors.length - 3} more`}
          </>
        ) : (
          source.labels.join("; ")
        )}
      </div>
    </li>
  );
}

function Details({ data, recipe }: { data: GameData; recipe: RecipeEntry }) {
  const sources = resolveRecipeSources(data, recipe.id);
  const results = recipe.results ?? recipe.protoResults ?? [];
  return (
    <div className="mt-2 pl-7 space-y-2 text-sm">
      <div>
        <div className="text-muted">Ingredients</div>
        <ul className="list-disc pl-5">
          {(recipe.ingredients ?? []).map((ing, i) => (
            <Ingredient key={i} ing={resolveIngredient(data, ing)} />
          ))}
          {(recipe.ingredients ?? []).length === 0 && <li>none</li>}
        </ul>
      </div>
      {results.length > 0 && (
        <div>
          <span className="text-muted">Makes: </span>
          {results.map((r) => `${r.qty}x ${r.name}`).join(", ")}
        </div>
      )}
      <div>
        <span className="text-muted">Where to learn: </span>
        {sources.map(describeRecipeSource).join("; ")}
      </div>
    </div>
  );
}

export function RecipeRow({ data, recipe, xp, factor, dim, firstBonus, ahead, firstTime }: RecipeRowProps) {
  const reducedBy = factor !== undefined && factor < 1 ? Math.round((1 - factor) * 100) : 0;
  // Ingredient and source lookups run only for rows the user opens.
  const [open, setOpen] = useState(false);
  return (
    <li className={`py-2 border-t border-line first:border-t-0 ${dim ? "opacity-50" : ""}`}>
      <details onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="cursor-pointer flex flex-wrap items-center gap-2 list-none">
          {firstTime && (
            <input
              type="checkbox"
              aria-label={`Done: ${recipe.name}`}
              checked={firstTime.done}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => firstTime.onChange(e.target.checked)}
            />
          )}
          <span className="font-medium">{recipe.name}</span>
          <Badge tone={ahead ? "warn" : "muted"}>{ahead ? `from level ${recipe.level}` : `level ${recipe.level}`}</Badge>
          {xp !== undefined && (
            <Badge tone="good">
              ~{fmtXp(Math.round(xp * 10) / 10)} XP per craft{reducedBy > 0 ? `, ${reducedBy}% less` : ""}
            </Badge>
          )}
          {firstBonus !== undefined && firstBonus > 0 && <Badge tone="warn">+{firstBonus} XP first craft</Badge>}
          {recipe.xpSkill && <Badge>XP goes to another skill</Badge>}
        </summary>
        {open && <Details data={data} recipe={recipe} />}
      </details>
    </li>
  );
}
