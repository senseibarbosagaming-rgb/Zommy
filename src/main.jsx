import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ThemeLayer from './ThemeLayer'
import BottomSafeAreaLayer from './BottomSafeAreaLayer'
import { AppShellProvider } from './AppShellContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeLayer />
    <BottomSafeAreaLayer />
    <AppShellProvider>
      <App />
    </AppShellProvider>
  </React.StrictMode>
)
