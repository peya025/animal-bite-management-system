import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import './styles/global.css'
import App from './App.tsx'
import { appTheme } from './styles/theme'
import { AuthProvider } from './shared/contexts/AuthContext'

createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={appTheme}>
    <CssBaseline />
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </ThemeProvider>,
)
