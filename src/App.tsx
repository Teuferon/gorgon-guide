import { Navigate, NavLink, Route, Routes } from "react-router-dom";
import { gameMeta } from "./lib/data";
import NextStepsPage from "./pages/NextStepsPage";
import SkillsPage from "./pages/SkillsPage";
import SkillDetailPage from "./pages/SkillDetailPage";
import TasksPage from "./pages/TasksPage";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 rounded-md ${isActive ? "bg-panel2 text-fg" : "text-muted hover:text-fg"}`;

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-panel">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-semibold text-lg">Gorgon Guide</span>
          <nav className="flex flex-wrap gap-1" aria-label="Main navigation">
            <NavLink to="/" end className={navClass}>Next steps</NavLink>
            <NavLink to="/skills" className={navClass}>My skills</NavLink>
            <NavLink to="/tasks" className={navClass}>Custom tasks</NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<NextStepsPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/skill/:name" element={<SkillDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          {/* Old Czech routes from the first version, kept so saved links still work. */}
          <Route path="/skilly" element={<Navigate to="/skills" replace />} />
          <Route path="/ukoly" element={<Navigate to="/tasks" replace />} />
          <Route path="*" element={<p>This page does not exist.</p>} />
        </Routes>
      </main>
      <footer className="border-t border-line text-muted text-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-1">
          <p>{gameMeta.copyright}</p>
          <p>
            Project Gorgon game data, version {gameMeta.gameDataVersion}, downloaded {gameMeta.generatedAt.slice(0, 10)}.
          </p>
        </div>
      </footer>
    </div>
  );
}
