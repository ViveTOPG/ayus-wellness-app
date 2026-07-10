"use client";
import { useState, useEffect, useCallback } from "react";

const PREFIX = "ayus:v1:";

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function write(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("ayus:change", { detail: { key } }));
  } catch {
    /* quota / disabled — ignore */
  }
}

// Generic localStorage state hook — keeps components in sync across tabs.
export function useLocal(key, fallback) {
  const [value, setValue] = useState(() => read(key, fallback));

  useEffect(() => {
    const onChange = (e) => {
      if (!e.key || e.key === PREFIX + key || e.type === "ayus:change") {
        setValue(read(key, fallback));
      }
    };
    window.addEventListener("storage", onChange);
    window.addEventListener("ayus:change", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("ayus:change", onChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback((next) => {
    setValue((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      write(key, v);
      return v;
    });
  }, [key]);

  return [value, update];
}

export const Storage = {
  get favorites() {
    return read("favorites", []);
  },
  setFavorites(v) {
    write("favorites", v);
  },
  get routines() {
    return read("routines", []);
  },
  setRoutines(v) {
    write("routines", v);
  },
  get prakriti() {
    return read("prakriti", null);
  },
  setPrakriti(v) {
    write("prakriti", v);
  },
  get journal() {
    return read("journal", []);
  },
  setJournal(v) {
    write("journal", v);
  },
};
