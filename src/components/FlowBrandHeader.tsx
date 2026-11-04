import { cn } from "../lib/utils"
import MunuLogo from "./MunuLogo"
import "./FlowBrandHeader.css"

export type FlowBrandHeaderProps = {
  className?: string
  /** Mark height in px. Default matches Welcome lockup. */
  size?: number
  wordmarkSize?: number
}

/** Persistent top-center MuNu lockup for post-welcome flows. */
export default function FlowBrandHeader({
  className,
  size = 64,
  wordmarkSize = 18,
}: FlowBrandHeaderProps) {
  return (
    <header className={cn("munu-flow-brand", className)} aria-label="MuNu">
      <MunuLogo size={size} withWordmark wordmarkSize={wordmarkSize} />
    </header>
  )
}
