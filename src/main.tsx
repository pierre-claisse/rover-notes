import "@fontsource-variable/space-grotesk/wght.css";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Racine introuvable");
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
