"use client";
import { useEffect } from "react";
import { initTheme } from "@/lib/theme";

// Boots the saved theme before paint — exists purely as the mount vehicle for
// initTheme(), which must run on the client.
export default function ThemeBoot() {
  useEffect(() => { initTheme(); }, []);
  return null;
}
