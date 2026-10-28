import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      keyframes: {
        twinkle: { '0%, 100%': { opacity: '0.25' }, '50%': { opacity: '1' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        flicker: { '0%, 100%': { opacity: '1' }, '45%': { opacity: '0.55' }, '55%': { opacity: '0.9' } },
        // Day sky: clouds and birds cross the hero, birds flap in two pixel frames.
        drift: { '0%': { left: '-25%' }, '100%': { left: '105%' } },
        glide: {
          '0%': { left: '-8%', transform: 'translateY(0)' },
          '25%': { transform: 'translateY(-8px)' },
          '50%': { transform: 'translateY(2px)' },
          '75%': { transform: 'translateY(-4px)' },
          '100%': { left: '104%', transform: 'translateY(0)' },
        },
        flap: { '0%, 49%': { transform: 'scaleY(1)' }, '50%, 100%': { transform: 'scaleY(-1)' } },
        glow: { '0%, 100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
      },
      animation: {
        twinkle: 'twinkle 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        flicker: 'flicker 4s ease-in-out infinite',
        drift: 'drift 90s linear infinite',
        glide: 'glide 32s linear infinite',
        flap: 'flap 0.7s linear infinite',
        glow: 'glow 5s ease-in-out infinite',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
}

export default config
