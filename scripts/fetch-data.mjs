#!/usr/bin/env node
// Downloads the official Project Gorgon data files and builds trimmed JSON for the app.
//
//   node scripts/fetch-data.mjs            download (if the version changed) and build
//   node scripts/fetch-data.mjs --force    download again even if the version is unchanged
//   node scripts/fetch-data.mjs --offline  build only, from the cache in data/raw/
//
// Only Node built-ins are used (Node 18+ for global fetch). See docs/data-sources.md.

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RAW_DIR = path.join(ROOT, "data", "raw");
const OUT_DIR = path.join(ROOT, "src", "data");

const VERSION_URL = "https://client.projectgorgon.com/fileversion.txt";
const cdnBase = (v) => `https://cdn.projectgorgon.com/v${v}/data/`;

const RAW_FILES = [
  "skills",
  "xptables",
  "recipes",
  "items",
  "sources_recipes",
  "sources_items",
  "npcs",
  "areas",
  "abilities",
  "quests",
];

const args = new Set(process.argv.slice(2));
const FORCE = args.has("--force");
const OFFLINE = args.has("--offline");

// ---------------------------------------------------------------- download

async function fetchText(url, tries = 3) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      if (i < tries) await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
  throw lastErr;
}

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

async function download() {
  await mkdir(RAW_DIR, { recursive: true });
  const versionFile = path.join(RAW_DIR, "_version.txt");
  const version = (await fetchText(VERSION_URL)).trim();
  if (!/^[A-Za-z0-9]+$/.test(version)) {
    throw new Error(`Unexpected content of fileversion.txt: ${JSON.stringify(version)}`);
  }
  const cached = (await exists(versionFile)) ? (await readFile(versionFile, "utf8")).trim() : null;
  let complete = true;
  for (const f of RAW_FILES) if (!(await exists(path.join(RAW_DIR, `${f}.json`)))) complete = false;

  if (!FORCE && cached === version && complete) {
    console.log(`Raw data for version ${version} is already cached, skipping download.`);
    return version;
  }
  console.log(`Downloading data version ${version} from ${cdnBase(version)}`);
  for (const f of RAW_FILES) {
    const text = await fetchText(`${cdnBase(version)}${f}.json`);
    JSON.parse(text); // fail early on a broken download
    await writeFile(path.join(RAW_DIR, `${f}.json`), text);
    console.log(`  ${f}.json  ${(text.length / 1024).toFixed(0)} KB`);
  }
  await writeFile(versionFile, version);
  return version;
}

// ---------------------------------------------------------------- helpers

const readRaw = async (name) => JSON.parse(await readFile(path.join(RAW_DIR, `${name}.json`), "utf8"));
const numId = (key) => Number(key.slice(key.indexOf("_") + 1));
const humanize = (s) => s.replace(/_/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2");
const prune = (o) => {
  for (const k of Object.keys(o)) if (o[k] === undefined) delete o[k];
  return o;
};
const uniq = (a) => [...new Set(a)];

// Keywords on recipes that only serve the game's internal validation or are noise for us.
const NOISE_RECIPE_KEYWORDS = new Set([
  "NoValueGeneration",
  "NotIncludedInDynamicUsageListings",
  "MaxEnchanting",
  "HighValueGeneration",
]);
const isLint = (k) => k.startsWith("Lint_");

// ---------------------------------------------------------------- build

async function build(version) {
  const [skillsRaw, xpRaw, recipesRaw, itemsRaw, srcRecipesRaw, srcItemsRaw, npcsRaw, areasRaw, abilitiesRaw, questsRaw] =
    await Promise.all(RAW_FILES.map(readRaw));

  // ---- XP tables, keyed by InternalName; used tables only
  const xpByName = {};
  for (const t of Object.values(xpRaw)) xpByName[t.InternalName] = t.XpAmounts;

  // ---- recipe id lookup by internal name (needed for PrereqRecipe and skill rewards)
  const recipeIdByName = {};
  for (const [key, r] of Object.entries(recipesRaw)) recipeIdByName[r.InternalName] = numId(key);

  // ---- skills
  const abilityByInternal = {};
  for (const [key, a] of Object.entries(abilitiesRaw)) abilityByInternal[a.InternalName] = { key, a };

  const usedAbilities = new Set();
  const skillLevelOfRecipe = {}; // recipeId -> [{skill, level}]
  const skills = {};
  const usedXpTables = new Set();

  for (const [key, s] of Object.entries(skillsRaw)) {
    const table = xpByName[s.XpTable];
    const hasXp = Array.isArray(table) && table.length > 1;
    if (hasXp) usedXpTables.add(s.XpTable);

    const rewards = [];
    for (const [rk, rv] of Object.entries(s.Rewards ?? {})) {
      const [lvlStr, ...races] = rk.split("_");
      const level = Number(lvlStr);
      if (rv.Recipe) {
        const rid = recipeIdByName[rv.Recipe];
        rewards.push(prune({ level, recipe: rid, note: rv.Notes }));
        if (rid != null) (skillLevelOfRecipe[rid] ??= []).push({ skill: key, level });
      }
      if (rv.BonusToSkill) rewards.push(prune({ level, bonusToSkill: rv.BonusToSkill, note: rv.Recipe ? undefined : rv.Notes }));
      if (rv.Ability) {
        usedAbilities.add(rv.Ability);
        rewards.push({ level, ability: rv.Ability, races: races.length ? races : undefined });
      }
      if (!rv.Recipe && !rv.BonusToSkill && !rv.Ability && rv.Notes) rewards.push({ level, note: rv.Notes });
    }
    rewards.sort((a, b) => a.level - b.level);

    skills[key] = prune({
      id: s.Id,
      name: s.Name ?? humanize(key),
      desc: s.Description,
      combat: s.Combat || undefined,
      umbrella: s.IsUmbrellaSkill || undefined,
      parents: s.Parents?.length ? s.Parents : undefined,
      xpTable: hasXp ? s.XpTable : undefined,
      maxLevel: hasXp ? table.length : undefined,
      maxBonusLevels: s.MaxBonusLevels,
      hideWhenZero: s.HideWhenZero || undefined,
      advancementHints: s.AdvancementHints,
      rewards: rewards.length ? rewards : undefined,
    });
  }

  const xptables = {};
  for (const name of [...usedXpTables].sort()) xptables[name] = xpByName[name];

  // ---- items: collect what we need first
  const keywordsInRecipes = new Set();
  for (const r of Object.values(recipesRaw)) {
    for (const ing of r.Ingredients ?? []) for (const k of ing.ItemKeys ?? []) keywordsInRecipes.add(k);
  }
  const itemIdsInRecipes = new Set();
  for (const r of Object.values(recipesRaw)) {
    for (const list of [r.Ingredients, r.ResultItems, r.ProtoResultItems]) {
      for (const x of list ?? []) if (x.ItemCode != null) itemIdsInRecipes.add(x.ItemCode);
    }
  }

  const items = {};
  for (const [key, it] of Object.entries(itemsRaw)) {
    const id = numId(key);
    const kws = it.Keywords ?? [];
    const notObtainable = kws.includes("Lint_NotObtainable");
    if (notObtainable && !itemIdsInRecipes.has(id)) continue;
    const recipeKws = kws.filter((k) => keywordsInRecipes.has(k.split("=")[0]));
    items[id] = prune({
      name: it.Name,
      value: it.Value,
      stack: it.MaxStackSize,
      icon: it.IconId,
      keywords: recipeKws.length ? recipeKws : undefined,
      equipSlot: it.EquipSlot,
      notObtainable: notObtainable || undefined,
    });
  }
  const itemName = (id) => itemsRaw[`item_${id}`]?.Name ?? `#${id}`;

  // ---- recipes
  const ingredient = (x) =>
    x.ItemCode != null
      ? prune({ id: x.ItemCode, name: itemName(x.ItemCode), qty: x.StackSize, consumeChance: x.ChanceToConsume, durability: x.DurabilityConsumed })
      : prune({ keywords: x.ItemKeys, name: x.Desc, qty: x.StackSize, consumeChance: x.ChanceToConsume, durability: x.DurabilityConsumed });
  const result = (x) => prune({ id: x.ItemCode, name: itemName(x.ItemCode), qty: x.StackSize, chance: x.PercentChance });

  const recipes = {};
  for (const [key, r] of Object.entries(recipesRaw)) {
    const id = numId(key);
    const kws = (r.Keywords ?? []).filter((k) => !isLint(k) && !NOISE_RECIPE_KEYWORDS.has(k));
    const lint = (r.Keywords ?? []).filter(isLint);
    recipes[id] = prune({
      name: r.Name,
      internal: r.InternalName,
      skill: r.Skill,
      level: r.SkillLevelReq,
      xp: r.RewardSkillXp,
      xpFirst: r.RewardSkillXpFirstTime,
      xpSkill: r.RewardSkill !== r.Skill ? r.RewardSkill : undefined,
      dropOff:
        r.RewardSkillXpDropOffLevel != null
          ? { level: r.RewardSkillXpDropOffLevel, pct: r.RewardSkillXpDropOffPct, rate: r.RewardSkillXpDropOffRate }
          : undefined,
      noXp: lint.includes("Lint_NoXP") || undefined,
      prereq: r.PrereqRecipe ? recipeIdByName[r.PrereqRecipe] : undefined,
      ingredients: (r.Ingredients ?? []).map(ingredient),
      results: r.ResultItems?.length ? r.ResultItems.map(result) : undefined,
      protoResults: r.ProtoResultItems?.length ? r.ProtoResultItems.map(result) : undefined,
      costs: r.Costs?.map((c) => ({ currency: c.Currency, price: c.Price })),
      keywords: kws.length ? kws : undefined,
      maxUses: r.MaxUses,
      resetSeconds: r.ResetTimeInSeconds,
      notObtainable: lint.includes("Lint_NotObtainable") || lint.includes("Lint_NotLearnable") || undefined,
    });
  }

  // ---- NPCs and areas
  const areas = {};
  for (const [k, a] of Object.entries(areasRaw)) areas[k] = a.FriendlyName;

  const npcs = {};
  for (const [k, n] of Object.entries(npcsRaw)) {
    const services = n.Services ?? [];
    const store = services.find((s) => s.Type === "Store");
    const training = services.filter((s) => s.Type === "Training");
    npcs[k] = prune({
      name: n.Name,
      area: n.AreaName,
      storeFavor: store?.Favor,
      trains: training.length ? uniq(training.flatMap((t) => t.Skills ?? []).filter((s) => s !== "Unknown")) : undefined,
      trainFavor: training[0]?.Favor,
      services: uniq(services.map((s) => s.Type)),
    });
  }

  // ---- quests (names only, for source lookups)
  const quests = {};
  for (const [k, q] of Object.entries(questsRaw)) {
    quests[numId(k)] = prune({ name: q.Name, npc: q.FavorNpc ?? q.QuestNpc, location: q.DisplayedLocation });
  }
  const questSeen = new Set();

  // ---- sources
  function groupEntries(entries, itemIdOf) {
    const out = {};
    const push = (k, v) => (out[k] ??= []).push(v);
    for (const e of entries) {
      switch (e.type) {
        case "Vendor": push("vendor", e.npc); break;
        case "Barter": push("barter", e.npc); break;
        case "Training": push("training", e.npc); break;
        case "NpcGift": push("gift", e.npc); break;
        case "HangOut": push("hangout", e.npc); break;
        case "Quest": push("quest", e.questId); questSeen.add(e.questId); break;
        case "Recipe": push("recipe", e.recipeId); break;
        case "Item": push("item", e.itemTypeId); break;
        case "Skill": push("skill", e.skill); break;
        default: push("other", e.type + (e.friendlyName ? `:${e.friendlyName}` : ""));
      }
    }
    for (const k of Object.keys(out)) out[k] = uniq(out[k]);
    return out;
  }

  const recipeSources = {};
  for (const [k, v] of Object.entries(srcRecipesRaw)) {
    const id = numId(k);
    if (!recipes[id]) continue;
    const g = groupEntries(v.entries);
    // Skill sources are recipes granted at a skill level; resolve the level from skills.json rewards.
    const lv = skillLevelOfRecipe[id];
    if (lv) g.skill = lv.map((x) => ({ skill: x.skill, level: x.level }));
    else if (g.skill) g.skill = g.skill.map((skill) => ({ skill }));
    recipeSources[id] = g;
  }

  const itemSources = {};
  for (const [k, v] of Object.entries(srcItemsRaw)) {
    const id = numId(k);
    if (!items[id]) continue;
    itemSources[id] = groupEntries(v.entries);
  }

  // Only keep quest names that a source points to.
  const questsOut = {};
  for (const id of questSeen) if (quests[id]) questsOut[id] = quests[id];

  // ---- abilities referenced by skill rewards
  const abilities = {};
  for (const name of usedAbilities) {
    const hit = abilityByInternal[name];
    if (!hit) continue;
    const { a } = hit;
    abilities[name] = prune({
      name: a.Name,
      skill: a.Skill,
      level: a.Level,
      desc: a.Description,
      damageType: a.DamageType,
      resetTime: a.ResetTime,
      powerCost: a.PvE?.PowerCost,
      upgradeOf: a.UpgradeOf,
      icon: a.IconID,
    });
  }

  // ---- write
  await mkdir(OUT_DIR, { recursive: true });
  const meta = {
    gameDataVersion: version,
    generatedAt: new Date().toISOString(),
    source: cdnBase(version),
    iconUrlTemplate: `https://cdn.projectgorgon.com/v${version}/icons/icon_{id}.png`,
    copyright: `Some portions copyright ${new Date().getFullYear()} Elder Game, LLC.`,
    counts: {
      skills: Object.keys(skills).length,
      recipes: Object.keys(recipes).length,
      items: Object.keys(items).length,
      npcs: Object.keys(npcs).length,
      abilities: Object.keys(abilities).length,
    },
  };

  const outputs = {
    "meta.json": meta,
    "skills.json": skills,
    "xptables.json": xptables,
    "recipes.json": recipes,
    "items.json": items,
    "recipe-sources.json": recipeSources,
    "item-sources.json": itemSources,
    "npcs.json": npcs,
    "areas.json": areas,
    "quests.json": questsOut,
    "abilities.json": abilities,
  };

  console.log("\nOutput in src/data/ (minified JSON):");
  let total = 0;
  let totalGz = 0;
  for (const [name, data] of Object.entries(outputs)) {
    const text = JSON.stringify(data);
    await writeFile(path.join(OUT_DIR, name), text);
    const gz = gzipSync(text).length;
    total += text.length;
    totalGz += gz;
    console.log(`  ${name.padEnd(22)} ${(text.length / 1024).toFixed(0).padStart(6)} KB   gzip ${(gz / 1024).toFixed(0).padStart(5)} KB`);
  }
  console.log(`  ${"TOTAL".padEnd(22)} ${(total / 1024).toFixed(0).padStart(6)} KB   gzip ${(totalGz / 1024).toFixed(0).padStart(5)} KB`);
}

// ---------------------------------------------------------------- main

let version;
if (OFFLINE) {
  const vf = path.join(RAW_DIR, "_version.txt");
  version = (await exists(vf)) ? (await readFile(vf, "utf8")).trim() : "unknown";
  console.log(`Offline mode, building from cached version ${version}.`);
} else {
  version = await download();
}
await build(version);
