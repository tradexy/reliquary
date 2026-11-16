import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.js'

// Re-render on back/forward navigation so URL-driven state updates.
window.addEventListener('popstate', () => {
  // The kit's App shell listens for popstate independently and updates its
  // own locationState. This listener ensures the root is re-rendered when
  // the shell is replaced after a hot-module update.
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found in index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
