import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0A0A0B',
          card: '#141415',
          hover: '#1A1A1C',
        },
        border: {
          DEFAULT: '#2A2A2D',
          hover: '#3A3A3D',
        },
        accent: {
          DEFAULT: '#7C3AED',
          hover: '#8B5CF6',
          muted: '#7C3AED20',
        },
        success: '#10B981',
        error: '#EF4444',
        warning: '#F59E0B',
        text: {
          primary: '#FAFAFA',
          secondary: '#A1A1AA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
