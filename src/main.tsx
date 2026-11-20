import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyAppFont, getStoredFontId } from './utils/fontUtils'
import { applyGradientMode, getStoredGradientMode } from './utils/gradientUtils'
import { applySoundTheme, getStoredSoundTheme } from './utils/audio'

// Apply cached master font, gradient mode, and sound theme immediately before initial render
applyAppFont(getStoredFontId());
applyGradientMode(getStoredGradientMode());
applySoundTheme(getStoredSoundTheme(), false);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Register lightweight service worker in production for full standalone PWA installability
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration skipped:', err);
    });
  });
}
