import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyAppFont, getStoredFontId } from './utils/fontUtils'

// Apply cached master font immediately before initial render
applyAppFont(getStoredFontId());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
