import viviImage from "../assets/vivi.jpg"
import { useFollowAlongPersona } from "../context/FollowAlongPersonaContext"
import type { CurrEmotContext, MusicBaseline } from "../lib/reccobeatsEnrich"
import { isShowingViviWalkthroughOnResults } from "../lib/viviWalkthroughStorage"
import { cn } from "../lib/utils"
import { useMemo } from "react"
import { createPortal } from "react-dom"

type FollowAlongBannerProps = {
  /** Clears ViVi walkthrough + session and returns user to onboarding welcome. */
  onExitNavigation: () => void
}

export default function FollowAlongBanner({ onExitNavigation }: FollowAlongBannerProps) {
  const { walkthroughActive } = useFollowAlongPersona()

  const showBanner = useMemo(() => {
    let baseline: MusicBaseline | null = null
    let checkIn: CurrEmotContext | null = null
    try {
      const rawB = localStorage.getItem("musicBaseline")
      const rawC = localStorage.getItem("currEmotContext")
      if (rawB) baseline = JSON.parse(rawB) as MusicBaseline
      if (rawC) checkIn = JSON.parse(rawC) as CurrEmotContext
    } catch {
      /* ignore */
    }
    return isShowingViviWalkthroughOnResults(walkthroughActive, baseline, checkIn)
  }, [walkthroughActive])

  if (!showBanner) return null

  const handleExit = () => {
    onExitNavigation()
  }

  const pill = (
    <div
      className={cn(
        "pointer-events-none fixed right-3 top-3 z-[9999] flex justify-end sm:right-5 sm:top-5",
      )}
      role="status"
      aria-live="polite"
    >
      <div
        className={cn(
          "pointer-events-auto flex max-w-[min(calc(100vw-1.5rem),20rem)] items-center gap-2.5 rounded-full border px-3 py-2 shadow-lg backdrop-blur-md",
          "ring-1 ring-[var(--accent)]/10",
        )}
        style={{
          backgroundColor: "color-mix(in srgb, var(--code-bg) 82%, transparent)",
          borderColor: "color-mix(in srgb, var(--border) 60%, transparent)",
          boxShadow:
            "0 10px 28px color-mix(in srgb, var(--bg) 35%, rgb(0 0 0 / 0.12))",
        }}
      >
        <img
          src={viviImage}
          alt="ViVi"
          width={28}
          height={28}
          className="size-7 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]/50"
        />
        <span className="min-w-0 flex-1 text-left text-[0.8125rem] leading-snug text-[var(--text-h)] sm:text-sm">
          ViVi&apos;s walkthrough
        </span>
        <button
          type="button"
          onClick={handleExit}
          className={cn(
            "shrink-0 text-[0.75rem] font-medium text-[var(--text)] underline-offset-2 transition-colors",
            "hover:text-[var(--text-h)] hover:underline",
            "focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]",
          )}
        >
          Exit
        </button>
      </div>
    </div>
  )

  if (typeof document === "undefined" || !document.body) {
    return pill
  }

  return createPortal(pill, document.body)
}
