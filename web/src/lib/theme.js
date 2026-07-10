"use client";
import { useSyncExternalStore } from "react";

function getTheme() {
  if (typeof document === "undefined") return "light";
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr) return attr;
  // Fall back to OS preference on first visit.
  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

function apply(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem("ayus:theme", theme);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("ayus:theme", { detail: theme }));
}

// Run once on app load to restore the saved theme before paint flicker.
export function initTheme() {
  if (typeof window === "undefined") return;
  let theme = "light";
  try {
    theme = window.localStorage.getItem("ayus:theme") || theme;
  } catch {
    /* ignore */
  }
  apply(theme);
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      window.addEventListener("ayus:theme", cb);
      window.addEventListener("storage", cb);
      return () => {
        window.removeEventListener("ayus:theme", cb);
        window.removeEventListener("storage", cb);
      };
    },
    getTheme,
    () => "light"
  );
  const toggle = () => apply(theme === "dark" ? "light" : "dark");
  const set = (t) => apply(t);
  return { theme, toggle, set };
}
