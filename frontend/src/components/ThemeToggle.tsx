import { useTheme } from "../context/ThemeContext";

const ICONS = { light: "☀️", dark: "🌙", system: "🖥️" } as const;
const NEXT = { light: "dark", dark: "system", system: "light" } as const;

export function ThemeToggle() {
  const { mode, setMode } = useTheme();
  return (
    <button
      onClick={() => setMode(NEXT[mode])}
      aria-label={`Theme: ${mode}. Click to change.`}
      title={`Theme: ${mode}`}
      className="h-9 w-9 inline-flex items-center justify-center rounded-DEFAULT border-2 border-line dark:border-line-dark hover:bg-ink-50 dark:hover:bg-ink-700 transition-colors text-base"
    >
      {ICONS[mode]}
    </button>
  );
}
