import { createGameData } from "./gamedata";
import type { GameData, RawGameData } from "./types";
import meta from "../data/meta.json";

export const gameMeta = meta as unknown as RawGameData["meta"];

let cache: Promise<GameData> | undefined;

/**
 * Loads the game data once. The JSON files are dynamic imports, so Vite splits them into
 * separate chunks and the shell of the app renders before they arrive.
 */
export function loadGameData(): Promise<GameData> {
  cache ??= (async () => {
    const [skills, xptables, recipes, items, recipeSources, itemSources, npcs, areas, quests, abilities] =
      await Promise.all([
        import("../data/skills.json"),
        import("../data/xptables.json"),
        import("../data/recipes.json"),
        import("../data/items.json"),
        import("../data/recipe-sources.json"),
        import("../data/item-sources.json"),
        import("../data/npcs.json"),
        import("../data/areas.json"),
        import("../data/quests.json"),
        import("../data/abilities.json"),
      ]);
    const raw = {
      meta: gameMeta,
      skills: skills.default,
      xptables: xptables.default,
      recipes: recipes.default,
      items: items.default,
      recipeSources: recipeSources.default,
      itemSources: itemSources.default,
      npcs: npcs.default,
      areas: areas.default,
      quests: quests.default,
      abilities: abilities.default,
    } as unknown as RawGameData;
    return createGameData(raw);
  })();
  return cache;
}
