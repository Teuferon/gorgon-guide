import { Link } from "react-router-dom";
import { nextOpen } from "../lib/roadmap";
import { roadmap } from "../lib/roadmapData";
import { useAppState } from "../store";

/** The next three open roadmap milestones. */
export function WhereYouAre() {
  const { state } = useAppState();
  const next = nextOpen(roadmap, state.levels, state.roadmapDone, 3);
  return (
    <section className="bg-panel border border-line rounded-lg p-3 space-y-1" aria-label="Where you are">
      <h2 className="font-semibold">Where you are</h2>
      {next.length === 0 ? (
        <p className="text-muted">All roadmap milestones are done.</p>
      ) : (
        <>
          <p className="text-muted text-sm">Next open milestones on the <Link to="/roadmap">Roadmap</Link>:</p>
          <ol className="list-decimal pl-5">
            {next.map((m) => (
              <li key={m.id}>{m.title}</li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
