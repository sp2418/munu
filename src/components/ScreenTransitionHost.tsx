import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type CSSProperties,
  type ReactNode,
} from "react"

import SoundWave, { type SoundWaveProps } from "./SoundWave"
import { cn } from "../lib/utils"
import {
  SCREEN_REDUCED_MOTION_MS,
  screenTransitionDurations,
} from "../lib/screenTransition"
import "./ScreenTransitionHost.css"

type ScreenPhase = "active" | "exiting"

interface ScreenLayer {
  id: string
  key: string
  content: ReactNode
  phase: ScreenPhase
  interactive: boolean
}

interface ScreenTransitionHostProps {
  screenKey: string
  children: ReactNode
  className?: string
  /** One shared wave behind all steps — does not remount on screen change. */
  wave?: SoundWaveProps | null
}

let layerIdCounter = 0

function nextLayerId(): string {
  layerIdCounter += 1
  return `screen-layer-${layerIdCounter}`
}

export default function ScreenTransitionHost({
  screenKey,
  children,
  className,
  wave = null,
}: ScreenTransitionHostProps) {
  const childrenRef = useRef(children)
  childrenRef.current = children

  const [layers, setLayers] = useState<ScreenLayer[]>(() => [
    {
      id: nextLayerId(),
      key: screenKey,
      content: children,
      phase: "active",
      interactive: false,
    },
  ])

  useEffect(() => {
    setLayers((prev) => {
      const active = prev.find((layer) => layer.phase === "active")
      if (active?.key === screenKey) {
        return prev
      }

      const exiting = prev.map((layer) =>
        layer.phase === "active"
          ? { ...layer, content: childrenRef.current, phase: "exiting" as const, interactive: false }
          : layer,
      )

      return [
        ...exiting,
        {
          id: nextLayerId(),
          key: screenKey,
          content: childrenRef.current,
          phase: "active",
          interactive: false,
        },
      ]
    })
  }, [screenKey])

  useEffect(() => {
    const pending = layers.filter(
      (layer) => layer.phase === "active" && !layer.interactive,
    )
    if (pending.length === 0) return

    const { enterMs } = screenTransitionDurations()
    const timer = window.setTimeout(() => {
      setLayers((prev) =>
        prev.map((layer) =>
          layer.phase === "active" && !layer.interactive
            ? { ...layer, interactive: true }
            : layer,
        ),
      )
    }, enterMs + 50)

    return () => window.clearTimeout(timer)
  }, [layers])

  useEffect(() => {
    const exiting = layers.filter((layer) => layer.phase === "exiting")
    if (exiting.length === 0) return

    const { exitMs } = screenTransitionDurations()
    const timer = window.setTimeout(() => {
      setLayers((prev) => prev.filter((layer) => layer.phase !== "exiting"))
    }, exitMs)

    return () => window.clearTimeout(timer)
  }, [layers])

  const markLayerInteractive = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, interactive: true } : layer,
      ),
    )
  }

  const handleEnterAnimationEnd = (
    layerId: string,
    event: AnimationEvent<HTMLDivElement>,
  ) => {
    if (event.animationName !== "screen-transition-enter") return
    markLayerInteractive(layerId)
  }

  const { enterMs, exitMs } = screenTransitionDurations()

  return (
    <div
      className={cn("screen-transition-host", className)}
      style={
        {
          "--screen-enter-ms": `${enterMs}ms`,
          "--screen-exit-ms": `${exitMs}ms`,
          "--screen-reduced-ms": `${SCREEN_REDUCED_MOTION_MS}ms`,
        } as CSSProperties
      }
    >
      {wave ? (
        <div className="screen-transition-host__wave" aria-hidden>
          <SoundWave {...wave} swellOn="document" />
        </div>
      ) : null}

      {layers.map((layer) => (
        <div
          key={layer.id}
          className={cn(
            "screen-transition-layer",
            layer.phase === "active" && "screen-transition-layer--active",
            layer.phase === "active" &&
              layer.interactive &&
              "screen-transition-layer--interactive",
            layer.phase === "exiting" && "screen-transition-layer--out",
          )}
          aria-hidden={layer.phase === "exiting" ? true : undefined}
          onAnimationEnd={(event) => handleEnterAnimationEnd(layer.id, event)}
        >
          {layer.phase === "active" ? children : layer.content}
        </div>
      ))}
    </div>
  )
}
