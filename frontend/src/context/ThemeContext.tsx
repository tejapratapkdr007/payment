import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem("cpt_theme") as ThemeMode) || "system"
  );
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    mode === "system" ? (getSystemPrefersDark() ? "dark" : "light") : mode
  );

  useEffect(() => {
    const resolved = mode === "system" ? (getSystemPrefersDark() ? "dark" : "light") : mode;
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", resolved === "dark");
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const resolved = mq.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle("dark", resolved === "dark");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  function setMode(next: ThemeMode) {
    localStorage.setItem("cpt_theme", next);
    setModeState(next);
  }

  return (
    <ThemeContext.Provider value={{ mode, resolvedTheme, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
