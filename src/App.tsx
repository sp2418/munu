import { useCallback, useEffect, useRef, useState } from 'react'
import { Analytics } from "@vercel/analytics/react"
import './App.css'
import Onboarding from './stages/Onboarding'
import CheckIn from './stages/Check-In'
import Results from './stages/Results'
import { clearCheckInRantAndEmotionsKeepTracksInStorage } from './lib/currEmotContextStorage'
import {
  readInitialAppView,
  resetSessionForFreshStart,
  writeAppProgress,
  type AppView,
} from './lib/appProgressStorage'
import { clearCheckInDraft } from './lib/checkInDraftStorage'
import { FollowAlongPersonaProvider, useFollowAlongPersona } from './context/FollowAlongPersonaContext'
import FollowAlongBanner from './components/FollowAlongBanner'

function AppContent() {
  const followAlong = useFollowAlongPersona()

  const [currentView, setCurrentViewState] = useState<AppView>(() => readInitialAppView())

  const setCurrentView = useCallback((view: string) => {
    const next = view as AppView
    setCurrentViewState(next)
    writeAppProgress({ view: next })
  }, [])
  /** When true, onboarding mounts straight at the first music taste question (skips welcome + prep). */
  const [onboardingStartAtMusicProfile, setOnboardingStartAtMusicProfile] = useState(false)
  /** Remount onboarding after exiting ViVi follow-along so internal screen state resets. */
  const [onboardingMountKey, setOnboardingMountKey] = useState(0)
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

  const exitFollowAlongToWelcome = useCallback(() => {
    followAlong.endViviWalkthrough()
    localStorage.removeItem('musicBaseline')
    localStorage.removeItem('currEmotContext')
    resetSessionForFreshStart()
    setOnboardingStartAtMusicProfile(false)
    setOnboardingMountKey((k) => k + 1)
    setCurrentView('onboarding')
  }, [followAlong, setCurrentView])

  const handleRebuildMusicProfile = () => {
    clearCheckInRantAndEmotionsKeepTracksInStorage()
    setOnboardingStartAtMusicProfile(true)
    setCurrentView("onboarding")
  }

  const handleFreshCheckIn = () => {
    clearCheckInRantAndEmotionsKeepTracksInStorage()
    clearCheckInDraft()
    followAlong.endViviWalkthrough()
    setCurrentView("checkin")
  }

  return (
    <div>
      <FollowAlongBanner onExitNavigation={exitFollowAlongToWelcome} />
      <Analytics />
      {currentView === "onboarding" && (
        <Onboarding
          key={onboardingMountKey}
          setView={setCurrentView}
          startAtMusicProfileQuestions={onboardingStartAtMusicProfile}
        />
      )}
      {currentView === "checkin" && <CheckIn setView={setCurrentView} />}
      {currentView === "results" && (
        <Results
          onRebuildMusicProfile={handleRebuildMusicProfile}
          onStartCheckInFresh={handleFreshCheckIn}
          onExitFollowAlongToWelcome={exitFollowAlongToWelcome}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <FollowAlongPersonaProvider>
      <AppContent />
    </FollowAlongPersonaProvider>
  )
}
