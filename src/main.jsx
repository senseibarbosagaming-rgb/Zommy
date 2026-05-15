import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FirstRunExperience from './FirstRunExperience'
import NavExperienceLayer from './NavExperienceLayer'
import MemoryComposer from './MemoryComposer'
import CropPositionLayer from './CropPositionLayer'
import MemoryDiscovery from './MemoryDiscovery'
import CompareModesLayer from './CompareModesLayer'
import NotificationControlsLayer from './NotificationControlsLayer'
import AccessibilitySafetyLayer from './AccessibilitySafetyLayer'
import BrandConsistencyLayer from './BrandConsistencyLayer'
import SettingsHubLayer from './SettingsHubLayer'
import SettingsLauncherLayer from './SettingsLauncherLayer'
import NotificationControlsLauncherLayer from './NotificationControlsLauncherLayer'
import PWAExperienceLayer from './PWAExperienceLayer'
import TodayDashboardLayer from './TodayDashboardLayer'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <TodayDashboardLayer />
    <FirstRunExperience />
    <NavExperienceLayer />
    <MemoryComposer />
    <CropPositionLayer />
    <MemoryDiscovery />
    <CompareModesLayer />
    <NotificationControlsLayer />
    <AccessibilitySafetyLayer />
    <BrandConsistencyLayer />
    <SettingsHubLayer />
    <SettingsLauncherLayer />
    <NotificationControlsLauncherLayer />
    <PWAExperienceLayer />
  </React.StrictMode>
)
