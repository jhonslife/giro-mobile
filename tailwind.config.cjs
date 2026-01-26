/**
 * 🎨 GIRO Mobile - Tailwind Config
 * 
 * Design System Unificado - Arkheion Corp
 * @version 2.0.0
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        /* ═══════════════════════════════════════════════════════════════════════════
           🎨 GIRO BRAND COLORS (HEX for React Native)
           ═══════════════════════════════════════════════════════════════════════════ */
        
        // Primary - Verde GIRO
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Principal
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },

        // Accent - Laranja GIRO
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Principal
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },

        // Enterprise - Azul Industrial
        enterprise: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6', // Principal
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        /* ═══════════════════════════════════════════════════════════════════════════
           ✅ SEMANTIC COLORS
           ═══════════════════════════════════════════════════════════════════════════ */
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6',

        /* ═══════════════════════════════════════════════════════════════════════════
           ⚪ NEUTRAL COLORS
           ═══════════════════════════════════════════════════════════════════════════ */
        background: {
          DEFAULT: '#ffffff',
          secondary: '#f9fafb',
          tertiary: '#f3f4f6',
        },
        foreground: {
          DEFAULT: '#111827',
          secondary: '#6b7280',
          muted: '#9ca3af',
        },
        border: {
          DEFAULT: '#e5e7eb',
          focus: '#22c55e',
        },
        muted: {
          DEFAULT: '#f3f4f6',
          foreground: '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        'safe-top': 'var(--safe-area-inset-top)',
        'safe-bottom': 'var(--safe-area-inset-bottom)',
        'safe-left': 'var(--safe-area-inset-left)',
        'safe-right': 'var(--safe-area-inset-right)',
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '4px',
        md: '6px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
};
