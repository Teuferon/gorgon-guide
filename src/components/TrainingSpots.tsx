/**
 * Slot for training spots (where to level a skill without recipes at the current level).
 *
 * TODO: fill this from the wiki data in src/data/wiki-*.json (zones with level ranges, monsters
 * with their areas, see docs/wiki-data.md). Every spot shown here needs a link to its wiki page.
 * Until that is wired up the component shows only a note and invents nothing.
 */
export function TrainingSpots({ skillKey, level }: { skillKey: string; level: number }) {
  return (
    <div className="text-sm text-muted border border-dashed border-line rounded-md p-2" data-slot="training-spots" data-skill={skillKey}>
      Training spots for level {level} will appear here once the wiki data is connected.
    </div>
  );
}
