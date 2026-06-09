import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { green: '#0a7d3c', dark: '#075c2c', gold: '#f5b50a', ink: '#0f1b2d', blue: '#1652a1', red: '#d23b3b', soft: '#eef4f0' },
      },
    },
  },
  plugins: [],
};
export default config;
