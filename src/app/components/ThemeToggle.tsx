"use client";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const enabled = saved ? saved === "dark" : false;
    document.documentElement.classList.toggle("dark", enabled);
    setIsDark(enabled);
  }, []);
  const toggle = () => {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };
  return (
    <button onClick={toggle}
      className="rounded-xl px-3 py-1 border
                 bg-background text-foreground
                 hover:opacity-90 border-neutral-300 dark:border-neutral-700">
      {isDark ? "Mode Terang" : "Mode Gelap"}
    </button>
  );
}
