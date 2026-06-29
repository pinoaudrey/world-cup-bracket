import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { DataProvider } from './store/DataContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter keeps deep links working on GitHub Pages (no server rewrites). */}
    <HashRouter>
      <DataProvider>
        <App />
      </DataProvider>
    </HashRouter>
  </StrictMode>,
)
