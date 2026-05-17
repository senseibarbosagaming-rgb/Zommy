import React from 'react'
import ReactDOM from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './App'
import ThemeLayer from './ThemeLayer'
import BottomSafeAreaLayer from './BottomSafeAreaLayer'
import { AppShellProvider } from './AppShellContext'

if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Light }).catch(() => null)
  StatusBar.setBackgroundColor({ color: '#F5F2EE' }).catch(() => null)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeLayer />
    <BottomSafeAreaLayer />
    <AppShellProvider>
      <App />
    </AppShellProvider>
  </React.StrictMode>,
)
