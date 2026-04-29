'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      aria-pressed={isDark}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 'var(--radius-pill)',
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        transition:
          'background-color 0.25s ease, border-color 0.25s ease, color 0.25s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-strong)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = '0 0 0 3px var(--ring)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          opacity: isDark ? 1 : 0,
          transform: isDark ? 'rotate(0deg)' : 'rotate(-90deg)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        <Sun size={16} strokeWidth={1.75} />
      </span>
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          opacity: isDark ? 0 : 1,
          transform: isDark ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        <Moon size={16} strokeWidth={1.75} />
      </span>
    </button>
  );
}
