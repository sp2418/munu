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

export type QuestionStageContentVariant = "centered" | "search-picker"

interface QuestionStageLayoutProps {
  currentQuestion: number
  totalQuestions: number
  onBack: () => void
  onNext: () => void
  /** Optional tertiary action (e.g. keep existing answer and continue). */
  onSkip?: () => void
  skipLabel?: string
  isBackDisabled?: boolean
  nextLabel?: string
  /** Shown in tiny text above the Next button when the parent blocks advancing (e.g. empty answer). */
  nextFooterHint?: string | null
  questionKey: string
  /** Search-picker stays top-pinned so the results dropdown has room; others center. */
  contentVariant?: QuestionStageContentVariant
  children: ReactNode
}

function QuestionStageLayout({
  currentQuestion,
  totalQuestions,
  onBack,
  onNext,
  onSkip,
  skipLabel = "Skip",
  isBackDisabled = false,
  nextLabel = "Next",
  nextFooterHint = null,
  questionKey,
  contentVariant = "centered",
  children,
}: QuestionStageLayoutProps) {
  const isSearchPicker = contentVariant === "search-picker"
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
    <div
      className={cn(
        "munu-question-stage relative flex h-full min-h-svh flex-col overflow-hidden font-serif text-[var(--ink)] antialiased",
        isSearchPicker && "munu-question-stage--search-picker",
      )}
    >
      <p className="munu-question-stage__progress absolute top-10 right-12 z-[2] m-0 whitespace-nowrap font-ui text-sm font-medium tracking-[0.01em] text-[var(--ink-faint)]">
        Question <b className="font-semibold text-[var(--accent-text)]">{currentQuestion}</b> of{" "}
        {totalQuestions}
      </p>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "munu-question-stage__body flex min-h-0 flex-1 flex-col px-6 sm:px-12 lg:px-16",
            isSearchPicker
              ? // Brand is absolutely overlaid on --fit onboarding; clear it at every width.
                "justify-start pt-[calc(var(--munu-flow-brand-height,6.6rem)+0.75rem)] pb-[calc(var(--munu-floor-cta-bottom,2.5rem)+5.5rem)]"
              : // Equal top/bottom padding so justify-center lands on the page midpoint.
                "justify-center py-[calc(var(--munu-floor-cta-bottom,2.5rem)+5.5rem)]",
          )}
        >
          <div
            className={cn(
              "mx-auto w-full max-w-6xl",
              isSearchPicker && "flex min-h-0 flex-1 flex-col",
            )}
          >
            <div
              key={questionKey}
              className={cn("w-full", isSearchPicker && "flex min-h-0 flex-1 flex-col")}
            >
              {children}
            </div>
          </div>
        </div>

        <div className="munu-floor-cta munu-question-stage__footer">
          <Button
            type="button"
            variant="outline"
            className="munu-btn-ghost"
            onClick={onBack}
            disabled={isBackDisabled}
          >
            Back
          </Button>
          <div className="flex min-w-0 flex-col items-end gap-1">
            {renderedHint !== null ? (
              <p
                aria-live="polite"
                className={cn(
                  "max-w-[15rem] text-pretty text-right font-ui text-[0.6875rem] leading-[1.4] text-[var(--ink-muted)] transition-opacity ease-out motion-reduce:transition-none sm:max-w-[17rem]",
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
            <div className="flex items-center gap-2">
              {onSkip ? (
                <Button
                  type="button"
                  variant="outline"
                  className="munu-btn-ghost"
                  onClick={onSkip}
                >
                  {skipLabel}
                </Button>
              ) : null}
              <Button type="button" className="munu-btn-primary" onClick={onNext}>
                {nextLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuestionStageLayout
