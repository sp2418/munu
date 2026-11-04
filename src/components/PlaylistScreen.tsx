import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import { Info } from "lucide-react"

import { cn } from "../lib/utils"
import "./ArrivalScreens.css"

export interface PlaylistScreenProps {
  title?: ReactNode
  onWhy?: () => void
  whyButtonId?: string
  whyPanelId?: string
  whyExpanded?: boolean
  /** Body content for the why-these-songs popover. */
  whyPanel?: ReactNode
  /** Optional action shown below the synced player (e.g. Open on YouTube). */
  secondaryAction?: ReactNode
  accent?: string
  className?: string
  contentClassName?: string
  titleClassName?: string
  whyClassName?: string
  actionsClassName?: string
  children?: ReactNode
}

type PopoverCoords = {
  top: number
  left: number
  width: number
  caretLeft: number
  placement: "below" | "above"
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

export default function PlaylistScreen({
  title = "Musical nutrients for the journey forward",
  onWhy,
  whyButtonId,
  whyPanelId,
  whyExpanded,
  whyPanel,
  secondaryAction,
  accent = "var(--fill)",
  className,
  contentClassName,
  titleClassName,
  whyClassName,
  actionsClassName,
  children,
}: PlaylistScreenProps) {
  const whyAnchorRef = useRef<HTMLDivElement>(null)
  const whyButtonRef = useRef<HTMLButtonElement>(null)
  const whyPopoverRef = useRef<HTMLDivElement>(null)
  const [popoverCoords, setPopoverCoords] = useState<PopoverCoords | null>(null)
  const [tipVisible, setTipVisible] = useState(false)
  const [tipCoords, setTipCoords] = useState<{ top: number; left: number } | null>(null)

  const updateTipPosition = () => {
    const btn = whyButtonRef.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    setTipCoords({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    })
  }

  useLayoutEffect(() => {
    if (!tipVisible || whyExpanded) {
      setTipCoords(null)
      return
    }
    updateTipPosition()
    window.addEventListener("resize", updateTipPosition)
    window.addEventListener("scroll", updateTipPosition, true)
    return () => {
      window.removeEventListener("resize", updateTipPosition)
      window.removeEventListener("scroll", updateTipPosition, true)
    }
  }, [tipVisible, whyExpanded])

  useEffect(() => {
    document.body.classList.toggle("munu-why-overlay-open", Boolean(whyExpanded || tipVisible))
    return () => document.body.classList.remove("munu-why-overlay-open")
  }, [whyExpanded, tipVisible])

  useLayoutEffect(() => {
    if (!whyExpanded) {
      setPopoverCoords(null)
      return
    }

    const update = () => {
      const btn = whyButtonRef.current
      const pop = whyPopoverRef.current
      if (!btn) return

      const gap = 12
      const margin = 12
      const rect = btn.getBoundingClientRect()
      const popWidth = Math.min(352, window.innerWidth - margin * 2)
      const popHeight = pop?.offsetHeight || 160

      const spaceBelow = window.innerHeight - margin - (rect.bottom + gap)
      const spaceAbove = rect.top - gap - margin
      const placement: "below" | "above" =
        spaceBelow >= Math.min(popHeight, 120) || spaceBelow >= spaceAbove ? "below" : "above"

      let top =
        placement === "below"
          ? rect.bottom + gap
          : Math.max(margin, rect.top - gap - popHeight)
      if (placement === "below" && top + popHeight > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - margin - popHeight)
      }

      let left = rect.left + rect.width / 2 - popWidth / 2
      left = clamp(left, margin, window.innerWidth - margin - popWidth)

      const caretLeft = clamp(rect.left + rect.width / 2 - left, 16, popWidth - 16)

      setPopoverCoords({ top, left, width: popWidth, caretLeft, placement })
    }

    update()
    const raf = window.requestAnimationFrame(update)
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [whyExpanded, whyPanel])

  useEffect(() => {
    if (!whyExpanded || !onWhy) return

    const onPointerDown = (event: MouseEvent | PointerEvent) => {
      const target = event.target as Node | null
      if (target && whyAnchorRef.current?.contains(target)) return
      if (target && whyPopoverRef.current?.contains(target)) return
      onWhy()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onWhy()
    }

    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [whyExpanded, onWhy])

  const whyTip =
    tipVisible && !whyExpanded && tipCoords && typeof document !== "undefined"
      ? createPortal(
          <div
            className="arr-player__why-tip"
            role="tooltip"
            style={{ top: tipCoords.top, left: tipCoords.left }}
          >
            Why these songs?
          </div>,
          document.body,
        )
      : null

  const whyPopover =
    whyExpanded && whyPanel && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={whyPopoverRef}
            id={whyPanelId}
            role="dialog"
            aria-labelledby={whyButtonId}
            className={cn(
              "arr-player__why-popover",
              popoverCoords?.placement === "above" && "arr-player__why-popover--above",
            )}
            style={
              popoverCoords
                ? {
                    top: popoverCoords.top,
                    left: popoverCoords.left,
                    width: popoverCoords.width,
                    ["--why-caret-left" as string]: `${popoverCoords.caretLeft}px`,
                  }
                : { visibility: "hidden" }
            }
          >
            <span className="arr-player__why-caret" aria-hidden />
            <div className="arr-player__why-popover-body">{whyPanel}</div>
          </div>,
          document.body,
        )
      : null

  return (
    <div
      className={cn("arr-screen arr-screen--playlist", className)}
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className={cn("arr-screen__content arr-player__content", contentClassName)}>
        <div className={cn("arr-player__heading", titleClassName)}>
          <h2 className="arr-player__title">{title}</h2>
          {onWhy ? (
            <div ref={whyAnchorRef} className={cn("arr-player__why-anchor", whyClassName)}>
              <button
                ref={whyButtonRef}
                type="button"
                id={whyButtonId}
                className="arr-player__why-info"
                aria-label="Why these songs?"
                aria-expanded={whyExpanded}
                aria-controls={whyPanelId}
                aria-haspopup="dialog"
                onMouseEnter={() => {
                  setTipVisible(true)
                  updateTipPosition()
                }}
                onMouseLeave={() => setTipVisible(false)}
                onFocus={() => {
                  setTipVisible(true)
                  updateTipPosition()
                }}
                onBlur={() => setTipVisible(false)}
                onClick={onWhy}
              >
                <Info aria-hidden size={18} strokeWidth={2} />
              </button>
              {whyTip}
              {whyPopover}
            </div>
          ) : null}
        </div>

        <div className="arr-player__body">
          {children}

          {secondaryAction ? (
            <div className={cn("arr-player__actions", actionsClassName)}>{secondaryAction}</div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
