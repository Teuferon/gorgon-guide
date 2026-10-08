import { Fragment, useState, type ReactNode } from "react";
import {
  describeRecipeSource,
  describeRecipeSourceNoArea,
  resolveIngredient,
  resolveRecipeSources,
  type RecipeSourceInfo,
  type ResolvedIngredient,
  type VendorInfo,
} from "../lib/sources";
import { formatPrice, type DropInfo, type WikiItemInfo } from "../lib/wiki";
import { Badge, WikiLink, fmtXp } from "./common";
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

const MAX_VENDORS = 3;

function joinNodes(nodes: ReactNode[], sep = ", ") {
  return nodes.map((n, i) => (
    <Fragment key={i}>
      {i > 0 && sep}
      {n}
    </Fragment>
  ));
}

function Vendor({ v }: { v: VendorInfo }) {
  return (
    <li>
      {v.npcName}
      {v.location ? (
        <>
          {" "}
          (<WikiLink href={v.location.url}>{v.location.text}</WikiLink>)
        </>
      ) : (
        v.areaName && ` (${v.areaName})`
      )}
      {v.price && (
        <>
          {": "}
          <WikiLink href={v.price.url} title="Open the vendor's price list on the wiki">
            {formatPrice(v.price)}
          </WikiLink>
        </>
      )}
      {v.favor && <span className="text-muted">, favor {v.favor}</span>}
    </li>
  );
}

function mobLinks(drops: DropInfo[]) {
  return joinNodes(
    drops.map((d) => (
      <Fragment key={d.mob}>
        <WikiLink href={d.url}>{d.mob}</WikiLink>
        {d.zone && ` (${d.zone})`}
        {d.rarity && ` ${d.rarity}`}
      </Fragment>
    )),
  );
}

function WikiFacts({ info }: { info: WikiItemInfo }) {
  const more = info.dropTotal - info.drops.length;
  return (
    <div className="space-y-0.5">
      {info.drops.length > 0 && (
        <div>
          Dropped by {mobLinks(info.drops)}
          {more > 0 && (
            <>
              {" and "}
              <WikiLink href={info.url}>{more} more</WikiLink>
            </>
          )}
        </div>
      )}
      {info.skin.length > 0 && <div>Skinned from {mobLinks(info.skin)}</div>}
      {info.butcher.length > 0 && <div>Butchered from {mobLinks(info.butcher)}</div>}
      {info.gather.map((g, i) => (
        <div key={i}>
          Gathered with {g.skill}
          {g.level !== undefined && ` ${g.level}`}
          {g.zones.length > 0 && ` in ${g.zones.join(", ")}`}{" "}
          <WikiLink href={info.url}>wiki</WikiLink>
        </div>
      ))}
      {info.harvestZones.length > 0 && (
        <div>
          Harvested in {info.harvestZones.join(", ")} <WikiLink href={info.url}>wiki</WikiLink>
        </div>
      )}
      {info.grow && (
        <div>
          Grown with Gardening from {info.grow.seed}, level {info.grow.level}, grow time {info.grow.growTime}{" "}
          <WikiLink href={info.url}>wiki</WikiLink>
        </div>
      )}
      {info.note && (
        <details>
          <summary className="cursor-pointer">Wiki note (free text, may be outdated)</summary>
          <p>{info.note}</p>
        </details>
      )}
    </div>
  );
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
  // A wiki price replaces the base value. The base value is only a game-data number, not a price.
  const hasPrice = source.vendors.some((v) => v.price);
  return (
    <li>
      {ing.qty}x {ing.name}
      {!hasPrice && ing.baseValue !== undefined && <span className="text-muted">, base value {ing.baseValue}</span>}
      <div className="text-muted text-sm space-y-0.5">
        {source.vendors.length > 0 && (
          <div>
            Sold by
            <ul className="list-disc pl-5">
              {source.vendors.slice(0, MAX_VENDORS).map((v, i) => (
                <Vendor key={`${v.npc}-${v.npcName}-${i}`} v={v} />
              ))}
            </ul>
            {source.vendors.length > MAX_VENDORS && <div>and {source.vendors.length - MAX_VENDORS} more</div>}
          </div>
        )}
        {source.labels.length > 0 && <div>{source.labels.join("; ")}</div>}
        {source.wiki && <WikiFacts info={source.wiki} />}
      </div>
    </li>
  );
}

function SourceLine({ s }: { s: RecipeSourceInfo }) {
  const location = s.kind === "training" || s.kind === "hangout" || s.kind === "gift" ? s.location : undefined;
  return (
    <li>
      {location ? describeRecipeSourceNoArea(s) : describeRecipeSource(s)}
      {location && (
        <>
          {", "}
          <WikiLink href={location.url}>{location.text}</WikiLink>
        </>
      )}
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
        <div className="text-muted">Where to learn</div>
        <ul className="list-disc pl-5">
          {sources.map((s, i) => (
            <SourceLine key={i} s={s} />
          ))}
        </ul>
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
