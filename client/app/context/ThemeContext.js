'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyTheme(value) {
  if (value !== 'light' && value !== 'dark') return;
  document.documentElement.dataset.theme = value;
  try {
    localStorage.setItem('trello-theme', value);
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('trello-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const resolved =
        stored === 'dark' || stored === 'light' ? stored : prefersDark ? 'dark' : 'light';
      setThemeState(resolved);
      applyTheme(resolved);
    } catch {
      applyTheme('light');
    }
  }, []);

  const setTheme = useCallback((next) => {
    setThemeState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      if (value !== 'light' && value !== 'dark') return prev;
      applyTheme(value);
      return value;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => {
      const next = t === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
