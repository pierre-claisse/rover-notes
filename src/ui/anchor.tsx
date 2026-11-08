import type { MouseEvent } from "react";

export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function scrollToId(id: string): void {
  const node = document.getElementById(id);
  if (!node) return;
  node.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

export function followAnchor(event: MouseEvent<HTMLAnchorElement>, id: string): void {
  event.preventDefault();
  const node = document.getElementById(id);
  if (!(node instanceof HTMLElement)) return;
  node.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  node.focus({ preventScroll: true });
}

export function readScrollTarget(state: unknown): "bilan" | "seance" | null {
  if (!state || typeof state !== "object" || !("scrollTo" in state)) return null;
  const value = (state as { scrollTo?: unknown }).scrollTo;
  if (value === "bilan" || value === "seance") return value;
  return null;
}

export function SkipLink() {
  return (
    <a
      className="skip"
      href="#contenu"
      onClick={(event) => {
        event.preventDefault();
        const node = document.getElementById("contenu");
        if (!(node instanceof HTMLElement)) return;
        node.focus();
      }}
    >
      Aller au contenu
    </a>
  );
}
