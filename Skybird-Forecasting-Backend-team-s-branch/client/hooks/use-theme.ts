import { useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark";

function getPreferredTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  const mql =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
  return mql && mql.matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => getPreferredTheme());

  // Apply theme class to <html>
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  // React to system changes when no explicit user choice stored
  useEffect(() => {
    const mql =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
    if (!mql) return;
    const onChange = () => {
      try {
        const saved = localStorage.getItem("theme");
        if (saved !== "light" && saved !== "dark")
          setTheme(mql.matches ? "dark" : "light");
      } catch {}
    };
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (
        e.key === "theme" &&
        (e.newValue === "light" || e.newValue === "dark")
      ) {
        setTheme(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useMemo(
    () => () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  return { theme, setTheme, toggle } as const;
}
