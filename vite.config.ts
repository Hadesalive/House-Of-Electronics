import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: './postcss.config.mjs',
    devSourcemap: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets', // Use lowercase assets folder
    copyPublicDir: true,
    // Ensure CSS is processed for Electron compatibility
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // Ensure CSS is bundled properly for Electron
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
  base: './', // Important for Electron
  publicDir: 'public', // Explicitly set public directory
  define: {
    // Define process for compatibility with Next.js dependencies
    'process.env': {},
    'process.platform': JSON.stringify('win32'),
    'process.version': JSON.stringify('v18.0.0'),
  },
  // Ensure modern CSS features are polyfilled for Electron
  esbuild: {
    target: 'chrome100', // Match Electron 22's Chromium version
  },
})
