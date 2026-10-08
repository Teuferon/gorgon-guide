# Handoff

Read this file before you start work. Update it when you finish a piece of work: move done items out, add new open items and decisions.

Last update: 2026-10-08.

## The user and the goal

The user plays Project Gorgon as a human character. Archery is the main skill (about level 20), Animal Handling the second (about level 15). They are deciding between Mentalism and Druid as a later combat skill and have about 100,000 councils, which they are saving for the level 50 skill unlocks. They plan to make money from work orders and later their own player shop.

The app is their personal guide. They enter their skill levels, and the app shows what to do next, in which order to level skills, and how to train them cheaply. Done items disappear as they progress. Crafting and gathering skills matter as much as combat skills (Fletching, Cooking, Gardening, Mycology, Foraging and others).

Decisions the user made:

- The app is English only: UI, guides and README. Internal notes in `docs/` may stay Czech. Talk to the user in Czech.
- No player market prices. Only vendor prices count, because player shop prices vary too much.
- Drop and training locations come from the wiki. If the wiki does not have something, leave it out rather than guess.
- The repo is public and deploys to GitHub Pages: https://teuferon.github.io/gorgon-guide/
- All writing follows `.claude/skills/unslop/SKILL.md` (see `AGENTS.md`).

## What exists

- A Vite, React and TypeScript app with Tailwind. It has a hash router and keeps its state in localStorage. There is no backend.
- Pages:
  - Next steps (`#/`)
  - Roadmap (`#/roadmap`)
  - My skills (`#/skills`)
  - Custom tasks (`#/tasks`)
  - Skill detail (`#/skill/:name`)
- `src/lib/` holds the pure logic, and Vitest covers it with 79 tests.
- `src/data/*.json` is trimmed official game data, version v486, built by `scripts/fetch-data.mjs`. `docs/data-sources.md` describes it.
- `src/data/wiki-*.json` holds zones, monsters, item locations and NPC locations from the wiki MediaWiki API at `https://wiki.projectgorgon.com/api.php` (not `/w/api.php`), built by `scripts/fetch-wiki.mjs`. `docs/wiki-data.md` describes it.
- `src/content/guides/<SkillKey>.md` has 17 skill guides, shown on the skill detail page.
- `src/content/roadmap.json` has 17 milestones in 4 phases.
- `docs/research/*.md` is the Czech research the guides and roadmap come from. Every claim has a source link.
- `.github/workflows/deploy.yml` builds, tests and deploys to GitHub Pages on every push to `main`.

Commands: `npm run dev`, `npm test`, `npm run build`, `npm run fetch-data`, `node scripts/fetch-wiki.mjs` (has `--refresh` and `--offline`).

The dev server on this Windows machine binds to `::1` by default. Use `--host 127.0.0.1` if a browser preview cannot connect. Port 5173 may be taken by another app.

## Verify in the game

The user does not have the game on the work PC. Ask them to check these at home and then fix the code or content:

1. The recipe XP drop-off formula in `src/lib/xp.ts` (`dropOffFactor`). It is our reading of `DropOffLevel`, `Pct` and `Rate`. To check it, compare the estimate for one recipe above its drop-off level with the XP the game gives.
2. The meaning of the XP table. We assume `XpAmounts[n-1]` is the XP from level n-1 to n.
3. Whether Elahil's arrow prices are per arrow or per bundle. A roadmap milestone mentions this.
4. Whether a bow counts as the wooden item Druid needs.
5. The Archery level cap. The wiki says 90, but the XP table has 100 rows and abilities go to 125.

## Known weaknesses

- Training spots use the wiki's recommended level ranges for zones. Wide zones such as Serbule (1-30) show up at almost every low level. Zones can also rank close to your level while their listed monsters sit a few levels higher, for example Ranalon Den.
- Monster levels are approximate. The wiki has a loot level for only 376 of 986 monsters, and the app lists only those.
- Drop lists are player-reported, incomplete and have no drop rates.
- Nine raw ingredients have no known source: the five Arrow Shafts tiers, Aktaari Bile Gland, Licking Moss, Sour Cream and Triceratops Horn Bone.
- Zone harvest lists use plant names (Red Aster) rather than seed names (Red Aster Seeds), so some gathering spots do not match items.
- Only 111 NPCs have price lists on the wiki.
- 293 of 4614 recipes have no source in the official data.
- The cost of learning a skill or recipe is not in the official data. The app says so instead of guessing.
- The first-craft checklist repeats recipes that are also in the ranking list.
- Animal Handling shows at most 6 tameable animals, and item drop lists show the first 4 monsters plus a link.
- `recipes.json` is a 1.9 MB chunk (174 KB gzipped), loaded lazily.
- The research could not read Reddit, the official forum or Steam guides because they blocked the requests. Player opinion after the 2025 combat changes is thin.
- Some roadmap level conditions are our own choices, not research facts: Carpentry 30, Skinning 15 and Archery 35 as the end of phase A.

## Open questions in the research

These are listed in `docs/research/*.md` and in the "Open questions" sections of the guides:

- Squidlips and Velkort ability prices.
- Upper-tier unlock costs for Druid and Mentalism.
- The Potent Acidic Cleanser recipe.
- Where Basic Fish Scales come from.
- The basic First Aid kit recipes.
- Several sources disagree:
  - Oak Dowels output size.
  - The cooldown on arrow work orders.
  - Who unlocks Animal Handling, Gisli or Crelpin.

## Ideas for next steps

- After a game patch, rerun the data scripts and check that the parsers still work. The CDN keeps only the last three or four versions, and the format can change.
- Calibrate the XP estimate once the user reports numbers from the game.
- Read more of the Cooking, Mycology, Foraging, Gardening and Carpentry wiki pages through the API. The first research pass read them as HTML and did not finish them.
- Rank training zones by how many monsters near your level they have, not only by the zone's recommended range.
