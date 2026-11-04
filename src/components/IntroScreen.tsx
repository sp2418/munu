import type { CSSProperties, ReactNode } from "react"

import { cn } from "../lib/utils"
import "./IntroScreen.css"

export interface IntroScreenProps {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  showDot?: boolean
  backLabel?: string
  onBack?: () => void
  continueLabel?: string
  onContinue?: () => void
  accent?: string
  children?: ReactNode
  className?: string
  contentClassName?: string
  titleClassName?: string
  subtitleClassName?: string
  footerClassName?: string
}

export default function IntroScreen({
  eyebrow,
  title,
  subtitle,
  showDot = true,
  backLabel = "Back",
  onBack,
  continueLabel = "Continue",
  onContinue,
  accent = "var(--fill)",
  children,
  className,
  contentClassName,
  titleClassName,
  subtitleClassName,
  footerClassName,
}: IntroScreenProps) {
  return (
    <div
      className={cn("intro-screen", className)}
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className={cn("intro-screen__content", contentClassName)}>
        {showDot ? <span className="intro-screen__dot" aria-hidden /> : null}
        {eyebrow ? <p className="intro-screen__eyebrow">{eyebrow}</p> : null}
        <h1 className={cn("intro-screen__title", titleClassName)}>{title}</h1>
        {subtitle ? (
          <p className={cn("intro-screen__sub", subtitleClassName)}>{subtitle}</p>
        ) : null}
        {children}
      </div>

      {onBack || onContinue ? (
        <div className={cn("intro-screen__footer munu-floor-cta", footerClassName)}>
          {onBack ? (
            <button type="button" className="intro-screen__back" onClick={onBack}>
              {backLabel}
            </button>
          ) : (
            <span />
          )}
          {onContinue ? (
            <button type="button" className="intro-screen__next" onClick={onContinue}>
              {continueLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
