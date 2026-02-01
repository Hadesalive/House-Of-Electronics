import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { ThemeProvider } from './contexts/ThemeContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { SalesProvider } from './contexts/SalesContext'
import { LicenseProvider } from './contexts/LicenseContext'
import { SyncProvider } from './contexts/SyncContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LicenseProvider>
          <SettingsProvider>
            <SalesProvider>
              <SyncProvider>
              <App />
              </SyncProvider>
            </SalesProvider>
          </SettingsProvider>
        </LicenseProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
