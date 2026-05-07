import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Plugins are processors that transform your code during build/dev
  // - react()      : enables React JSX support
  // - tailwindcss(): scans your code for Tailwind classes & generates CSS
  plugins: [react(), tailwindcss()],
})
