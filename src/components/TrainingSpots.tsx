import { findTameable, findTrainingZones } from "../lib/training";
import { WikiLink } from "./common";
import type { GameData } from "../lib/types";

/**
 * Training spots for a combat skill at the current level, from the wiki data
 * (docs/wiki-data.md). Zones come from recommended level ranges, monsters from their loot level.
 * Both are approximate and the card says so. Animal Handling also lists tameable animals.
 */
export function TrainingSpots({ data, skillKey, level }: { data: GameData; skillKey: string; level: number }) {
  const zones = findTrainingZones(data.wiki, level);
  const tameable = skillKey === "AnimalHandling" ? findTameable(data.wiki, level) : [];

  return (
    <div className="space-y-2 text-sm" data-slot="training-spots" data-skill={skillKey}>
      <h4 className="font-medium text-base">Training spots for level {level}</h4>
      {zones.length === 0 ? (
        <p className="text-muted">The wiki data has no zone for this level.</p>
      ) : (
        <ul className="space-y-1">
          {zones.map((z) => (
            <li key={z.name}>
              <WikiLink href={z.url}>{z.name}</WikiLink>, recommended level {z.levels}
              {z.distance > 0 && <span className="text-muted"> ({z.distance} levels away from you)</span>}
              {z.monsters.length > 0 ? (
                <span>
                  {": "}
                  {z.monsters.map((m, i) => (
                    <span key={m.name}>
                      {i > 0 && ", "}
                      <WikiLink href={m.url}>{m.name}</WikiLink> (level ~{m.level})
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-muted">: no monster levels on the wiki near your level</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {tameable.length > 0 && (
        <div>
          <h5 className="font-medium">Animals you can tame around level {level}</h5>
          <ul className="space-y-0.5">
            {tameable.map((t) => (
              <li key={t.name}>
                <WikiLink href={t.url}>{t.name}</WikiLink>, tame level {t.tameLevel}, {t.petType}
                {t.zone && (
                  <>
                    {" in "}
                    <WikiLink href={t.zoneUrl ?? t.url}>{t.zone}</WikiLink>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-muted">
        Zone levels are the recommended player levels from the wiki and stand in for your skill level. Monster levels
        are approximate (the loot level on the monster page). Lists are community data and can be incomplete.
      </p>
    </div>
  );
}
