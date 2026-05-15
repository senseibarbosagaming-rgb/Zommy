import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FirstRunExperience from './FirstRunExperience'
import NavExperienceLayer from './NavExperienceLayer'
import MemoryComposer from './MemoryComposer'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <FirstRunExperience />
    <NavExperienceLayer />
    <MemoryComposer />
  </React.StrictMode>
)
