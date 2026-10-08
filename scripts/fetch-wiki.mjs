#!/usr/bin/env node
// Stahuje z wiki Project Gorgon data, která chybí v oficiálních JSON souborech:
// kde padají itemy, kde se sbírají, jaké monstra žijí v kterých zónách a kde stojí NPC.
// Používá jen vestavěné moduly Node (18+). Podrobnosti: docs/wiki-data.md.
//
//   node scripts/fetch-wiki.mjs             stáhne chybějící stránky a sestaví výstup
//   node scripts/fetch-wiki.mjs --refresh   ignoruje cache a stáhne vše znovu
//   node scripts/fetch-wiki.mjs --offline   sestaví výstup jen z cache v data/wiki-raw/

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RAW = join(ROOT, "data", "wiki-raw");
const OUT = join(ROOT, "src", "data");
const API = "https://wiki.projectgorgon.com/api.php";
const WIKI = "https://wiki.projectgorgon.com/wiki/";
const UA = "gorgon-guide-personal-tool/0.1 (osobni pruvodce hrou; martin.hofman@fastcr.cz)";
const DELAY_MS = 400;
const BATCH = 50;

const args = new Set(process.argv.slice(2));
const REFRESH = args.has("--refresh");
const OFFLINE = args.has("--offline");

// Skilly a rozsah levelů, které aplikace sleduje. Ingredience těchto receptů mají přednost.
const TRACKED_SKILLS = [
  "Fletching", "Cooking", "Gardening", "Mycology", "Foraging",
  "Butchering", "Skinning", "Tanning", "Carpentry", "Alchemy",
];
const MAX_RECIPE_LEVEL = 50;

// Stránky skillů s tabulkami sběru (Item Name, level, locations).
const GATHER_PAGES = ["Foraging", "Mycology", "Gardening", "Fishing", "Mining", "Skinning", "Butchering", "Surveying", "Angling"];

mkdirSync(join(RAW, "pages"), { recursive: true });
mkdirSync(join(RAW, "api"), { recursive: true });

// ---------------------------------------------------------------- síť a cache

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => createHash("sha1").update(s).digest("hex").slice(0, 16);
let requests = 0;

async function apiRequest(params) {
  const url = new URL(API);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      await sleep(DELAY_MS * (attempt + 1));
      requests++;
      const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) throw new Error("HTTP " + res.status);
      if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
      const json = await res.json();
      if (json.error) throw new Error("API: " + JSON.stringify(json.error));
      return json;
    } catch (e) {
      lastError = e;
      if (attempt < 3) await sleep(2000 * (attempt + 1));
    }
  }
  throw lastError;
}

// Odpověď API se cachuje podle parametrů (seznamy kategorií).
async function cachedApi(params) {
  const key = sha(JSON.stringify(Object.entries(params).sort()));
  const file = join(RAW, "api", key + ".json");
  if (!REFRESH && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (OFFLINE) throw new Error("Chybí cache pro " + JSON.stringify(params) + " a běží --offline.");
  const json = await apiRequest(params);
  writeFileSync(file, JSON.stringify(json));
  return json;
}

async function categoryMembers(category) {
  const out = [];
  let cont = {};
  for (;;) {
    const j = await cachedApi({
      action: "query", list: "categorymembers", cmtitle: "Category:" + category,
      cmlimit: "500", cmprop: "title|type", ...cont,
    });
    out.push(...j.query.categorymembers);
    if (!j.continue) break;
    cont = j.continue;
  }
  return out;
}

const pageFile = (title) => join(RAW, "pages", sha(title) + ".json");

// Vrací Map titulek -> {title, text|null}. Stránky se cachují po jedné, stahují se po 50.
async function getPages(titles) {
  const result = new Map();
  const todo = [];
  for (const t of new Set(titles)) {
    const f = pageFile(t);
    if (!REFRESH && existsSync(f)) result.set(t, JSON.parse(readFileSync(f, "utf8")));
    else todo.push(t);
  }
  if (OFFLINE) return result;
  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const j = await apiRequest({
      action: "query", titles: chunk.join("|"), prop: "revisions", rvprop: "content",
      rvslots: "main", redirects: "1",
    });
    const q = j.query;
    const norm = new Map((q.normalized || []).map((n) => [n.from, n.to]));
    const redir = new Map((q.redirects || []).map((n) => [n.from, n.to]));
    const byTitle = new Map(q.pages.map((p) => [p.title, p]));
    for (const t of chunk) {
      let cur = norm.get(t) || t;
      const redirectedFrom = [];
      while (redir.has(cur) && redirectedFrom.length < 5) { redirectedFrom.push(cur); cur = redir.get(cur); }
      const p = byTitle.get(cur);
      const rec = {
        title: p && !p.missing ? p.title : null,
        requested: t,
        redirect: redirectedFrom.length > 0,
        text: p && !p.missing ? p.revisions?.[0]?.slots?.main?.content ?? null : null,
      };
      writeFileSync(pageFile(t), JSON.stringify(rec));
      result.set(t, rec);
    }
    process.stdout.write(`  stazeno ${Math.min(i + BATCH, todo.length)}/${todo.length}\r`);
  }
  if (todo.length) process.stdout.write("\n");
  return result;
}

// ---------------------------------------------------------------- pomocné funkce pro wikitext

const loadJson = (name) => JSON.parse(readFileSync(join(OUT, name), "utf8"));
const pageUrl = (title) => WIKI + encodeURIComponent(title.replace(/ /g, "_")).replace(/%2F/g, "/").replace(/%3A/g, ":");

// Najde vnořené šablony {{Name ... }} a vrátí {name, params, positional}. Počítá závorky,
// takže zvládne i vnořené šablony a odkazy [[a|b]] v hodnotách.
function findTemplates(text, names) {
  const wanted = names.map((n) => n.toLowerCase().replace(/_/g, " "));
  const out = [];
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== "{" || text[i + 1] !== "{") continue;
    let depth = 0, j = i;
    for (; j < text.length - 1; j++) {
      if (text[j] === "{" && text[j + 1] === "{") { depth++; j++; }
      else if (text[j] === "}" && text[j + 1] === "}") { depth--; j++; if (depth === 0) break; }
    }
    if (depth !== 0) break;
    const inner = text.slice(i + 2, j - 1);
    const parts = splitTop(inner);
    const name = parts[0].trim().replace(/_/g, " ");
    if (wanted.includes(name.toLowerCase())) {
      const params = {};
      const positional = [];
      for (const p of parts.slice(1)) {
        const m = p.match(/^\s*([^={}|\[\]]+?)\s*=\s*([\s\S]*)$/);
        if (m) params[m[1].toLowerCase()] = m[2].trim();
        else positional.push(p.trim());
      }
      out.push({ name, params, positional, start: i, end: j + 1 });
    }
    // nepřeskakujeme obsah, vnořené šablony hledáme taky
  }
  return out;
}

// Rozdělí text podle | na nejvyšší úrovni (mimo {{ }} a [[ ]]).
function splitTop(s) {
  const parts = [];
  let cur = "", brace = 0, bracket = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === "{" && n === "{") { brace++; cur += "{{"; i++; continue; }
    if (c === "}" && n === "}") { brace--; cur += "}}"; i++; continue; }
    if (c === "[" && n === "[") { bracket++; cur += "[["; i++; continue; }
    if (c === "]" && n === "]") { bracket--; cur += "]]"; i++; continue; }
    if (c === "|" && brace === 0 && bracket === 0) { parts.push(cur); cur = ""; continue; }
    cur += c;
  }
  parts.push(cur);
  return parts;
}

// Odstraní wiki značky a nechá čistý text.
function clean(s) {
  if (!s) return "";
  return s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{\s*(?:Item|Spoiler)\s*\|([^{}|]*?)(?:\|[^{}]*)?\}\}/gi, "$1")
    .replace(/\{\{\s*Favor\s*\|([^{}|]*?)\}\}/gi, "$1")
    .replace(/\{\{\s*pipe\s*\}\}/gi, "|")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<br\s*\/?>/gi, "; ")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Seznam cílů [[A]], [[A|b]] z úryvku wikitextu.
function links(s) {
  const out = [];
  for (const m of (s || "").matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
    const t = m[1].trim();
    if (!/^(File|Image|Category):/i.test(t)) out.push(t);
  }
  return out;
}

// Rozdělí wikitext na sekce podle nadpisů. Vrací [{level, title, body}] (úvod má title "").
function sections(text) {
  const out = [{ level: 0, title: "", body: "" }];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^(={2,6})\s*(.*?)\s*\1\s*$/);
    if (m) out.push({ level: m[1].length, title: clean(m[2]), body: "" });
    else out[out.length - 1].body += line + "\n";
  }
  return out;
}

const uniq = (a) => [...new Set(a)];

// ---------------------------------------------------------------- výběr stránek ke stažení

const NOT_PAGES = /^(Template:|Category:|File:|Talk:)|Creature Template$/;

async function pageMembers(category) {
  return (await categoryMembers(category)).filter((m) => m.type === "page" && !NOT_PAGES.test(m.title)).map((m) => m.title);
}

async function collectMobTitles() {
  const cats = (await categoryMembers("Creatures by Area")).filter((m) => m.type === "subcat")
    .map((m) => m.title.replace(/^Category:/, ""));
  cats.push("Bosses", "Animal Handling Creatures");
  const titles = new Set();
  for (const c of cats) for (const t of await pageMembers(c)) titles.add(t);
  return [...titles];
}

// Ingredience receptů sledovaných skillů do MAX_RECIPE_LEVEL. Ingredience podle keywordu se rozbalí na položky.
function collectIngredients() {
  const recipes = loadJson("recipes.json");
  const items = loadJson("items.json");
  const ids = new Set();
  const keywords = new Set();
  for (const r of Object.values(recipes)) {
    if (!TRACKED_SKILLS.includes(r.skill) || r.level > MAX_RECIPE_LEVEL || r.notObtainable) continue;
    for (const g of r.ingredients || []) {
      if (g.id) ids.add(String(g.id));
      else for (const k of g.keywords || []) keywords.add(k.split("=")[0]);
    }
  }
  const viaKeyword = new Set();
  for (const [id, it] of Object.entries(items)) {
    if (it.notObtainable) continue;
    if ((it.keywords || []).some((k) => keywords.has(k.split("=")[0]))) viaKeyword.add(id);
  }
  return { ids, viaKeyword, keywords, items };
}


// ---------------------------------------------------------------- parsery

// Tabulky {| ... |} na hrubo: vrací [{headers:[], rows:[[buňka,...]]}]. Buňky jsou surový wikitext.
function parseTables(text) {
  const tables = [];
  const re = /^\{\|([^\n]*)\n([\s\S]*?)^\|\}/gm;
  for (const m of text.matchAll(re)) {
    const rows = [];
    let headers = null;
    let row = null;
    const attrRe = /^\s*[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s|]+)(?:\s+[a-z-]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s|]+))*\s*\|(?!\|)([\s\S]*)$/i;
    const pushCell = (c) => {
      const attr = c.match(attrRe);
      row.push(attr ? attr[1] : c);
    };
    for (const line of m[2].split(/\r?\n/)) {
      if (line.startsWith("|-")) { if (row && row.length) rows.push(row); row = []; continue; }
      if (line.startsWith("|+")) continue;
      if (line.startsWith("!")) {
        const hs = line.slice(1).split(/!!|\|\|/).map((h) => clean(h.replace(attrRe, "$1")));
        if (!row || row.length === 0) headers = (headers || []).concat(hs);
        else for (const h of hs) pushCell(h);
        continue;
      }
      if (line.startsWith("|")) {
        row ??= [];
        for (const c of line.replace(/^\|\|/, "|").slice(1).split("||")) pushCell(c.trim());
        continue;
      }
      if (row && row.length) row[row.length - 1] += "\n" + line;
    }
    if (row && row.length) rows.push(row);
    tables.push({ headers: headers || [], rows });
  }
  return tables;
}

const num = (s) => { const m = String(s ?? "").match(/\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };

const ZONE_ALIAS = { "Anagoge Island": "Anagoge", "War Caches": "War Cache", "Povus Caves": "Povus" };
const zoneKey = (n) => ZONE_ALIAS[n] || n;

const GROUPS = ["skin", "skinBonus", "butcher", "butcherBonus", "skull"];

function classifyHeader(label) {
  const l = label.toLowerCase();
  if (/skull/.test(l)) return "skull";
  if (/skin/.test(l) && /bonus/.test(l)) return "skinBonus";
  if (/butcher|meat/.test(l) && /bonus/.test(l)) return "butcherBonus";
  if (/skin/.test(l)) return "skin";
  if (/butcher|meat/.test(l)) return "butcher";
  return null;
}

function parseMob(rec) {
  const text = rec.text;
  const info = findTemplates(text, ["MOB infobox"])[0];
  if (!info) return null;
  const mob = {
    name: rec.title.replace(/\s*\((?:mob|monster)\)$/i, ""),
    page: rec.title,
    type: clean(info.params.type || ""),
    zones: [],
    skin: [], skinBonus: [], butcher: [], butcherBonus: [], skull: [],
    loot: {},
  };
  for (const t of findTemplates(text, ["MOB Location"])) {
    const area = clean(t.params.area || "");
    if (!area) continue;
    const z = { zone: zoneKey(area) };
    const loc = clean(t.params.location || "");
    if (loc) z.where = loc;
    const rawLevel = t.params.lootlevel ?? t.params.level ?? "";
    if (/^\s*\d/.test(rawLevel)) z.lootLevel = num(rawLevel);
    if (/^\s*\d/.test(t.params.health ?? "")) z.health = num(t.params.health);
    if (t.params.time) z.time = clean(t.params.time);
    mob.zones.push(z);
  }
  const ah = findTemplates(text, ["MOB AH"])[0];
  if (ah) {
    const lv = num(ah.params["level to tame"]);
    if (lv != null) mob.tame = { level: lv, type: clean(ah.params["tame type"] || "") || undefined };
  }
  // Skin, maso a lebka stojí před "Reported Loot", pády po něm.
  const split = text.search(/^=+\s*(?:Reported Loot|Loot|Drops)\b/im);
  const regionA = split >= 0 ? text.slice(0, split) : text;
  const regionB = split >= 0 ? text.slice(split) : "";
  const tokens = [];
  for (const t of findTemplates(regionA, ["Header"])) tokens.push({ at: t.start, kind: "H", label: clean(t.positional[0] || "") });
  for (const m of regionA.matchAll(/'''\s*(Skin|Meat|Skull|Butcher\w*)\s*'''/gi)) tokens.push({ at: m.index, kind: "H", label: m[1] });
  for (const t of findTemplates(regionA, ["Loot"])) tokens.push({ at: t.start, kind: "L", item: clean(t.positional[0] || "") });
  tokens.sort((a, b) => a.at - b.at);
  let group = null;
  for (const t of tokens) {
    if (t.kind === "H") group = classifyHeader(t.label);
    else if (group && t.item) mob[group].push(t.item);
  }
  let rarity = null;
  const tokensB = [];
  for (const t of findTemplates(regionB, ["Header"])) tokensB.push({ at: t.start, kind: "H", label: clean(t.positional[0] || "") });
  for (const t of findTemplates(regionB, ["Loot"])) tokensB.push({ at: t.start, kind: "L", item: clean(t.positional[0] || "") });
  tokensB.sort((a, b) => a.at - b.at);
  for (const t of tokensB) {
    if (t.kind === "H") {
      const l = t.label.toLowerCase();
      rarity = /ultra/.test(l) ? "ultra rare" : /uncommon/.test(l) ? "uncommon" : /\brare\b/.test(l) ? "rare" : /common/.test(l) ? "common" : rarity;
    } else if (t.item && !(t.item in mob.loot)) mob.loot[t.item] = rarity;
  }
  for (const g of GROUPS) mob[g] = uniq(mob[g]);
  return mob;
}

// Text sekce bez komentářů, DPL a obrázků, řádky spojené středníkem.
function stripFileLinks(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    if (/^\[\[(?:File|Image):/i.test(text.slice(i, i + 8))) {
      let depth = 0, j = i;
      for (; j < text.length - 1; j++) {
        if (text[j] === "[" && text[j + 1] === "[") { depth++; j++; }
        else if (text[j] === "]" && text[j + 1] === "]") { depth--; j++; if (depth === 0) break; }
      }
      i = j;
      continue;
    }
    out += text[i];
  }
  return out;
}

function bodyText(body, max) {
  const lines = stripFileLinks(body)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<dpl>[\s\S]*?<\/dpl>/gi, "")
    .split(/\r?\n/)
    .map((l) => clean(l.replace(/^[*:;#\s]+/, "")))
    .filter((l) => l && !/^(none\.?|\?+|n\/a|-+)$/i.test(l) && !/^(Example|Examples)\b/i.test(l) && !/^[{|}]/.test(l));
  let out = lines.join("; ");
  if (out.length > max) out = out.slice(0, max - 1).replace(/[;,\s]+\S*$/, "") + "...";
  return out;
}

function parseNpc(rec) {
  const info = findTemplates(rec.text, ["NPC infobox"])[0];
  if (!info) return null;
  const p = info.params;
  const npc = { name: rec.title.replace(/\s*\(npc\)$/i, ""), page: rec.title };
  if (p.zone) npc.zone = zoneKey(clean(p.zone));
  if (p.town) npc.town = clean(p.town);
  if (p.location) npc.location = clean(p.location);
  if (p.wander) npc.wander = clean(p.wander);
  const sec = sections(rec.text).find((s) => /^Locations?$/i.test(s.title));
  if (sec) {
    const detail = bodyText(sec.body, 300);
    if (detail && detail !== npc.location) npc.detail = detail;
  }
  return npc;
}

// Odstraní všechny šablony {{...}} (i vnořené).
function removeTemplates(text) {
  let out = "", depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{" && text[i + 1] === "{") { depth++; i++; continue; }
    if (text[i] === "}" && text[i + 1] === "}" && depth > 0) { depth--; i++; continue; }
    if (depth === 0) out += text[i];
  }
  return out;
}

function parseZone(rec) {
  const info = findTemplates(rec.text, ["MAP infobox", "DUNGEON infobox"])[0];
  if (!info) return null;
  const p = info.params;
  const isDungeon = /dungeon/i.test(info.name);
  const levels = clean(p.pclevel || p.arealevel || "").replace(/\s*[-–]\s*/, "-");
  const zone = { name: zoneKey(rec.title), page: rec.title, kind: isDungeon ? "dungeon" : "zone" };
  if (/\d/.test(levels)) {
    zone.levels = levels;
    const m = levels.match(/(\d+)(?:-(\d+))?/);
    zone.minLevel = Number(m[1]);
    zone.maxLevel = Number(m[2] || m[1]);
  }
  const connects = links(p.connects || "").map(zoneKey);
  if (connects.length) zone.connects = uniq(connects);
  if (p.portaldesc && clean(p.portaldesc) && !/needs? (a )?description/i.test(p.portaldesc)) zone.portal = clean(p.portaldesc);
  // První odstavec za infoboxem, který je skutečný text.
  const intro = removeTemplates(rec.text.slice(info.end).replace(/\{\{\s*Item\s*\|([^{}|]*)[^{}]*\}\}/gi, "$1")).split(/\r?\n/).map((l) => l.trim())
    .find((l) => l.length > 60 && !/^[{|!=<*]/.test(l));
  if (intro) zone.desc = bodyText(intro, 280);
  // Harvestables: podsekce Fish, Fruit, Plants, Wood, Mushrooms, ...
  const secs = sections(rec.text);
  const hi = secs.findIndex((s) => /^Harvestables$/i.test(s.title));
  if (hi >= 0) {
    const harvest = {};
    for (let i = hi; i < secs.length; i++) {
      if (i > hi && secs[i].level <= secs[hi].level) break;
      const cat = i === hi ? "Misc" : secs[i].title;
      for (const t of findTemplates(secs[i].body, ["Item"])) {
        const name = clean(t.positional[0] || "");
        if (!name) continue;
        const after = secs[i].body.slice(t.end, t.end + 40).match(/^\s*(?:x\d+\s*)?\(([^)\n]{1,30})\)/);
        (harvest[cat] ??= []).push(after ? `${name} (${after[1]})` : name);
      }
    }
    for (const k of Object.keys(harvest)) harvest[k] = uniq(harvest[k]);
    if (Object.keys(harvest).length) zone.harvest = harvest;
  }
  return zone;
}

// Cena v tabulce prodejce: "63", "1,150", "(x5) for 37", "5 for 37", "605 gold", "?".
// Vrací {cost, qty?, currency?}. cost je cena za qty kusů, pokud není uvedena jiná měna (gold).
function parseCost(raw) {
  const t = clean(raw).replace(/(\d),(\d{3})/g, "$1$2");
  let m = t.match(/(\d+)\s*\)?\s*for\s*(\d+)/i);
  if (m) return { cost: Number(m[2]), qty: Number(m[1]) };
  m = t.match(/(\d+)\s*gold/i);
  if (m) return { cost: Number(m[1]), currency: "gold" };
  if (/^\d+$/.test(t)) return { cost: Number(t) };
  return {};
}

// Řádky "vendor item row" z podstránek NPC/Items sold.
function parseVendorRows(rec) {
  const rows = [];
  for (const t of findTemplates(rec.text, ["vendor item row"])) {
    const item = clean(t.params.item || "");
    if (!item) continue;
    const row = { item, ...parseCost(t.params.cost || "") };
    let favor = clean(t.params.favor || "");
    if (/^life family$/i.test(favor)) favor = "Like Family";
    if (favor && !/\?|^n\/a$/i.test(favor)) row.favor = favor;
    rows.push(row);
  }
  return rows;
}

// Tabulky sběru ze stránek skillů: položka, level, místa.
function parseGatherTables(skill, rec, knownZones) {
  const out = [];
  for (const tb of parseTables(rec.text)) {
    const h = tb.headers.map((x) => x.toLowerCase());
    const col = (re, not) => h.findIndex((x) => re.test(x) && !(not && not.test(x)));
    const itemCol = col(/^(item name|name|skin|seed|deposit|fish|item|ore|resource)\b/);
    if (itemCol < 0) continue;
    const levelCol = col(/level|required|^foraging|^mining|^mycology|^skinning|^gardening/, /xp|exp/);
    const whereCol = col(/location|area/);
    const creatureCol = col(/creatures/);
    const resultCol = col(/^result$/);
    const growCol = col(/grow time/);
    const fertCol = col(/fertilizer/);
    if (levelCol < 0 && whereCol < 0) continue;
    for (const r of tb.rows) {
      const itemName = clean(findTemplates(r[itemCol] || "", ["Item"])[0]?.positional[0] || "");
      if (!itemName) continue;
      const entry = { skill };
      const lv = levelCol >= 0 ? num(r[levelCol]) : null;
      if (lv != null) entry.level = lv;
      if (whereCol >= 0 && r[whereCol]) {
        const zs = uniq(links(r[whereCol]).map(zoneKey).filter((z) => knownZones.has(z)));
        if (zs.length) entry.zones = zs;
        const txt = clean(r[whereCol]);
        const onlyZones = zs.length && txt.replace(/[,;\s]/g, "") === zs.join("").replace(/\s/g, "");
        if (txt && !/^\??$/.test(txt) && !onlyZones) entry.where = txt.slice(0, 220);
      }
      if (creatureCol >= 0 && r[creatureCol]) {
        const names = uniq(r[creatureCol].split(/<br\s*\/?>|\n/).map((x) => clean(x).replace(/\s*\+\d+.*$/, "").trim()).filter(Boolean));
        if (names.length) entry.creatures = names.slice(0, 12);
      }
      out.push({ item: itemName, entry });
      if (resultCol >= 0 && r[resultCol]) {
        const res = clean(findTemplates(r[resultCol], ["Item"])[0]?.positional[0] || "");
        if (res) {
          const g = { seed: itemName };
          if (lv != null) g.level = lv;
          if (growCol >= 0 && clean(r[growCol])) g.growTime = clean(r[growCol]);
          if (fertCol >= 0 && clean(r[fertCol])) g.fertilizer = /^yes/i.test(clean(r[fertCol]));
          out.push({ item: res, grow: g });
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- sestavení výstupu

const mobSortKey = (m) => {
  const lv = m.zones.map((z) => z.lootLevel).filter((x) => x != null);
  const hp = m.zones.map((z) => z.health).filter((x) => x != null);
  return [lv.length ? Math.min(...lv) : 999, hp.length ? Math.min(...hp) : 99999];
};
const byMobLevel = (a, b) => {
  const [a1, a2] = mobSortKey(a), [b1, b2] = mobSortKey(b);
  return a1 - b1 || a2 - b2 || a.name.localeCompare(b.name);
};
const stripNote = (s) => s.replace(/\s*\([^)]*\)\s*$/, "");
const write = (name, data) => {
  const file = join(OUT, name);
  writeFileSync(file, JSON.stringify(data));
  return statSync(file).size;
};
const kb = (n) => Math.round(n / 102.4) / 10 + " KB";

async function main() {
  console.log("Wiki: sestavuji seznam stranek" + (OFFLINE ? " (offline)" : ""));
  const mobTitles = await collectMobTitles();
  const npcTitles = await pageMembers("NPCs");
  const zoneTitles = [...(await pageMembers("Zones")), ...(await pageMembers("Dungeons"))].filter((t) => t !== "Zones");
  const soldTitles = (await pageMembers("Items sold")).filter((t) => /\/Items sold$/.test(t) && !/^NPC Template/.test(t));
  const ing = collectIngredients();
  const itemNames = uniq([...ing.ids, ...ing.viaKeyword].map((id) => ing.items[id]?.name).filter(Boolean));
  console.log(`  monstra ${mobTitles.length}, NPC ${npcTitles.length}, zony ${zoneTitles.length}, obchodnici ${soldTitles.length}, itemy ${itemNames.length}`);
  const P = {
    mobs: await getPages(mobTitles),
    npcs: await getPages(npcTitles),
    zones: await getPages(zoneTitles),
    sold: await getPages(soldTitles),
    gather: await getPages(GATHER_PAGES),
    items: await getPages(itemNames),
  };
  if (!OFFLINE) console.log("Pozadavku na wiki: " + requests);

  // --- monstra
  const mobs = new Map();
  for (const rec of P.mobs.values()) {
    if (!rec.text) continue;
    const m = parseMob(rec);
    if (m && !mobs.has(m.name)) mobs.set(m.name, m);
  }
  // --- zóny
  const zones = new Map();
  for (const rec of P.zones.values()) {
    if (!rec.text || /Template/.test(rec.title)) continue;
    const z = parseZone(rec);
    if (z && !zones.has(z.name)) zones.set(z.name, z);
  }
  const knownZones = new Set([...zones.keys(), ...[...mobs.values()].flatMap((m) => m.zones.map((z) => z.zone))]);
  // --- NPC
  const npcsWiki = new Map();
  for (const rec of P.npcs.values()) {
    if (!rec.text) continue;
    const n = parseNpc(rec);
    if (n && !npcsWiki.has(n.name)) npcsWiki.set(n.name, n);
  }
  // --- sběr ze stránek skillů
  const gatherByItem = new Map();
  const growByItem = new Map();
  for (const [title, rec] of P.gather) {
    if (!rec.text) continue;
    for (const g of parseGatherTables(rec.title || title, rec, knownZones)) {
      if (g.grow) growByItem.set(g.item, g.grow);
      else { if (!gatherByItem.has(g.item)) gatherByItem.set(g.item, []); gatherByItem.get(g.item).push(g.entry); }
    }
  }
  // --- obchodníci
  const npcZone = (name) => npcsWiki.get(name)?.zone;
  const buyByItem = new Map();
  for (const [title, rec] of P.sold) {
    if (!rec.text) continue;
    const npc = title.replace(/\/Items sold$/, "");
    for (const r of parseVendorRows(rec)) {
      if (!buyByItem.has(r.item)) buyByItem.set(r.item, []);
      const b = { npc };
      const z = npcZone(npc);
      if (z) b.zone = z;
      if (r.cost != null) b.cost = r.cost;
      if (r.qty) b.qty = r.qty;
      if (r.currency) b.currency = r.currency;
      if (r.favor) b.favor = r.favor;
      buyByItem.get(r.item).push(b);
    }
  }

  // --- item -> kdo ho dává (z mob stránek)
  const dropIndex = new Map(); // item -> {skin:[mob], ...}
  const addDrop = (item, kind, mob, rarity) => {
    if (!dropIndex.has(item)) dropIndex.set(item, {});
    const d = dropIndex.get(item);
    (d[kind] ??= []).push(rarity ? { mob, rarity } : { mob });
  };
  const sortedMobs = [...mobs.values()].sort(byMobLevel);
  for (const m of sortedMobs) {
    for (const g of GROUPS) for (const it of m[g]) addDrop(it, g, m.name);
    for (const [it, r] of Object.entries(m.loot)) addDrop(it, "loot", m.name, r);
  }

  // --- zóny: monstra, NPC, sběr
  for (const name of knownZones) if (!zones.has(name)) zones.set(name, { name, kind: "area" });
  for (const z of zones.values()) {
    const ms = sortedMobs.filter((m) => m.zones.some((x) => x.zone === z.name));
    if (ms.length) {
      z.monsters = ms.map((m) => {
        const x = m.zones.find((y) => y.zone === z.name);
        const o = { name: m.name };
        if (x.lootLevel != null) o.lootLevel = x.lootLevel;
        if (x.health != null) o.health = x.health;
        return o;
      });
    }
    const ns = [...npcsWiki.values()].filter((n) => n.zone === z.name).map((n) => n.name).sort();
    if (ns.length) z.npcs = ns;
    const gathers = [];
    for (const [item, entries] of gatherByItem) {
      for (const e of entries) if ((e.zones || []).includes(z.name)) gathers.push(e.level != null ? `${item} (${e.skill} ${e.level})` : `${item} (${e.skill})`);
    }
    if (gathers.length) z.gathering = uniq(gathers);
  }
  // pořadí: úroveň, pak jméno
  for (const z of zones.values()) {
    if (z.connects) {
      z.connects = z.connects.filter((c) => knownZones.has(c));
      if (!z.connects.length) delete z.connects;
    }
  }
  const zoneList = [...zones.values()].sort((a, b) => (a.minLevel ?? 999) - (b.minLevel ?? 999) || a.name.localeCompare(b.name));
  const zoneOut = Object.fromEntries(zoneList.map((z) => [z.name, z]));

  // --- položky
  const itemsJson = ing.items;
  const nameToIds = new Map();
  for (const [id, it] of Object.entries(itemsJson)) {
    if (!nameToIds.has(it.name)) nameToIds.set(it.name, []);
    nameToIds.get(it.name).push(id);
  }
  const universe = new Set([...itemNames, ...gatherByItem.keys(), ...growByItem.keys()]);
  // zóny, kde je item v seznamu Harvestables
  const harvestZones = new Map();
  for (const z of zones.values()) {
    for (const [cat, list] of Object.entries(z.harvest || {})) {
      for (const raw of list) {
        const n = stripNote(raw);
        if (!harvestZones.has(n)) harvestZones.set(n, new Set());
        harvestZones.get(n).add(z.name);
      }
    }
  }
  const itemLoc = {};
  for (const name of universe) {
    const ids = nameToIds.get(name);
    if (!ids) continue;
    const e = {};
    const d = dropIndex.get(name);
    const mobsSeen = [];
    if (d) {
      for (const g of GROUPS) if (d[g]) { e[g] = d[g].map((x) => x.mob).slice(0, 25); mobsSeen.push(...d[g].map((x) => x.mob)); }
      if (d.loot) {
        e.loot = d.loot.slice(0, 25);
        if (d.loot.length > 25) e.lootTotal = d.loot.length;
        mobsSeen.push(...d.loot.map((x) => x.mob));
      }
    }
    if (mobsSeen.length) {
      const counts = new Map();
      for (const mn of uniq(mobsSeen)) for (const z of mobs.get(mn).zones) counts.set(z.zone, (counts.get(z.zone) || 0) + 1);
      e.dropZones = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10).map((x) => x[0]);
    }
    if (gatherByItem.has(name)) e.gather = gatherByItem.get(name);
    if (harvestZones.has(name)) e.harvestZones = [...harvestZones.get(name)].sort();
    if (growByItem.has(name)) e.grow = growByItem.get(name);
    if (buyByItem.has(name)) e.buy = buyByItem.get(name);
    const rec = P.items.get(name);
    if (rec?.text) {
      const secs = sections(rec.text);
      const g = secs.find((s) => /^Gathering$/i.test(s.title));
      const gt = g ? bodyText(g.body, 400) : "";
      if (gt) e.gatherNote = gt;
      const o = secs.filter((s) => /^(Other Ways to Obtain|How to Obtain)$/i.test(s.title)).map((s) => bodyText(s.body, 300)).filter(Boolean).join("; ");
      if (o) e.note = o.slice(0, 400);
      if (Object.keys(e).length) e.wiki = rec.title || name;
    }
    if (Object.keys(e).filter((k) => k !== "wiki").length === 0) continue;
    e.name = name;
    for (const id of ids) itemLoc[id] = ids.length > 1 ? { ...e, sameName: true } : e;
  }

  // --- monstra pro výstup: loot jen u relevantních itemů
  const relevant = new Set(universe);
  const monsterOut = {};
  for (const m of sortedMobs) {
    const o = { type: m.type || undefined, zones: m.zones };
    for (const g of GROUPS) if (m[g].length) o[g] = m[g];
    const loot = Object.entries(m.loot).filter(([k]) => relevant.has(k));
    if (loot.length) o.loot = Object.fromEntries(loot);
    o.lootTotal = Object.keys(m.loot).length || undefined;
    if (m.tame) o.tame = m.tame;
    if (m.page !== m.name) o.page = m.page;
    monsterOut[m.name] = o;
  }

  // --- NPC: párování na npcs.json
  const npcsGame = loadJson("npcs.json");
  const norm = (s) => s.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "");
  const wikiByNorm = new Map([...npcsWiki.values()].map((n) => [norm(n.name), n]));
  const npcOut = {};
  const npcsUnmatched = [];
  for (const [key, n] of Object.entries(npcsGame)) {
    const w = npcsWiki.get(n.name) || wikiByNorm.get(norm(n.name));
    if (!w) { npcsUnmatched.push(n.name); continue; }
    const o = { name: w.name };
    for (const k of ["zone", "town", "location", "wander", "detail"]) if (w[k]) o[k] = w[k];
    o.wiki = w.page;
    npcOut[key] = o;
  }

  // --- zápis
  const sizes = {
    "wiki-zones.json": write("wiki-zones.json", zoneOut),
    "wiki-monsters.json": write("wiki-monsters.json", monsterOut),
    "wiki-item-locations.json": write("wiki-item-locations.json", itemLoc),
    "wiki-npcs.json": write("wiki-npcs.json", npcOut),
  };

  // --- pokrytí ingrediencí
  const itemSources = loadJson("item-sources.json");
  const hasSource = (id) => {
    const s = itemSources[id];
    return !!s && ["vendor", "barter", "gift", "hangout", "quest", "item"].some((k) => (s[k] || []).length);
  };
  const crafted = (id) => (itemSources[id]?.recipe || []).length > 0;
  const hasWiki = (id) => !!itemLoc[id] && ["skin", "skinBonus", "butcher", "butcherBonus", "loot", "gather", "harvestZones", "grow", "buy", "gatherNote"].some((k) => itemLoc[id][k]);
  const direct = [...ing.ids];
  const raw = direct.filter((id) => !crafted(id));
  const cov = {
    recipeIngredientItems: direct.length,
    craftedByRecipe: direct.length - raw.length,
    rawItems: raw.length,
    rawWithItemSources: raw.filter(hasSource).length,
    rawWithWiki: raw.filter(hasWiki).length,
    rawWithEither: raw.filter((id) => hasSource(id) || hasWiki(id)).length,
    rawOnlyWiki: raw.filter((id) => !hasSource(id) && hasWiki(id)).length,
    rawWithDropOrGather: raw.filter((id) => hasWiki(id) && ["skin", "skinBonus", "butcher", "butcherBonus", "loot", "gather", "harvestZones", "grow", "gatherNote"].some((k) => itemLoc[id][k])).length,
  };
  // Recepty sledovaných skillů do MAX_RECIPE_LEVEL: kolik jich má u všech ingrediencí známé místo.
  const recipesAll = loadJson("recipes.json");
  const kwLocated = (kw) => [...ing.viaKeyword].some((id) => (itemsJson[id].keywords || []).some((k) => k.split("=")[0] === kw) && (crafted(id) || hasSource(id) || hasWiki(id)));
  const kwLocatedSrc = (kw) => [...ing.viaKeyword].some((id) => (itemsJson[id].keywords || []).some((k) => k.split("=")[0] === kw) && (crafted(id) || hasSource(id)));
  let recipesTotal = 0, recipesBefore = 0, recipesAfter = 0;
  for (const r of Object.values(recipesAll)) {
    if (!TRACKED_SKILLS.includes(r.skill) || r.level > MAX_RECIPE_LEVEL || r.notObtainable) continue;
    recipesTotal++;
    let before = true, after = true;
    for (const g of r.ingredients || []) {
      if (g.id) {
        const id = String(g.id);
        if (!(crafted(id) || hasSource(id))) before = false;
        if (!(crafted(id) || hasSource(id) || hasWiki(id))) after = false;
      } else {
        const kws = (g.keywords || []).map((k) => k.split("=")[0]);
        if (!kws.some(kwLocatedSrc)) before = false;
        if (!kws.some(kwLocated)) after = false;
      }
    }
    if (before) recipesBefore++;
    if (after) recipesAfter++;
  }
  cov.recipesTotal = recipesTotal;
  cov.recipesAllIngredientsLocatedBefore = recipesBefore;
  cov.recipesAllIngredientsLocatedAfter = recipesAfter;
  const unresolved = raw.filter((id) => !hasSource(id) && !hasWiki(id)).map((id) => itemsJson[id].name).sort();
  const counts = {
    zones: zoneList.length,
    zonesWithLevels: zoneList.filter((z) => z.levels).length,
    monsters: Object.keys(monsterOut).length,
    monstersWithZone: Object.values(monsterOut).filter((m) => m.zones.length).length,
    monstersWithLootLevel: Object.values(monsterOut).filter((m) => m.zones.some((z) => z.lootLevel != null)).length,
    itemLocations: Object.keys(itemLoc).length,
    npcsGame: Object.keys(npcsGame).length,
    npcsMatched: Object.keys(npcOut).length,
    npcsWithLocation: Object.values(npcOut).filter((n) => n.location || n.detail).length,
    vendorsParsed: soldTitles.length,
  };
  const meta = {
    generatedAt: new Date().toISOString(),
    source: "https://wiki.projectgorgon.com",
    pageUrlTemplate: WIKI + "{title}",
    note: "Komunitni data z wiki, ne z oficialnich JSON. U kazdeho tvrzeni uved odkaz na stranku (pole wiki/page + pageUrlTemplate, mezery v titulku jako podtrzitka).",
    counts, coverage: cov, unresolvedRawIngredients: unresolved,
  };
  sizes["wiki-meta.json"] = write("wiki-meta.json", meta);

  console.log("\nVelikosti:");
  for (const [k, v] of Object.entries(sizes)) console.log("  " + k.padEnd(28) + kb(v));
  console.log("\nPocty:", counts);
  console.log("\nPokryti ingredienci (" + TRACKED_SKILLS.join(", ") + ", level 0 az " + MAX_RECIPE_LEVEL + "):", cov);
  console.log("\nNeznama mista (" + unresolved.length + "):", unresolved.join(", "));
  console.log("\nNPC bez wiki stranky (" + npcsUnmatched.length + "):", npcsUnmatched.slice(0, 60).join(", "));
}

if (!process.env.WIKI_NO_MAIN) await main();
export { parseTables, parseGatherTables, parseMob, parseZone, parseNpc, getPages, sections, bodyText, findTemplates, clean };
