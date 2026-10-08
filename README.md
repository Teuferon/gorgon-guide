# Gorgon Guide

Osobní průvodce hrou Project Gorgon. Zadáte své levely skillů a aplikace ukáže, co dělat dál. Hotové položky z přehledu mizí.

## Co aplikace umí

- Moje skilly. Seznam hráčských skillů s polem na level a přepínačem „sleduji“, hledání a rozdělení na bojové a ostatní. Celý stav jde exportovat do souboru JSON a importovat na jiném počítači.
- Další kroky. Pro každý sledovaný skill karta s recepty, které na vašem levelu ještě dávají XP (seřazené podle odhadu XP), s bonusy za první výrobu k odškrtnutí, s ingrediencemi, místem učení receptu a dalšími odemčeními z odměn skillu. Přepínač „zobrazit hotové“ vrátí odškrtnuté položky.
- Stránka skillu (`#/skill/<InternalName>`). Všechny recepty po pásmech levelů, odměny, trenéři, tipy ke zvýšení stropu levelu a průvodce z Markdownu.
- Vlastní úkoly. Textové úkoly, volitelně svázané se skillem a cílovým levelem. Ukážou se i na kartě skillu.

Cenu ingrediencí data neobsahují. U ingrediencí aplikace ukazuje „základní hodnotu“ položky, prodejce (NPC a oblast) nebo druh zdroje. Tržní ceny hráčů nejsou nikde.

XP u receptů je odhad. Data mají pole `dropOff` (level, procento a krok), ale vzorec poklesu XP není nikde zdokumentovaný. Aplikace počítá, že od `dropOff.level` ubývá `pct` základního XP za každých `rate` levelů. Recepty pod hranicí 50 % základního XP se skryjí (hranici jde přepnout na stránce Další kroky). Podrobnosti jsou v `src/lib/xp.ts` a v `docs/data-sources.md`.

## Spuštění

Potřebujete Node 18 nebo novější.

```
npm install
npm run dev
```

Další příkazy:

```
npm run build        produkční build do dist/ (kontrola typů + Vite)
npm run preview      náhled buildu
npm test             testy logiky (Vitest)
npm run fetch-data   stáhne aktuální herní data
```

Build používá relativní cesty a hash router, takže složku `dist/` jde nahrát na libovolný statický hosting, i do podsložky.

Stav (levely, sledované skilly, odškrtnuté recepty, úkoly) se ukládá do localStorage prohlížeče. Pro zálohu mezi počítači použijte export a import na stránce Moje skilly.

## Aktualizace herních dat

```
npm run fetch-data
```

Skript `scripts/fetch-data.mjs` stáhne oficiální JSON soubory ze serveru vývojářů, pokud vyšla nová verze, a zapíše zmenšené soubory do `src/data/`. Přepínače `--force` a `--offline` jsou popsané v `docs/data-sources.md`. Po aktualizaci spusťte `npm test`. Testy nad skutečnými daty zachytí změnu schématu.

## Průvodci ke skillům

Soubor `src/content/guides/<InternalNameSkillu>.md` se zobrazí na stránce daného skillu. Interní jméno je klíč v `src/data/skills.json` (například `Fletching`, `AnimalHandling`). Zatím je tam jen zástupný soubor pro Fletching.

## Struktura

- `src/lib/` čistá logika a testy: filtr skillů, odhad XP, zdroje ingrediencí a receptů, odemčení, stav a import
- `src/pages/`, `src/components/` obrazovky a komponenty React
- `src/data/` zmenšená herní data (generuje skript)
- `src/content/guides/` průvodci v Markdownu
- `docs/` zdroje dat a poznámky

## Licence dat

Some portions copyright 2026 Elder Game, LLC. Řádek je v patičce aplikace a bere se z `src/data/meta.json`.
