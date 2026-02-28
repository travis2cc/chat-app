import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        wechat: {
          green: '#07C160',
          'green-dark': '#06AD56',
          bg: '#EDEDED',
          'bubble-self': '#95EC69',
          'bubble-other': '#FFFFFF',
          nav: '#F7F7F7',
          'nav-border': '#E5E5E5',
          'text-primary': '#1A1A1A',
          'text-secondary': '#888888',
          'header': '#EFEFEF',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      screens: {
        xs: '390px',
      },
    },
  },
  plugins: [],
};

export default config;
