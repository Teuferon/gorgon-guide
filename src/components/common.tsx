import { useState, type ReactNode } from "react";
import { clampLevel } from "../lib/state";
import { useDataStatus } from "../store";
import type { GameData } from "../lib/types";

/** Number input that keeps the typed text while editing and commits valid numbers. */
export function LevelInput({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  const [text, setText] = useState<string | undefined>(undefined);
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={150}
      aria-label={label}
      className="w-20"
      value={text ?? String(value)}
      onChange={(e) => {
        setText(e.target.value);
        if (e.target.value !== "") onChange(clampLevel(Number(e.target.value)));
      }}
      onBlur={() => setText(undefined)}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="inline-flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function Badge({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "good" | "warn" }) {
  const color = tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-muted";
  return <span className={`text-xs border border-line rounded px-1.5 py-0.5 whitespace-nowrap ${color}`}>{children}</span>;
}

/** Renders children once the game data is loaded, a short message before that. */
export function WithData({ children }: { children: (data: GameData) => ReactNode }) {
  const s = useDataStatus();
  if (s.status === "loading") return <p className="text-muted">Načítám herní data.</p>;
  if (s.status === "error") return <p className="text-warn">Data se nepodařilo načíst: {s.message}</p>;
  return <>{children(s.data)}</>;
}

export const fmtXp = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));
