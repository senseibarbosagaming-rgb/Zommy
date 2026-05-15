import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FirstRunExperience from './FirstRunExperience'
import NavExperienceLayer from './NavExperienceLayer'
import MemoryComposer from './MemoryComposer'
import CropPositionLayer from './CropPositionLayer'
import MemoryDiscovery from './MemoryDiscovery'
import CompareScreen from './CompareScreen'
import NotificationControlsLayer from './NotificationControlsLayer'
import AccessibilitySafetyLayer from './AccessibilitySafetyLayer'
import BrandConsistencyLayer from './BrandConsistencyLayer'
import SettingsScreen from './SettingsScreen'
import NotificationControlsLauncherLayer from './NotificationControlsLauncherLayer'
import PWAExperienceLayer from './PWAExperienceLayer'
import TodayDashboardLayer from './TodayDashboardLayer'
import TimelineScreen from './TimelineScreen'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <TodayDashboardLayer />
    <TimelineScreen />
    <CompareScreen />
    <SettingsScreen />
    <FirstRunExperience />
    <NavExperienceLayer />
    <MemoryComposer />
    <CropPositionLayer />
    <MemoryDiscovery />
    <NotificationControlsLayer />
    <AccessibilitySafetyLayer />
    <BrandConsistencyLayer />
    <NotificationControlsLauncherLayer />
    <PWAExperienceLayer />
  </React.StrictMode>
)
