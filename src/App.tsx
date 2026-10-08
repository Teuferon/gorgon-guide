import { NavLink, Route, Routes } from "react-router-dom";
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
          <nav className="flex flex-wrap gap-1" aria-label="Hlavní navigace">
            <NavLink to="/" end className={navClass}>Další kroky</NavLink>
            <NavLink to="/skilly" className={navClass}>Moje skilly</NavLink>
            <NavLink to="/ukoly" className={navClass}>Vlastní úkoly</NavLink>
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<NextStepsPage />} />
          <Route path="/skilly" element={<SkillsPage />} />
          <Route path="/skill/:name" element={<SkillDetailPage />} />
          <Route path="/ukoly" element={<TasksPage />} />
          <Route path="*" element={<p>Stránka neexistuje.</p>} />
        </Routes>
      </main>
      <footer className="border-t border-line text-muted text-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-1">
          <p>{gameMeta.copyright}</p>
          <p>
            Data hry Project Gorgon, verze {gameMeta.gameDataVersion}, staženo {gameMeta.generatedAt.slice(0, 10)}.
          </p>
        </div>
      </footer>
    </div>
  );
}
