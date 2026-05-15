import { useState, useEffect, useRef } from 'react'
import { Analytics } from "@vercel/analytics/react"
import './App.css'
import Onboarding from './stages/Onboarding'
import CheckIn from './stages/Check-In'
import Results from './stages/Results'
import { clearCheckInRantAndEmotionsKeepTracksInStorage } from './lib/currEmotContextStorage'


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
  /** When true, onboarding mounts straight at the first music taste question (skips welcome + prep). */
  const [onboardingStartAtMusicProfile, setOnboardingStartAtMusicProfile] = useState(false)
  const prevViewRef = useRef<string>(currentView)

  useEffect(() => {
    const getSpotifyToken = async () => {
      const response = await fetch('/api/spotify-token')
      const data = await response.json()
      localStorage.setItem('spotifyToken', data.access_token)
    }

    getSpotifyToken()
  }, [])

  useEffect(() => {
    const prev = prevViewRef.current
    prevViewRef.current = currentView
    if (prev === "onboarding" && currentView !== "onboarding") {
      setOnboardingStartAtMusicProfile(false)
    }
  }, [currentView])

  const handleRebuildMusicProfile = () => {
    clearCheckInRantAndEmotionsKeepTracksInStorage()
    setOnboardingStartAtMusicProfile(true)
    setCurrentView("onboarding")
  }

  const handleFreshCheckIn = () => {
    clearCheckInRantAndEmotionsKeepTracksInStorage()
    setCurrentView("checkin")
  }

  return (
    <div>
      <Analytics />
      {currentView === "onboarding" && (
        <Onboarding
          setView={setCurrentView}
          startAtMusicProfileQuestions={onboardingStartAtMusicProfile}
        />
      )}
      {currentView === "checkin" && <CheckIn setView={setCurrentView} />}
      {currentView === "results" && (
        <Results
          onRebuildMusicProfile={handleRebuildMusicProfile}
          onStartCheckInFresh={handleFreshCheckIn}
        />
      )}
    </div>
  );
}

export default App
