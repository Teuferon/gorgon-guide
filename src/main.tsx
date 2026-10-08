import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { DataProvider, StateProvider } from "./store";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <StateProvider>
        <DataProvider>
          <App />
        </DataProvider>
      </StateProvider>
    </HashRouter>
  </StrictMode>,
);
