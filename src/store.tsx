import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { loadGameData } from "./lib/data";
import { loadState, reduce, saveState, type Action, type AppState } from "./lib/state";
import type { GameData } from "./lib/types";

interface StateCtx {
  state: AppState;
  dispatch: (a: Action) => void;
}

const Ctx = createContext<StateCtx | undefined>(undefined);

export function StateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, undefined, () => loadState(globalThis.localStorage));
  useEffect(() => saveState(globalThis.localStorage, state), [state]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): StateCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("StateProvider is missing");
  return v;
}

type DataStatus = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; data: GameData };

const DataCtx = createContext<DataStatus>({ status: "loading" });

export function DataProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<DataStatus>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    loadGameData().then(
      (data) => !cancelled && setValue({ status: "ready", data }),
      (e: unknown) => !cancelled && setValue({ status: "error", message: String(e) }),
    );
    return () => {
      cancelled = true;
    };
  }, []);
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useDataStatus(): DataStatus {
  return useContext(DataCtx);
}
