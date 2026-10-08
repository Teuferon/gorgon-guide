// Guides are Markdown files named after the skill internal name, for example Fletching.md.
// Vite turns each file into its own lazy chunk, so a guide loads only when its page opens.
const modules = import.meta.glob("../content/guides/*.md", { query: "?raw", import: "default" }) as Record<
  string,
  () => Promise<string>
>;

const byName = new Map<string, () => Promise<string>>();
for (const [path, loader] of Object.entries(modules)) {
  const name = path.split("/").pop()?.replace(/\.md$/, "");
  if (name) byName.set(name, loader);
}

export function hasGuide(skillKey: string): boolean {
  return byName.has(skillKey);
}

export async function loadGuide(skillKey: string): Promise<string | undefined> {
  const loader = byName.get(skillKey);
  return loader ? loader() : undefined;
}
