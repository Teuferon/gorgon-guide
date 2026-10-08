import type { WikiData } from "./types";
import { wikiUrl } from "./wiki";

/**
 * Training spots for skills without recipes, from the wiki data (docs/wiki-data.md).
 * Caveats that the UI must show:
 *  - Zone ranges are recommended player levels. They are used here as a stand-in for the skill level.
 *  - Monsters have no level on the wiki. "lootLevel" is the loot tier on the monster page in that
 *    zone and is only an approximation of the monster level. Only 376 of 986 monsters have it.
 *  - Drop and zone data is reported by players and can be incomplete.
 */

export interface SpotMonster {
  name: string;
  /** Approximate level (loot level from the wiki). */
  level: number;
  url: string;
}

export interface TrainingZone {
  name: string;
  url: string;
  levels: string;
  /** 0 when the level is inside the zone range, else how many levels outside it is. */
  distance: number;
  monsters: SpotMonster[];
  /** True when the zone has monsters on the wiki but none with a known level near the target. */
  noMonsterLevels: boolean;
}

export interface TrainingOptions {
  /** How far below and above the level a zone range or monster may be. */
  zoneMargin?: number;
  monsterMargin?: number;
  maxZones?: number;
  maxMonsters?: number;
}

/** Zones whose recommended level range fits the level, closest first. */
export function findTrainingZones(wiki: WikiData, level: number, opts: TrainingOptions = {}): TrainingZone[] {
  const { zoneMargin = 5, monsterMargin = 6, maxZones = 5, maxMonsters = 4 } = opts;
  const out: TrainingZone[] = [];
  for (const zone of Object.values(wiki.zones)) {
    const { minLevel, maxLevel } = zone;
    // Zones without a range, or with "0" (sewers, rooms), say nothing about levels.
    if (minLevel === undefined || maxLevel === undefined || maxLevel === 0) continue;
    if (!zone.monsters || zone.monsters.length === 0) continue;
    const distance = level < minLevel ? minLevel - level : level > maxLevel ? level - maxLevel : 0;
    if (distance > zoneMargin) continue;
    const near = zone.monsters
      .filter((m): m is typeof m & { lootLevel: number } => m.lootLevel !== undefined && Math.abs(m.lootLevel - level) <= monsterMargin)
      .sort((a, b) => Math.abs(a.lootLevel - level) - Math.abs(b.lootLevel - level) || a.name.localeCompare(b.name))
      .slice(0, maxMonsters)
      .map((m) => ({ name: m.name, level: m.lootLevel, url: wikiUrl(wiki, m.name) }));
    out.push({
      name: zone.name,
      url: wikiUrl(wiki, zone.page),
      levels: zone.levels ?? `${minLevel}-${maxLevel}`,
      distance,
      monsters: near,
      noMonsterLevels: near.length === 0,
    });
  }
  // Zones that contain the level first, then the narrower range (more specific), then name.
  const width = (z: TrainingZone) => {
    const src = Object.values(wiki.zones).find((w) => w.name === z.name);
    return (src?.maxLevel ?? 0) - (src?.minLevel ?? 0);
  };
  out.sort((a, b) => a.distance - b.distance || b.monsters.length - a.monsters.length || width(a) - width(b) || a.name.localeCompare(b.name));
  return out.slice(0, maxZones);
}

export interface TameableMonster {
  name: string;
  /** Animal Handling level needed to tame it. */
  tameLevel: number;
  petType: string;
  zone?: string;
  url: string;
  zoneUrl?: string;
}

/**
 * Tameable animals near the level, highest tame level first. Animals up to `above` levels over
 * the current level are included so the player can see what comes next.
 */
export function findTameable(
  wiki: WikiData,
  level: number,
  opts: { below?: number; above?: number; max?: number } = {},
): TameableMonster[] {
  const { below = 10, above = 5, max = 6 } = opts;
  return Object.entries(wiki.monsters)
    .filter(([, m]) => m.tame && m.tame.level >= level - below && m.tame.level <= level + above)
    .map(([name, m]) => {
      const zone = m.zones?.[0]?.zone;
      const zonePage = zone ? wiki.zones[zone]?.page : undefined;
      return {
        name,
        tameLevel: m.tame!.level,
        petType: m.tame!.type,
        zone,
        url: wikiUrl(wiki, name),
        zoneUrl: zone ? wikiUrl(wiki, zonePage ?? zone) : undefined,
      };
    })
    .sort((a, b) => b.tameLevel - a.tameLevel || a.name.localeCompare(b.name))
    .slice(0, max);
}
