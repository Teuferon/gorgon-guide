import data from "../content/roadmap.json";
import type { Roadmap } from "./roadmap";

/** The roadmap content, authored in src/content/roadmap.json. */
export const roadmap = data as unknown as Roadmap;
