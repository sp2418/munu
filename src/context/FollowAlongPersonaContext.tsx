import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import {
  endViviWalkthrough as clearViviWalkthroughStorage,
  isViviWalkthroughActive,
  startViviWalkthrough as applyViviWalkthroughStorage,
} from "../lib/viviWalkthroughStorage"

type FollowAlongPersonaContextValue = {
  walkthroughActive: boolean
  startViviWalkthrough: () => void
  endViviWalkthrough: () => void
}

const FollowAlongPersonaContext = createContext<FollowAlongPersonaContextValue | null>(null)

export function useFollowAlongPersona() {
  const ctx = useContext(FollowAlongPersonaContext)
  if (!ctx) throw new Error("useFollowAlongPersona must be used within FollowAlongPersonaProvider")
  return ctx
}

export function FollowAlongPersonaProvider({ children }: { children: ReactNode }) {
  const [walkthroughActive, setWalkthroughActive] = useState(() => isViviWalkthroughActive())

  useEffect(() => {
    const sync = () => setWalkthroughActive(isViviWalkthroughActive())
    sync()
    window.addEventListener("focus", sync)
    return () => window.removeEventListener("focus", sync)
  }, [])

  const startViviWalkthrough = useCallback(() => {
    applyViviWalkthroughStorage()
    setWalkthroughActive(true)
  }, [])

  const endViviWalkthrough = useCallback(() => {
    clearViviWalkthroughStorage()
    setWalkthroughActive(false)
  }, [])

  const value = useMemo(
    (): FollowAlongPersonaContextValue => ({
      walkthroughActive,
      startViviWalkthrough,
      endViviWalkthrough,
    }),
    [walkthroughActive, startViviWalkthrough, endViviWalkthrough],
  )

  return (
    <FollowAlongPersonaContext.Provider value={value}>{children}</FollowAlongPersonaContext.Provider>
  )
}
