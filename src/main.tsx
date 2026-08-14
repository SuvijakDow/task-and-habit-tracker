import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyAppFont, getStoredFontId } from './utils/fontUtils'
import { applyGradientMode, getStoredGradientMode } from './utils/gradientUtils'

// Apply cached master font and gradient mode immediately before initial render
applyAppFont(getStoredFontId());
applyGradientMode(getStoredGradientMode());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
