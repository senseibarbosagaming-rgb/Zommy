import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FirstRunExperience from './FirstRunExperience'
import NavExperienceLayer from './NavExperienceLayer'
import MemoryComposer from './MemoryComposer'
import ComposerLauncherLayer from './ComposerLauncherLayer'
import CropPositionLayer from './CropPositionLayer'
import MemoryDiscovery from './MemoryDiscovery'
import CompareModesLayer from './CompareModesLayer'
import NotificationControlsLayer from './NotificationControlsLayer'
import AccessibilitySafetyLayer from './AccessibilitySafetyLayer'
import BrandConsistencyLayer from './BrandConsistencyLayer'
import SettingsHubLayer from './SettingsHubLayer'
import SettingsLauncherLayer from './SettingsLauncherLayer'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <FirstRunExperience />
    <NavExperienceLayer />
    <MemoryComposer />
    <ComposerLauncherLayer />
    <CropPositionLayer />
    <MemoryDiscovery />
    <CompareModesLayer />
    <NotificationControlsLayer />
    <AccessibilitySafetyLayer />
    <BrandConsistencyLayer />
    <SettingsHubLayer />
    <SettingsLauncherLayer />
  </React.StrictMode>
)
