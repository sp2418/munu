import type { CSSProperties, ReactNode } from "react"

import { cn } from "../lib/utils"
import "./ArrivalScreens.css"

export interface LoadingScreenProps {
  title?: ReactNode
  status?: ReactNode
  children?: ReactNode
  accent?: string
  className?: string
  contentClassName?: string
}

export default function LoadingScreen({
  title = (
    <>
      Thanks for sharing.
      <br />
      Hang tight while we put together something for you.
    </>
  ),
  status = "Listening to where you are",
  children,
  accent = "var(--fill)",
  className,
  contentClassName,
}: LoadingScreenProps) {
  return (
    <div
      className={cn("arr-screen arr-screen--load", className)}
      style={{ "--accent": accent } as CSSProperties}
    >
      <div className={cn("arr-screen__content arr-load__content", contentClassName)}>
        {children ?? (
          <>
            <p className="arr-load__title">{title}</p>
            {status ? <p className="arr-load__sub arr-dots">{status}</p> : null}
          </>
        )}
      </div>
    </div>
  )
}
