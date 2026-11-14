import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Placeholder root — wired up to the kit shell in Task 6.
function App() {
  return (
    <main style={{ fontFamily: 'serif', padding: '2rem' }}>
      <h1>Card Catalogue</h1>
      <p>Scaffold only. UI wired in Task 6.</p>
    </main>
  )
}

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found in index.html')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
