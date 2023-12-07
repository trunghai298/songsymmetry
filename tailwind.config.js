/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "spotify-green": "#1DB954",
        "spotify-green-dark": "#1aa34a",
        "spotify-green-light": "#1ed760",
        "spotify-black": "#191414",
        "spotify-black-light": "#282828",
        "spotify-black-lighter": "#121212",
        "spotify-white": "#FFFFFF",
        "spotify-white-light": "#F5F5F5",
        "spotify-white-lighter": "#F0F0F0",
        "spotify-gray": "#535353",
        "spotify-gray-light": "#B3B3B3",
        "spotify-gray-lighter": "#E5E5E5",
        "spotify-gray-lightest": "#F5F5F5",
        "min-blue":
          "linear-gradient(90deg, #417B94 3.82%, rgba(74, 163, 199, 0.71) 95.66%)",
        "shadow-gray": "rgba(0, 0, 0, 0.2) 0px 4px 12px 0px",
      },
      fontSize: {
        "400px": "400px",
        "5xl": "2.5rem",
        "6xl": "3rem",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      fontFamily: {
        receipt:
          "'receipt', 'Anonymous Pro', 'Courier New', Courier, monospace;",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      zIndex: {
        max: "9999",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
