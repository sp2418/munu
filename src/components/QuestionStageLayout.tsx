import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { Button } from "./ui/button"
import { cn } from "../lib/utils"

/** Hint shown above Next when advancing is blocked for an unanswered question. */
export const QUESTION_REQUIRED_FOOTER_HINT =
  "Please answer this question to\u00a0continue."

/** Clear validation hint above Next after this delay (milliseconds). */
export const QUESTION_HINT_AUTO_HIDE_MS = 5000

/** Fade duration when the hint appears or disappears (milliseconds). */
export const QUESTION_HINT_FADE_MS = 700

interface QuestionStageLayoutProps {
  currentQuestion: number
  totalQuestions: number
  onBack: () => void
  onNext: () => void
  isBackDisabled?: boolean
  nextLabel?: string
  /** Shown in tiny text above the Next button when the parent blocks advancing (e.g. empty answer). */
  nextFooterHint?: string | null
  questionKey: string
  children: ReactNode
}

function QuestionStageLayout({
  currentQuestion,
  totalQuestions,
  onBack,
  onNext,
  isBackDisabled = false,
  nextLabel = "Next",
  nextFooterHint = null,
  questionKey,
  children,
}: QuestionStageLayoutProps) {
  const [renderedHint, setRenderedHint] = useState<string | null>(null)
  const [hintOpaque, setHintOpaque] = useState(false)
  const renderedHintRef = useRef(renderedHint)
  renderedHintRef.current = renderedHint
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false
    let outerRaf = 0
    let innerRaf = 0

    const clearHideTimer = () => {
      if (hideTimeoutRef.current !== null) {
        window.clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
    }

    clearHideTimer()

    if (nextFooterHint) {
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      setRenderedHint(nextFooterHint)

      if (reduced) {
        queueMicrotask(() => {
          if (!cancelled) setHintOpaque(true)
        })
      } else {
        setHintOpaque(false)
        outerRaf = window.requestAnimationFrame(() => {
          innerRaf = window.requestAnimationFrame(() => {
            if (!cancelled) setHintOpaque(true)
          })
        })
      }

      return () => {
        cancelled = true
        clearHideTimer()
        window.cancelAnimationFrame(outerRaf)
        window.cancelAnimationFrame(innerRaf)
      }
    }

    if (renderedHintRef.current === null) {
      setHintOpaque(false)
      return undefined
    }

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const fadeMs = reduced ? 0 : QUESTION_HINT_FADE_MS

    setHintOpaque(false)

    if (fadeMs === 0) {
      setRenderedHint(null)
      return undefined
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      hideTimeoutRef.current = null
      setRenderedHint(null)
    }, fadeMs)

    return () => {
      cancelled = true
      clearHideTimer()
      window.cancelAnimationFrame(outerRaf)
      window.cancelAnimationFrame(innerRaf)
    }
  }, [nextFooterHint])

  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="min-h-[520px] space-y-4">
          <div className="flex justify-end">
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion} of {totalQuestions}
            </p>
          </div>
          <div className="min-h-[420px] flex items-start pt-8">
            <div key={questionKey} className="w-full">
              {children}
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <Button type="button" variant="outline" onClick={onBack} disabled={isBackDisabled}>
            Back
          </Button>
          <div className="flex min-w-0 flex-col items-end gap-1">
            {renderedHint !== null ? (
              <p
                aria-live="polite"
                className={cn(
                  "max-w-[15rem] text-pretty text-right text-[0.6875rem] leading-[1.4] text-muted-foreground transition-opacity ease-out motion-reduce:transition-none sm:max-w-[17rem]",
                  hintOpaque ? "opacity-100" : "opacity-0",
                )}
                style={{
                  transitionDuration:
                    typeof window !== "undefined" &&
                    window.matchMedia("(prefers-reduced-motion: reduce)").matches
                      ? "0ms"
                      : `${QUESTION_HINT_FADE_MS}ms`,
                }}
              >
                {renderedHint}
              </p>
            ) : null}
            <Button type="button" onClick={onNext}>
              {nextLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestionStageLayout
