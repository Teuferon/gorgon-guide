# Data z wiki

Oficiální JSON soubory neříkají, kde padají předměty, kde se sbírají suroviny, v jakém levelu je zóna a kde stojí NPC (viz „Mezery v datech“ v `docs/data-sources.md`). Tyhle údaje tahá skript `scripts/fetch-wiki.mjs` z wiki Project Gorgon a ukládá je do `src/data/wiki-*.json`.

Stav ověřený 8. 10. 2026. Každé tvrzení z těchto souborů je komunitní údaj z wiki, takže u něj v aplikaci uváděj odkaz na stránku (viz „Odkazy na zdroj“).

## Jak wiki data ukládá

- Wiki běží na MediaWiki 1.45.3. API je na `https://wiki.projectgorgon.com/api.php` (ne `/w/api.php`).
- Cargo ani Semantic MediaWiki tam nejsou. Akce `cargotables`, `cargoquery` a `ask` API nezná. Data jsou přímo ve wikitextu stránek.
- Jsou nainstalované DynamicPageList4 a ParserFunctions. Tabulka „Drops“ na stránce předmětu je jen DPL dotaz na kategorii `Loot/<předmět>`. Do kategorie ji zapisují stránky monster přes šablonu `{{Loot|předmět}}`. Proto jsem pády bral ze stránek monster a ne ze stránek předmětů.
- Wiki je za Cloudflare. Skript posílá popisný User-Agent a mezi požadavky čeká 400 ms.

Kde která informace leží:

| Údaj | Stránka | Šablona nebo místo |
|---|---|---|
| Kde monstrum žije | stránka monstra | `{{MOB Location}}` s poli `area`, `location`, `health`, `lootlevel`, `time` |
| Skin, maso, lebka, bonusy | stránka monstra | `{{Loot}}` pod `{{Header}}` v sekci „Miscellaneous“ |
| Co monstrum dropuje | stránka monstra | `{{Loot}}` v sekci „Reported Loot“, rarita podle nadpisů Common až Ultra Rare |
| Ochočení zvířete | stránka monstra | `{{MOB AH}}` (level k ochočení, typ) |
| Rozsah levelů zóny | stránka zóny | `{{MAP infobox}}` pole `pclevel`, u dungeonů `{{DUNGEON infobox}}` pole `arealevel` |
| Co se v zóně sbírá | stránka zóny | sekce „Harvestables“ (Fish, Fruit, Plants, Wood, Mushrooms) |
| Level a místa sběru | stránky Foraging, Mycology, Gardening, Mining, Skinning | tabulky s Item, Level, Location |
| Poloha NPC | stránka NPC | `{{NPC infobox}}` pole `zone`, `town`, `location`, `wander` a sekce „Location“ |
| Co NPC prodává a za kolik | `<NPC>/Items sold` | `{{vendor item row}}` s poli `item`, `cost`, `favor` |

Monstra, NPC a zóny se najdou přes kategorie (`Creatures by Area` a její podkategorie, `NPCs`, `Zones`, `Dungeons`, `Items sold`).

## Co skript stahuje

Sleduje ingredience receptů skillů Fletching, Cooking, Gardening, Mycology, Foraging, Butchering, Skinning, Tanning, Carpentry a Alchemy do levelu 50. Seznam skillů a strop levelu jsou na začátku skriptu (`TRACKED_SKILLS`, `MAX_RECIPE_LEVEL`). Ingredience zadané keywordem (například `CheapMeat`, `RawMushroom`) skript rozbalí na všechny položky s tím keywordem.

Počet stažených stránek: 989 monster, 394 NPC, 69 zón a dungeonů, 111 podstránek obchodníků, 9 stránek skillů a 1048 stránek předmětů. Celé stahování dělá asi 120 požadavků, trvá pár minut. Další běh bere stránky z cache a na wiki nesahá.

## Spuštění

```
node scripts/fetch-wiki.mjs             stáhne chybějící stránky a sestaví výstup
node scripts/fetch-wiki.mjs --refresh   ignoruje cache a stáhne vše znovu
node scripts/fetch-wiki.mjs --offline   sestaví výstup jen z cache
```

- Vyžaduje Node 18 nebo novější, žádné balíčky. Skript čte `src/data/recipes.json`, `items.json`, `item-sources.json` a `npcs.json`, takže nejdřív musí proběhnout `node scripts/fetch-data.mjs`.
- Cache je v `data/wiki-raw/` (v `.gitignore`, asi 36 MB). Jedna stránka je jeden soubor, odpovědi na seznamy kategorií jsou ve `data/wiki-raw/api/`.
- Po úpravě parseru stačí `--offline`. Po změně na wiki je potřeba `--refresh`, nebo smazat konkrétní soubor v cache.
- Výstup se commituje, aby build aplikace nepotřeboval síť.
- Skript při konci výpisu vypíše velikosti, počty, pokrytí a seznam surovin bez známého místa.

## Výstupní soubory

Všechny jsou minifikovaný JSON v `src/data/`.

| Soubor | Velikost | gzip |
|---|---|---|
| `wiki-zones.json` | 108 KB | 30 KB |
| `wiki-monsters.json` | 280 KB | 52 KB |
| `wiki-item-locations.json` | 275 KB | 45 KB |
| `wiki-npcs.json` | 64 KB | 15 KB |
| `wiki-meta.json` | 1 KB | 1 KB |

### `wiki-zones.json`

Klíč je jméno zóny tak, jak ho píšou stránky monster (`Serbule`, `Brain Bug Cave`). Alias: stránka „Anagoge Island“ je pod klíčem `Anagoge`, „War Caches“ pod `War Cache`.

- `name`, `page` (titulek wiki stránky), `kind` (`zone`, `dungeon`, nebo `area` bez vlastní stránky).
- `levels` (text, například `20-50`), `minLevel`, `maxLevel`. Jsou to doporučené levely hráče z infoboxu.
- `connects` (sousední zóny), `portal` (popis portálu), `desc` (první odstavec, zkrácený).
- `monsters`: `[{name, lootLevel?, health?}]` seřazené od nejslabších. `lootLevel` je úroveň lootu uvedená na stránce monstra v dané zóně a funguje jako odhad levelu monstra.
- `harvest`: co zóna podle wiki nabízí ke sběru, členěné na Fish, Fruit, Plants, Wood, Mushrooms a další. Poznámka v závorce (například „rare“) zůstává u jména.
- `gathering`: položky z tabulek skillů s levelem, třeba `Bluebell Seeds (Foraging 0)`.
- `npcs`: jména NPC, která stránka NPC řadí do zóny.

### `wiki-monsters.json`

Klíč je jméno monstra.

- `type` (Canine, Rodent a podobně).
- `zones`: `[{zone, where?, lootLevel?, health?, time?}]`. `where` je popis místa z wiki, anglicky.
- `skin`, `skinBonus`, `butcher`, `butcherBonus`, `skull`: jména předmětů, které dává skinning, butchering a extrakce lebky.
- `loot`: jen předměty z množiny ingrediencí (viz výše), jako objekt `jméno: rarita` (`common`, `uncommon`, `rare`, `ultra rare`, nebo `null`, když stránka rarity nerozlišuje). `lootTotal` je celkový počet nahlášených předmětů na stránce.
- `tame`: `{level, type}` pro zvířata, která jde ochočit v Animal Handling (50 monster).

### `wiki-item-locations.json`

Klíč je ID předmětu z `items.json`. Má ho 822 předmětů, u kterých wiki něco ví. Pole existuje jen tehdy, když má obsah.

- `name`, `wiki` (titulek stránky).
- `skin`, `skinBonus`, `butcher`, `butcherBonus`, `skull`: jména monster.
- `loot`: `[{mob, rarity?}]`, nejvýš 25 monster od nejslabších. Při větším počtu je v `lootTotal` celkový počet.
- `dropZones`: zóny, kde padá, od nejčastější, nejvýš 10.
- `gather`: záznamy z tabulek skillů `{skill, level?, zones?, where?, creatures?}`.
- `harvestZones`: zóny, kde je předmět v seznamu „Harvestables“.
- `grow`: `{seed, level, growTime, fertilizer}`, když se předmět pěstuje v Gardening.
- `buy`: `[{npc, zone?, cost, qty?, favor?, currency?}]`. `cost` je cena za `qty` kusů (výchozí 1), v councils, jen když je `currency` jiná, třeba `gold`.
- `gatherNote`, `note`: volný text ze stránek předmětu (anglicky, zkrácený na 400 znaků).

Cena v `buy` je cena z wiki, ne z dat hry. Záleží na favoru, který wiki uvádí jen u části řádků.

### `wiki-npcs.json`

Klíč je interní jméno NPC z `npcs.json` (`NPC_Elahil`). Spárováno 298 z 341 NPC, všechna spárovaná mají popis místa.

- `name`, `zone`, `town` (budova nebo osada), `location` (krátký popis z infoboxu), `wander` (kam NPC chodí), `detail` (text ze sekce Location, zkrácený na 300 znaků), `wiki`.
- Příklad: Elahil, zóna Serbule, Serbule Keep, „Around the eastern gate“.

### `wiki-meta.json`

Čas generování, adresa zdroje, šablona URL stránky, počty a pokrytí.

## Odkazy na zdroj

URL stránky je `https://wiki.projectgorgon.com/wiki/` plus titulek stránky s podtržítky místo mezer (pole `wiki`, `page`). U údajů, které skript skládá z více stránek (`dropZones`, `loot`), odkaž na stránku předmětu a u monster na stránku monstra.

Licenci textu wiki jsem nezkoumal. Skript přebírá fakta (jména, čísla, krátké poznámky), ne celé odstavce, a zkracuje je.

## Pokrytí (ingredience, 10 skillů, recepty do levelu 50)

| Metrika | Počet |
|---|---|
| Recepty sledovaných skillů do levelu 50 | 618 |
| Ingredience, které jsou konkrétní položky | 371 |
| z toho vyrábí jiný recept | 142 |
| z toho suroviny bez receptu | 229 |
| Suroviny s místem v `item-sources.json` (obchod, barter, quest a podobně) | 130 |
| Suroviny se záznamem z wiki | 211 |
| Suroviny s alespoň jedním zdrojem | 220 |
| Suroviny, které zná jen wiki | 90 |
| Suroviny s pády, sběrem nebo pěstováním | 195 |
| Recepty s místem u všech ingrediencí, jen oficiální data | 366 |
| Recepty s místem u všech ingrediencí, oficiální data a wiki | 579 |

Recept se počítá jako pokrytý, když každá jeho ingredience je vyráběná, má zdroj v `item-sources.json` nebo záznam z wiki. U ingredience zadané keywordem stačí, aby místo znala aspoň jedna položka s tím keywordem. „Záznam z wiki“ znamená skin, maso, pád, sběr, pěstování, obchodníka nebo textovou poznámku.

Další počty:

- Zóny 63, z toho 16 oblastí, 46 dungeonů a jedna bez stránky. Rozsah levelů má 61.
- Monstra 986, 980 má zónu, 376 má `lootLevel` aspoň v jedné zóně, 194 má skin nebo maso, 50 jde ochočit.
- Obchodníci s ceníkem 111 stránek.

## Známé mezery

1. Monstra nemají na wiki level. `lootLevel` je tier lootu a má ho jen 376 z 986 monster. U ostatních je jen `health`. Řadit podle levelu proto jde jen přibližně. Rozsah levelů hráče je jen u zón.
2. Rarita pádů je jen na stránkách, které používají nadpisy Common, Uncommon, Rare. Jinde je `null`. Šance pádu na wiki chybí.
3. Seznamy pádů jsou nahlášené hráči, takže nejsou úplné. Chybí-li předmět u monstra, neznamená to, že nepadá.
4. Neznámé místo mají tyto suroviny: Advanced Arrow Shafts, Basic Arrow Shafts, Beginner's Arrow Shafts, Expert's Arrow Shafts, Masterwork Arrow Shafts, Aktaari Bile Gland, Licking Moss, Sour Cream, Triceratops Horn Bone. Stránky těchto předmětů na wiki nemají vyplněné, kde se získávají (ověřeno u Basic Arrow Shafts a Sour Cream).
5. Text ze stránek předmětů (`gatherNote`, `note`) je volný, občas zastaralý nebo neúplný (například „Requires Level XX Foraging“). Slouží jako nápověda, ne jako fakt.
6. Seznamy „Harvestables“ u zón používají jména rostlin, ne semen (Red Aster místo Red Aster Seeds), takže se s předměty spárují jen někdy. Sběr semen má spolehlivěji `gather` z tabulky Foraging.
7. Ceny obchodníků pokrývají jen 111 NPC se stránkou „Items sold“. Část řádků má cenu „?“ nebo chybí favor. Cena „(x5) for 37“ je v poli `qty` a `cost`. Ceny ve zlatě mají `currency: "gold"`.
8. Do `wiki-npcs.json` se nedostalo 43 NPC z `npcs.json`. Jsou to hlavně nápisy a objekty (Work Orders, Altar, Grindstone) a několik postav (například Ashk, Fenna, Tast), které skript pod stejným jménem na wiki nenašel.
9. Popisy míst jsou anglicky. Překlad a zkrácení do UI patří aplikaci.
10. Serbule Sewers a Staging Area nemají na wiki rozsah levelů.
11. Dungeony a oblasti bez vlastní stránky (`kind: "area"`) mají jen monstra z mob stránek.
12. Parser je psaný na dnešní strukturu stránek. Když editoři změní šablony, uvidí se to na poklesu počtů ve výpisu skriptu.
