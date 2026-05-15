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
import HomeRitualScreen from './HomeRitualScreen'
import TimelineScreen from './TimelineScreen'
import ChildProfileCreator from './ChildProfileCreator'
import ZommyIntro from './ZommyIntro'
import ThemeLayer from './ThemeLayer'
import ChapterScreen from './ChapterScreen'
import ChaptersLibrary from './ChaptersLibrary'
import MemorySavedToast from './MemorySavedToast'
import FamilySharingScreen from './FamilySharingScreen'
import InviteAcceptanceLayer from './InviteAcceptanceLayer'
import FamilySharingEntryLayer from './FamilySharingEntryLayer'
import FamilyCircleHomeLayer from './FamilyCircleHomeLayer'
import BottomSafeAreaLayer from './BottomSafeAreaLayer'
import { AppShellProvider } from './AppShellContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeLayer />
    <BottomSafeAreaLayer />
    <AppShellProvider>
      <InviteAcceptanceLayer />
      <App />
      <ZommyIntro />
      <HomeRitualScreen />
      <FamilyCircleHomeLayer />
      <TimelineScreen />
      <ChaptersLibrary />
      <ChapterScreen />
      <CompareScreen />
      <SettingsScreen />
      <FamilySharingScreen />
      <FamilySharingEntryLayer />
      <ChildProfileCreator />
      <FirstRunExperience />
      <NavExperienceLayer />
      <MemoryComposer />
      <MemorySavedToast />
      <NotificationControlsLayer />
      <AccessibilitySafetyLayer />
      <PWAExperienceLayer />
    </AppShellProvider>
  </React.StrictMode>
)
