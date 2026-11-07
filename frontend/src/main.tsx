import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import './styles/global.css'
import App from './App.tsx'
import { AppThemeProvider } from './shared/contexts/ThemeContext'
import { AuthProvider } from './shared/contexts/AuthContext'
import { WalkthroughProvider } from './features/walkthrough'
import ErrorBoundary from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <AppThemeProvider>
    <CssBaseline />
    <BrowserRouter>
      <AuthProvider>
        <WalkthroughProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </WalkthroughProvider>
      </AuthProvider>
    </BrowserRouter>
  </AppThemeProvider>,
)
