import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  plugins: [
    tailwindcss,
    autoprefixer({
      // Target Electron 22's Chromium version specifically
      overrideBrowserslist: [
        'Chrome >= 100', // Electron 22 uses Chromium 100+
        'Chrome >= 100 and not Chrome < 100', // Ensure exact version
      ],
      // Enable CSS Grid and modern features
      grid: 'autoplace',
      // Enable modern CSS features
      flexbox: 'no-2009',
      // Enable CSS custom properties
      customProperties: true,
      // Enable modern CSS features that Electron supports
      cascade: true,
      add: true,
      remove: true,
    }),
  ],
}
