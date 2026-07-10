"use client";
import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const [t, setT] = useState(null);

  const toast = useCallback((message, ms = 2600) => {
    setMsg(message);
    if (t) clearTimeout(t);
    const id = setTimeout(() => setMsg(null), ms);
    setT(id);
  }, [t]);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className={`toast ${msg ? "show" : ""}`} role="status" aria-live="polite">
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}
