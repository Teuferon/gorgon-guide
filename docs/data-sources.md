# Zdroje dat

Aplikace nečte text z wiki. Vychází z oficiálních JSON souborů, které vývojáři Project Gorgon publikují pro nástroje třetích stran. Wiki slouží jen jako doplněk tam, kde JSON data chybí (viz „Mezery v datech“).

Stav ověřený 8. 10. 2026, verze dat 486.

## Oficiální zdroj

- Verze dat je v textovém souboru `https://client.projectgorgon.com/fileversion.txt`. Obsah je jedno číslo (nyní `486`). Pozor, host je `client.`, ne `cdn.`. Případné bílé znaky na konci je potřeba odstranit.
- Data dané verze jsou na `https://cdn.projectgorgon.com/v{verze}/data/{soubor}.json`, například `https://cdn.projectgorgon.com/v486/data/skills.json`.
- Ikony jsou na `https://cdn.projectgorgon.com/v{verze}/icons/icon_{id}.png`. ID ikony je pole `IconId` u položek a receptů, `IconID` u abilit.
- Přehled souborů a poznámky vývojářů jsou na `https://cdn.projectgorgon.com/v486/data/index.html`.
- CDN posílá hlavičku `Access-Control-Allow-Origin: *`, takže data jde číst i přímo z prohlížeče. Aplikace to nepotřebuje, data se při buildu zabalí do `src/data/`.
- HTTP i HTTPS fungují pro soubor s verzí, data i ikony. Používáme HTTPS, aby u aplikace na HTTPS nevznikl mixed content.

### Verzování

- Každá verze má vlastní číslo. Podle index.html zůstávají na CDN jen poslední tři až čtyři verze, starší se mažou. Při ověření existovaly v485 a v480, ale na to se spoléhat nedá.
- Formát souborů se může mezi verzemi změnit. Vývojáři to v index.html výslovně uvádějí (například pole `ItemCode` u ingrediencí se má přejmenovat na `ItemTypeID`). Skript proto na jednom místě převádí surová data na vlastní schéma a po každé nové verzi je dobré zkontrolovat výstup.
- Skript `scripts/fetch-data.mjs` zapisuje stažené číslo verze do `data/raw/_version.txt` a při shodné verzi stahování přeskočí.

### Licence a podmínky použití

Podmínky stojí v index.html na CDN. Podstatné body, citované věcně:

- Data jde použít v libovolných nástrojích. Autorská práva zůstávají Elder Game, LLC.
- Pokud aplikace zobrazuje text viditelný hráči (názvy položek, popisy efektů a podobně), má mít v patičce nebo v kreditech řádek ve stylu „Some portions copyright <aktuální rok> Elder Game, LLC.“. Řádek je hotový v `src/data/meta.json` v poli `copyright`.
- Elder Game si vyhrazuje právo omezit používání souborů pro konkrétní osoby nebo účely.
- Soubory je dovoleno odkazovat přímo i ukládat lokálně do cache.
- Upravovat herního klienta je proti podmínkám služby. Na čtení veřejných dat se to nevztahuje.

Wiki (`https://wiki.projectgorgon.com`) je samostatný zdroj komunitního obsahu. Licenci textu jsem nezkoumal. Jestli ze wiki cokoli přebíráme, je potřeba u každého tvrzení uvést odkaz na stránku, jak říká `AGENTS.md`.

## Jak data používají jiné nástroje

- Tabulky receptů na wiki (například stránka Cooking) mají sloupce Lvl, First-Time XP, XP, Ingredients, Results a Source. Zdroje jsou Training, Quest, Item, Hang Out a Leveling. Přesně to odpovídá typům v `sources_recipes.json` a polím v `recipes.json`, takže wiki tabulky pravděpodobně vznikají z těchto samých souborů. Že je generuje bot, jsem u wiki potvrdil jen nepřímo, existuje repozitář `alleryn/ProjectGorgonWiki-AllyBot` (bot na stránky položek).
- `dlebansais/PgJsonParse` je parser JSON souborů Project Gorgon. Stejný autor má `PgCompletionist` a `PgSearch-Disclosed`.
- `Renari/ProjectGorgonCraftingCalculator` je kalkulačka craftingu.
- Do kódu těchto nástrojů jsem nezašel. Vycházím z index.html a z vlastní analýzy dat.

## Soubory na CDN

Velikosti jsou ze stažení verze 486. Všechny soubory jsou jeden velký JSON objekt. Klíče mají tvar `item_5010`, `recipe_1`, `ability_10001`, `quest_1`, u skillů je klíč interní jméno (`Archery`), u NPC interní jméno (`NPC_Braigon`).

| Soubor | Velikost | Použito |
|---|---|---|
| `skills.json` | 310 KB | ano |
| `xptables.json` | 43 KB | ano |
| `recipes.json` | 5,0 MB | ano |
| `items.json` | 6,9 MB | ano |
| `sources_recipes.json` | 461 KB | ano |
| `sources_items.json` | 983 KB | ano |
| `npcs.json` | 288 KB | ano |
| `areas.json` | 6 KB | ano |
| `abilities.json` | 8,7 MB | ano, jen schopnosti odměňované skilly |
| `quests.json` | 4,0 MB | ano, jen názvy questů, které jsou zdrojem |
| `sources_abilities.json` | 386 KB | ne |
| `itemuses.json` | 207 KB | ne, podle vývojářů 100 % redundantní s recepty |
| `storagevaults.json` | 25 KB | ne |
| `advancementtables.json` | 3,5 MB | ne, bonusy atributů za level skillu |
| `attributes.json` | 374 KB | ne |
| `effects.json`, `tsysclientinfo.json`, `tsysprofiles.json` | | ne, buffy a náhodné vlastnosti lootu |
| `items_raw.json`, `strings_all.json`, `Translation.zip` | | ne, lokalizace |
| `ai.json`, `abilitykeywords.json`, `abilitydynamic*.json`, `directedgoals.json`, `landmarks.json`, `lorebooks.json`, `lorebookinfo.json`, `playertitles.json` | | ne |

Poznámka ke `landmarks.json` a `directedgoals.json`: nestáhl jsem je a jejich obsah neznám, jsou jen v seznamu v index.html.

### Surové schéma použitých souborů

`skills.json` (187 skillů)
- Klíč je interní jméno skillu a tak se na skill odkazují recepty (`Skill: "Cheesemaking"`).
- `Name` je zobrazované jméno, ale chybí u 40 skillů (například `Fletching`). Skript pak vyrobí jméno z klíče.
- `Id`, `Description`, `Combat` (bool), `XpTable` (jméno tabulky z `xptables.json`, ne číslo), `MaxBonusLevels`, `Parents`, `IsUmbrellaSkill`.
- `AdvancementHints`: texty pro levely 50, 60, 70, 80, 90 o tom, u koho získat favor, aby šlo skill dál levelovat.
- `InteractionFlagLevelCaps`: například `"LevelCap_Archery_60": 50`. Přesný význam jsem neověřil. Wiki u Archery říká, že další pásma levelů (51 až 60, 61 až 70 a dále) odemykají NPC přes favor, takže jde nejspíš o podmínky odemčení stropu.
- `Rewards`: klíče jsou levely (`"7"`), případně level s rasami (`"10_Human_Elf_Rakshasa_Fae_Dwarf"`, `"10_Orc"`). Hodnota je `{Recipe}`, `{Ability}`, `{BonusToSkill}` nebo `{Notes}`.

`xptables.json` (55 tabulek)
- Klíč je `Table_1` apod. (index.html tvrdí `Level_1`, to neplatí). Hodnota je `{InternalName, XpAmounts[]}`.
- Skill se odkazuje na `InternalName`. Délka pole je nejvyšší level, který tabulka řeší (typicky 100, u Lore 50).
- Předpokládám, že `XpAmounts[n-1]` je XP potřebné k přechodu z levelu n-1 na n. U `TypicalCombatSkill` je první hodnota 10, což tomu odpovídá. Přesný význam nemám z žádného zdroje potvrzený.

`recipes.json` (4614 receptů)
- `Name`, `InternalName`, `Skill`, `SkillLevelReq`.
- `RewardSkill` (skill, který dostane XP, u 11 receptů se liší od `Skill`), `RewardSkillXp`, `RewardSkillXpFirstTime` (zpravidla čtyřnásobek `RewardSkillXp`).
- `RewardSkillXpDropOffLevel`, `RewardSkillXpDropOffPct`, `RewardSkillXpDropOffRate`: pokles XP při vyšším levelu skillu. Typické hodnoty jsou level požadavku plus 10, 0.1 a 5. Přesný vzorec není nikde zdokumentovaný. Nejpravděpodobnější čtení je „nad `DropOffLevel` ubývá `Pct` základního XP za každých `Rate` levelů“. Je to hypotéza.
- `Ingredients[]`: buď `{ItemCode, StackSize}`, nebo `{ItemKeys[], Desc, StackSize}` (libovolná položka s daným keywordem, například „Cheap Meat“). Navíc `ChanceToConsume` a `DurabilityConsumed`.
- `ResultItems[]`: `{ItemCode, StackSize, PercentChance?}`. `ProtoResultItems[]` jsou neenchantované základní položky, které hra před předáním enchantuje.
- `PrereqRecipe`: interní jméno předchozího receptu v řadě.
- `Costs[]`: `{Currency, Price}` (například `CombatWisdom`).
- `Keywords[]`: například `MealRecipe`, `SnackRecipe`, `Lint_NotObtainable`, `Lint_NotLearnable`, `Lint_NoXP`.

`items.json` (11048 položek)
- `Name`, `InternalName`, `Value`, `MaxStackSize`, `IconId`, `Keywords[]`, `Description`, `EquipSlot`, `SkillReqs`, `EffectDescs`, `FoodDesc`, `BestowRecipes` (položka učí recept), `Lint_VendorNpc` (pomocné pole u work orderů).
- Keywords mají někdy číselnou hodnotu (`Milk=50`).
- `Value` je základní hodnota. Cena u obchodníka v datech není (viz mezery).
- 1122 položek má `Lint_NotObtainable`, ty skript vynechá, pokud je nepoužívá nějaký recept.

`sources_recipes.json`, `sources_items.json`
- Klíč `recipe_N` nebo `item_N`, hodnota `{entries: [...]}`. Každý záznam má `type` a podle typu pole `npc`, `questId`, `itemTypeId`, `recipeId`, `skill`, `hangOutId`.
- Typy u receptů: `Training` (3156, NPC recept učí), `Skill` (322, recept dostaneš za level skillu), `Item` (1043, učí ho položka, tedy kniha nebo svitek), `Quest`, `HangOut`, `NpcGift`, `Effect`.
- Typy u položek: `Vendor` (2569, NPC prodává), `Recipe` (4295, položku vyrábí recept), `HangOut`, `NpcGift`, `Quest`, `Barter` (521, výměna u NPC), `Item`, `QuestObjectiveMacGuffin`. Jednotlivé záznamy bez ID: `Monster`, `CorpseButchering`, `CorpseSkinning`, `CorpseSkullExtraction`, `Angling`, `TreasureMap`, `ResourceInteractor`, `CraftedInteractor`, `Effect`.
- Podle index.html hra tato data sama nepoužívá a jsou určena pro nástroje. Data jsou proto nejspíš méně ošetřená než ostatní soubory.

`npcs.json` (341 NPC)
- `Name`, `AreaName`, `AreaFriendlyName`, `Desc`, `Pos`, `Preferences[]` (co NPC rádo dostává jako dárek), `Services[]`.
- Služba má `Type` (`Store`, `Training`, `Barter`, `Consignment`, `Storage`, `Stables` a další) a `Favor`, minimální úroveň favoru. `Training` má navíc `Skills[]`, tedy skilly, které NPC učí.

`areas.json` (37 oblastí): `FriendlyName`, `ShortFriendlyName`, `AdjacentAreas[]`.

`abilities.json` (5937 abilit): `InternalName`, `Name`, `Skill`, `Level`, `Description`, `DamageType`, `ResetTime`, `PvE{Damage, PowerCost, Range, ...}`, `UpgradeOf`, `Prerequisite`. Obsahuje i schopnosti monster a petů.

## Zpracování skriptem

Skript `scripts/fetch-data.mjs` používá jen vestavěné moduly Node (ověřeno na Node 26.7, vyžaduje Node 18 nebo novější kvůli `fetch`).

```
node scripts/fetch-data.mjs            stáhne novou verzi (pokud se změnila) a sestaví výstup
node scripts/fetch-data.mjs --force    stáhne znovu i při stejné verzi
node scripts/fetch-data.mjs --offline  sestaví výstup z cache v data/raw/
```

- Stažené soubory jdou do `data/raw/` (v `.gitignore`). Hotové soubory jdou do `src/data/` a do repozitáře se commitují, aby build aplikace nepotřeboval síť.
- Stahování se třikrát opakuje a každý soubor se po stažení zparsuje, takže poškozený soubor skončí chybou a nepřepíše dobrý výstup.
- Výstup je minifikovaný JSON.

### Velikosti výstupu (verze 486)

| Soubor | Velikost | gzip |
|---|---|---|
| `skills.json` | 225 KB | 33 KB |
| `xptables.json` | 16 KB | 4 KB |
| `recipes.json` | 2162 KB | 175 KB |
| `items.json` | 1020 KB | 129 KB |
| `recipe-sources.json` | 161 KB | 22 KB |
| `item-sources.json` | 292 KB | 55 KB |
| `npcs.json` | 47 KB | 7 KB |
| `areas.json` | 1 KB | 1 KB |
| `quests.json` | 77 KB | 14 KB |
| `abilities.json` | 230 KB | 26 KB |
| `meta.json` | 1 KB | 1 KB |
| Celkem | 4232 KB | 466 KB |

Surová data mají přes 30 MB. Největší část výstupu je `recipes.json`, protože u každé ingredience nese i jméno položky. Pokud bude potřeba výstup zmenšit, jde jména vynechat a dohledávat z `items.json`, nebo do aplikace načítat jen recepty skillů, které hráč sleduje.

## Schéma výstupu v `src/data/`

Klíče objektů jsou číselná ID (u receptů, položek, questů), interní jména skillů, NPC a abilit.

`meta.json`
- `gameDataVersion`, `generatedAt`, `source`, `iconUrlTemplate` (s `{id}`), `copyright` (řádek do patičky), `counts`.

`skills.json`, klíč je interní jméno skillu (`Archery`)
- `id`, `name`, `desc`, `combat?`, `umbrella?`, `parents?`, `xpTable?` (jméno v `xptables.json`), `maxLevel?` (délka tabulky), `maxBonusLevels`, `hideWhenZero?`, `advancementHints?` (`{"50": "text", ...}`), `rewards?`.
- `rewards[]` je seřazené podle levelu. Položka má `level` a právě jedno z `recipe` (ID receptu), `ability` (interní jméno abilit, s `races[]`), `bonusToSkill` (skill, který dostane bonusový level), případně `note`.
- Abilitu má každá rasa v jiné variantě. Orkové mají vlastní varianty (`OrcBlitzShot1`), proto je u abilit pole `races`.
- Skilly bez XP tabulky (`xpTable: "None"` v surových datech, umbrella skilly jako Anatomy) nemají `xpTable` ani `maxLevel`.

`xptables.json`: `{ "TypicalCombatSkill": [10, 17, 38, ...], ... }`. Jen tabulky, které používá nějaký skill.

`recipes.json`, klíč je ID receptu
- `name`, `internal`, `skill`, `level`, `xp`, `xpFirst`, `xpSkill?` (jen když se liší od `skill`), `dropOff?` (`{level, pct, rate}`), `noXp?`, `prereq?` (ID receptu), `maxUses?`, `resetSeconds?`, `keywords?`, `notObtainable?`.
- `ingredients[]`: `{id, name, qty, consumeChance?, durability?}` nebo `{keywords[], name, qty, ...}` pro ingredienci podle keywordu.
- `results[]`, `protoResults[]`: `{id, name, qty, chance?}`.
- `costs[]`: `{currency, price}`.

`items.json`, klíč je ID položky
- `name`, `value`, `stack`, `icon`, `keywords?` (jen ty, které se v receptech používají jako `ItemKeys`, včetně hodnoty typu `Milk=50`), `equipSlot?`, `notObtainable?`.

`recipe-sources.json`, klíč je ID receptu
- Každé pole je pole hodnot a existuje jen, když má zdroj. `training` (klíče NPC, například `NPC_Braigon`), `skill` (`[{skill, level}]`, recept se odemkne levelem skillu, level je dohledaný ze `skills.json`), `item` (ID položek, které recept učí), `quest` (ID questů, jména jsou v `quests.json`), `hangout`, `gift` (klíče NPC), `other`.

`item-sources.json`, klíč je ID položky
- `vendor`, `barter`, `gift`, `hangout` (klíče NPC), `quest` (ID questů), `recipe` (ID receptů, které položku vyrábějí), `item` (ID položek), `other` (typy bez ID, například `Monster`, `CorpseSkinning`, `Angling`).

`npcs.json`, klíč je interní jméno NPC
- `name`, `area` (klíč do `areas.json`), `storeFavor?` (minimální favor pro obchod), `trains?` (skilly, které učí), `trainFavor?`, `services[]`.

`areas.json`: `{ "AreaSerbule": "Serbule", ... }`.

`quests.json`, klíč je ID questu: `{name, npc?, location?}`. Jen questy, které jsou zdrojem receptu nebo položky.

`abilities.json`, klíč je interní jméno: `{name, skill, level, desc, damageType?, resetTime?, powerCost?, upgradeOf?, icon}`. Jen abilitky, které odměňuje nějaký skill.

## Mezery v datech

JSON neobsahuje nebo neřeší tyto věci, které aplikace potřebuje. Proto je u nich nutná wiki, vlastní tabulka nebo ruční údaj.

1. Ceny. Položka má jen `Value`. Cena, za kterou NPC prodává, a cena, za kterou vykupuje, v datech není. Záleží na favoru a nejspíš na typu obchodníka. Hledání „nejlevnějších ingrediencí“ bude potřebovat vlastní model ceny, nebo ruční ceny z wiki či ze hry. Do té doby jde řadit podle `Value`.
2. Seznam zboží NPC. `sources_items.json` říká, že NPC položku prodává, ale ne za kolik, ani kolik kusů je skladem (`MaxOnVendor` je jen u 112 položek).
3. Drop tabulky a místa sběru. Zdroje typu `Monster`, `CorpseSkinning`, `CorpseButchering` a `Angling` jsou jen příznaky bez udání monstra. Kde padá kůže, maso, houby nebo semena, JSON neříká. Chybí i místa sběru surovin (foraging, mining, sběr hub) a data o pěstování (co a jak dlouho roste v zahradě).
4. Favor pro konkrétní recept. `Training` říká jen, že NPC recept učí. Úroveň favoru potřebná pro daný recept ani cena tréninku tam není. Je tam jen minimální favor služby (`trainFavor`).
5. Zdroj chybí u 293 receptů z 4614 (254 má prázdný záznam a 39 žádný). Jsou hlavně z Bladesmithing (97), Glassblowing (62), Bowyery (40), Shieldwright (24) a Alchemy (12). Z toho, co aplikaci zajímá, jde o Cooking (Plain Porridge, Breaded Bluegill, Deviled Egg a tři další) a Mycology (4). Plain Porridge na levelu 0 bude nejspíš výchozí recept.
6. Skutečné tempo levelování. Data dávají XP za recept a první bonus, ale ne to, kolik XP dá zabíjení, sběr nebo trénink zvířat. Pro Animal Handling a Archery jako bojové skilly tedy nejde spočítat „nejrychlejší místo na level“. To je znalost z wiki a ze hry.
7. Skilly bez receptů. Archery, Animal Handling a další bojové skilly nemají v `recipes.json` žádné recepty, jejich levelování je přes boj. Aplikace pro ně bude zobrazovat odemykané abilitky a pásma levelů, ne recepty.
8. Strop levelu. `AdvancementHints` říká, u koho získat favor pro další pásmo, ale přesné podmínky odemčení (`InteractionFlagLevelCaps`) jsem neověřil. Wiki u Archery uvádí v infoboxu max level 90, XP tabulka má 100 řádků a text na stejné stránce zmiňuje i levely 91 až 100. Maximální dosažitelný level je třeba potvrdit.
9. Bonusové levely. `MaxBonusLevels` (typicky 25) je v datech, ale pravidla jejich získávání jsou jen v poznámkách `BonusToSkill` v odměnách skillů.
10. Přesné vzorce. Pokles XP u receptů (`DropOff*`) a význam indexu v `XpAmounts` jsou odvozené, ne zdokumentované. Před spoléháním na výpočty je stojí za to porovnat s hrou na několika příkladech.
11. Dostupnost obsahu. Lint keywords (`Lint_NotObtainable`, `Lint_NotLearnable`, `Lint_LevelTooHigh`) označují nedostupný nebo nehotový obsah. Skript je propaguje jako `notObtainable`. Recepty s tímto příznakem má aplikace skrýt.
12. Mapa a umístění. NPC mají pole `Pos` (souřadnice `x:... y:... z:...` ve světě hry) a `AreaName`. Souřadnice jsem do výstupu nedal, protože hráči nic neřeknou. Popis, jak se k NPC dostat, jde jen ze wiki.

## Doporučení pro aplikaci

- Do kódu aplikace dát jednu vrstvu, která data z `src/data/` načítá a skrývá změny schématu. Při nové verzi hry pak stačí upravit skript.
- Při přechodu na novou verzi spustit `node scripts/fetch-data.mjs` a porovnat `meta.json` (`counts`).
- Do patičky přidat řádek z `meta.json` (`copyright`).
- Při zobrazování ikon používat `iconUrlTemplate`. Ikony se z CDN načítají za běhu a do balíčku se nezahrnují.
