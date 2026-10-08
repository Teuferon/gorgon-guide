# Pokyny pro agenty

Tento soubor platí pro každého agenta, který na repu pracuje (Claude Code, subagenti, Codex, Cursor a další).

## Začátek práce

Nejdřív si přečti `HANDOFF.md`: stav projektu, rozhodnutí uživatele, co ověřit ve hře a známé slabiny. Když práci dokončíš, `HANDOFF.md` aktualizuj.

## Psaní textu

Každý text, který napíšeš, musí projít skillem unslop: `.claude/skills/unslop/SKILL.md`. Před psaním si ho přečti a pravidla dodržuj. Týká se to:

- textů v UI aplikace,
- dokumentace a README,
- poznámek a průvodců k hře,
- commit zpráv a popisů PR,
- odpovědí uživateli.

V českém textu používej české uvozovky „takto“. V kódu, příkazech a konfiguraci jen rovné ASCII uvozovky (podrobnosti v pravidle 19 skillu, hlavně kvůli PowerShellu).

## Projekt

Webová aplikace, osobní průvodce hrou Project Gorgon: pořadí levelování skillů, nejlevnější a nejrychlejší způsoby tréninku a odškrtávání postupu. Hlavní zdroj dat je wiki (https://wiki.projectgorgon.com), u každého tvrzení o hře uváděj odkaz na zdroj.

Jazyk: aplikace je celá anglicky (UI, návody ke skillům v `src/content/guides/`, README). Interní podklady v `docs/` můžou být česky. S uživatelem komunikuj česky.
