import type { Config } from 'tailwindcss'

const config: Config = {
  // HAPUS 'apps/web/' dari depan path karena kita sudah berada di dalam folder tersebut saat run dev
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        primary: '#3d85c6',
      },
    },
  },
  plugins: [],
}
export default config