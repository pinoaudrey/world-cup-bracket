import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import App from './App'
import { StoreProvider } from './store'
import { theme } from './theme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* MantineProvider supplies the theme + CSS variables to the whole app.
        HashRouter (not BrowserRouter) keeps deep links working on GitHub Pages. */}
    <MantineProvider theme={theme}>
      <HashRouter>
        <StoreProvider>
          <App />
        </StoreProvider>
      </HashRouter>
    </MantineProvider>
  </StrictMode>,
)
