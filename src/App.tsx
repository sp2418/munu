import { useCallback, useEffect, useRef, useState } from 'react'
import { Analytics } from "@vercel/analytics/react"
import Onboarding from './stages/Onboarding'
import Results from './stages/Results'
import { clearCheckInRantKeepTracksInStorage } from './lib/currEmotContextStorage'
import {
  readInitialAppView,
  resetSessionForFreshStart,
  writeAppProgress,
  type AppView,
} from './lib/appProgressStorage'
import { clearOnboardingDraft } from './lib/onboardingDraftStorage'
import {
  CLAUDE_RESPONSE_CACHE_KEY,
  RESULTS_JOURNEY_CACHE_KEY,
} from './lib/resultsCache'
import { FollowAlongPersonaProvider, useFollowAlongPersona } from './context/FollowAlongPersonaContext'
import FollowAlongBanner from './components/FollowAlongBanner'
import ScreenTransitionHost from './components/ScreenTransitionHost'
import { prefetchSpotifyAccessToken } from './lib/spotifyToken'

function AppContent() {
  const followAlong = useFollowAlongPersona()

  const [currentView, setCurrentViewState] = useState<AppView>(() => readInitialAppView())

  const setCurrentView = useCallback((view: string) => {
    const next = view as AppView
    setCurrentViewState(next)
    writeAppProgress({ view: next })
  }, [])
  /** When true, onboarding mounts straight at genres (skips welcome + prep). */
  const [onboardingStartAtMusicProfile, setOnboardingStartAtMusicProfile] = useState(false)
  /** When true, onboarding mounts at the mind question (fresh check-in). */
  const [onboardingStartAtCheckIn, setOnboardingStartAtCheckIn] = useState(false)
  /** Remount onboarding after exiting ViVi follow-along so internal screen state resets. */
  const [onboardingMountKey, setOnboardingMountKey] = useState(0)
  const prevViewRef = useRef<string>(currentView)

  useEffect(() => {
    prefetchSpotifyAccessToken()
  }, [])

  useEffect(() => {
    const prev = prevViewRef.current
    prevViewRef.current = currentView
    if (prev === "onboarding" && currentView !== "onboarding") {
      setOnboardingStartAtMusicProfile(false)
      setOnboardingStartAtCheckIn(false)
    }
  }, [currentView])

  const exitFollowAlongToWelcome = useCallback(() => {
    followAlong.endViviWalkthrough()
    localStorage.removeItem('musicBaseline')
    localStorage.removeItem('currEmotContext')
    resetSessionForFreshStart()
    setOnboardingStartAtMusicProfile(false)
    setOnboardingStartAtCheckIn(false)
    setOnboardingMountKey((k) => k + 1)
    setCurrentView('onboarding')
  }, [followAlong, setCurrentView])

  const handleFreshCheckIn = () => {
    clearCheckInRantKeepTracksInStorage()
    clearOnboardingDraft()
    try {
      localStorage.removeItem(CLAUDE_RESPONSE_CACHE_KEY)
      localStorage.removeItem(RESULTS_JOURNEY_CACHE_KEY)
    } catch {
      /* ignore */
    }
    followAlong.endViviWalkthrough()
    setOnboardingStartAtMusicProfile(false)
    setOnboardingStartAtCheckIn(true)
    setOnboardingMountKey((k) => k + 1)
    setCurrentView("onboarding")
  }

  const renderCurrentView = () => {
    if (currentView === "onboarding") {
      return (
        <Onboarding
          key={onboardingMountKey}
          setView={setCurrentView}
          startAtMusicProfileQuestions={onboardingStartAtMusicProfile}
          startAtCheckInQuestions={onboardingStartAtCheckIn}
        />
      )
    }
    return (
      <Results
        onStartCheckInFresh={handleFreshCheckIn}
        onExitFollowAlongToWelcome={exitFollowAlongToWelcome}
      />
    )
  }

  /** Include mount key so remounting onboarding (exit walkthrough → welcome) crossfades. */
  const appScreenKey =
    currentView === "onboarding" ? `onboarding-${onboardingMountKey}` : currentView

  return (
    <div>
      <FollowAlongBanner onExitNavigation={exitFollowAlongToWelcome} />
      <Analytics />
      <ScreenTransitionHost screenKey={appScreenKey}>
        {renderCurrentView()}
      </ScreenTransitionHost>
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
