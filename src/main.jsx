import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FirstRunExperience from './FirstRunExperience'
import NavExperienceLayer from './NavExperienceLayer'
import MemoryComposer from './MemoryComposer'
import CompareScreen from './CompareScreen'
import NotificationControlsLayer from './NotificationControlsLayer'
import AccessibilitySafetyLayer from './AccessibilitySafetyLayer'
import SettingsScreen from './SettingsScreen'
import PWAExperienceLayer from './PWAExperienceLayer'
import TodayDashboardLayer from './TodayDashboardLayer'
import TimelineScreen from './TimelineScreen'
import ChildProfileCreator from './ChildProfileCreator'
import ZommyIntro from './ZommyIntro'
import ThemeLayer from './ThemeLayer'
import ChapterScreen from './ChapterScreen'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeLayer />
    <App />
    <ZommyIntro />
    <TodayDashboardLayer />
    <TimelineScreen />
    <ChapterScreen />
    <CompareScreen />
    <SettingsScreen />
    <ChildProfileCreator />
    <FirstRunExperience />
    <NavExperienceLayer />
    <MemoryComposer />
    <NotificationControlsLayer />
    <AccessibilitySafetyLayer />
    <PWAExperienceLayer />
  </React.StrictMode>
)
