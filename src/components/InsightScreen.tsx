import type { CSSProperties, ReactNode } from "react"

import { cn } from "../lib/utils"
import "./ArrivalScreens.css"

export interface InsightScreenProps {
  title?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  status?: ReactNode
  continueLabel?: string
  onContinue?: () => void
  accent?: string
  className?: string
  titleClassName?: string
  bodyClassName?: string
  footerClassName?: string
}

export default function InsightScreen({
  title = "Where the music meets you now",
  children,
  footer,
  status = "Mapping the journey forward",
  continueLabel = "Show me my playlist",
  onContinue,
  accent = "var(--fill)",
  className,
  titleClassName,
  bodyClassName,
  footerClassName,
}: InsightScreenProps) {
  const footerContent =
    footer ??
    (onContinue ? (
      <button type="button" className="arr-cta" onClick={onContinue}>
        {continueLabel}
      </button>
    ) : status ? (
      <span className="arr-status arr-dots">{status}</span>
    ) : null)

  return (
    <div
      className={cn("arr-screen", className)}
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className="arr-screen__content">
        <div className="arr-insight__inner">
          <h2 className={cn("arr-insight__title", titleClassName)}>{title}</h2>
          {children ? (
            <p className={cn("arr-insight__body", bodyClassName)}>{children}</p>
          ) : null}
        </div>
      </div>

      {footerContent ? (
        <div className={cn("arr-foot", footerClassName)}>{footerContent}</div>
      ) : null}
    </div>
  )
}
