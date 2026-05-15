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
import PWAExperienceLayer from './PWAExperienceLayer'
import TodayDashboardLayer from './TodayDashboardLayer'
import TimelineScreen from './TimelineScreen'
import ChildProfileCreator from './ChildProfileCreator'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <TodayDashboardLayer />
    <TimelineScreen />
    <CompareScreen />
    <SettingsScreen />
    <ChildProfileCreator />
    <FirstRunExperience />
    <NavExperienceLayer />
    <MemoryComposer />
    <CropPositionLayer />
    <MemoryDiscovery />
    <NotificationControlsLayer />
    <AccessibilitySafetyLayer />
    <BrandConsistencyLayer />
    <PWAExperienceLayer />
  </React.StrictMode>
)
