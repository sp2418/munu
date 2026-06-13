import type { CSSProperties, ReactNode } from "react"

import { cn } from "../lib/utils"
import "./StoryScreen.css"

export interface StoryScreenProps {
  image?: string
  imageAlt?: string
  imageSlot?: ReactNode
  placeholder?: string
  children: ReactNode
  backLabel?: string
  onBack?: () => void
  continueLabel?: string
  onContinue?: () => void
  showArrow?: boolean
  accent?: string
  className?: string
  contentClassName?: string
  footerClassName?: string
}

export default function StoryScreen({
  image,
  imageAlt = "",
  imageSlot,
  placeholder = "Illustration",
  children,
  backLabel = "Back",
  onBack,
  continueLabel = "Follow along",
  onContinue,
  showArrow = true,
  accent = "var(--fill)",
  className,
  contentClassName,
  footerClassName,
}: StoryScreenProps) {
  return (
    <div
      className={cn("story-screen", className)}
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className={cn("story-screen__content", contentClassName)}>
        <div className="story-screen__art">
          {imageSlot ? (
            imageSlot
          ) : image ? (
            <img className="story-screen__img" src={image} alt={imageAlt} />
          ) : (
            <span className="story-screen__placeholder">{placeholder}</span>
          )}
        </div>
        <p className="story-screen__body">{children}</p>
      </div>

      {onBack || onContinue ? (
        <div className={cn("story-screen__footer", footerClassName)}>
          {onBack ? (
            <button type="button" className="story-screen__back" onClick={onBack}>
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          {onContinue ? (
            <button type="button" className="story-screen__next" onClick={onContinue}>
              {continueLabel}
              {showArrow ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              ) : null}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
