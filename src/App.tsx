import { useState } from 'react'

import './App.css'
import Onboarding from './stages/Onboarding'
import CheckIn from './stages/Check-In'
import Results from './stages/Results'


interface App {
  currentView: "onboarding" | "checkin" | "results";
}

function App() {
  const storedBaseline = localStorage.getItem('musicBaseline')

  const storedEmotContext = localStorage.getItem('currEmotContext')

  const initView = () => {
    if (!storedBaseline) {
      return "onboarding"
    }
    if (!storedEmotContext) {
      return "checkin"
    }
    return "results"
  }
  
  const [currentView, setCurrentView] = useState<string>(initView)

  return (
    <div>
      {currentView === "onboarding" && <Onboarding setView={setCurrentView} />}
      {currentView === "checkin" && <CheckIn setView={setCurrentView} />}
      {currentView === "results" && <Results />}
    </div>
  );
}

export default App
