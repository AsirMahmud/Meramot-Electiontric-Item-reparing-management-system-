"use client";

import { useAppTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useAppTheme();

  if (!mounted) {
    return (
      <div className="h-11 w-20 rounded-full border border-[var(--border)] bg-[var(--card)] shadow-sm" />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="relative inline-flex h-11 w-20 items-center rounded-full border border-[var(--border)] bg-[var(--card)] px-1.5 shadow-sm transition hover:shadow-md"
    >
      <span
        className={`absolute top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-[var(--accent-dark)] shadow-sm transition-all duration-300 ${
          isDark ? "left-[42px]" : "left-1.5"
        }`}
      />

      <span className="relative z-10 flex w-full items-center justify-between px-1 text-[var(--muted-foreground)]">
        <span
          className={`flex h-6 w-6 items-center justify-center transition ${
            !isDark ? "text-white" : "text-[var(--muted-foreground)]"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4.5 w-4.5"
          >
            <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm0-16a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V3a1 1 0 0 1 1-1Zm0 16a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm10-7a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM5 12a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h2Zm13.364-6.95a1 1 0 0 1 1.414 1.414l-1.414 1.414a1 1 0 1 1-1.414-1.414l1.414-1.414ZM7.05 16.95a1 1 0 0 1 1.414 1.414L7.05 19.778a1 1 0 1 1-1.414-1.414L7.05 16.95Zm11.314 2.828a1 1 0 0 1-1.414 0L15.536 18.364a1 1 0 0 1 1.414-1.414l1.414 1.414a1 1 0 0 1 0 1.414ZM8.464 7.05A1 1 0 0 1 7.05 8.464L5.636 7.05A1 1 0 1 1 7.05 5.636L8.464 7.05Z" />
          </svg>
        </span>

        <span
          className={`flex h-6 w-6 items-center justify-center transition ${
            isDark ? "text-white" : "text-[var(--muted-foreground)]"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-4.5 w-4.5"
          >
            <path d="M21.752 15.002A9 9 0 0 1 9 2.248a.75.75 0 0 0-.813 1.206A7.5 7.5 0 1 0 20.546 15.81a.75.75 0 0 0 1.206-.808Z" />
          </svg>
        </span>
      </span>
    </button>
  );
}