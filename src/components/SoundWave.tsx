import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"

import { cn } from "../lib/utils"
import "./SoundWave.css"

const W = 1120
const H = 720
const STEP = 6

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

const LINES = [
  {
    offset: 0,
    op: 0.46,
    w: 2.2,
    comps: [
      { a: 30, f: 0.8, s: 0.00026, p: 0, bd: 0.28, bs: 0.00011, bp: 0 },
      { a: 14, f: 1.6, s: -0.0002, p: 1.0, bd: 0.3, bs: 0.00014, bp: 1.5 },
    ],
  },
  {
    offset: -18,
    op: 0.3,
    w: 1.7,
    comps: [
      { a: 23, f: 1.1, s: 0.00022, p: 2.0, bd: 0.3, bs: 0.00013, bp: 0.5 },
      { a: 11, f: 2.2, s: -0.00017, p: 0.5, bd: 0.3, bs: 0.00016, bp: 2 },
    ],
  },
  {
    offset: 20,
    op: 0.22,
    w: 1.5,
    comps: [
      { a: 20, f: 0.7, s: -0.00019, p: 1.2, bd: 0.3, bs: 0.00012, bp: 3 },
      { a: 10, f: 1.9, s: 0.00024, p: 2.4, bd: 0.3, bs: 0.00015, bp: 1 },
    ],
  },
  {
    offset: -36,
    op: 0.14,
    w: 1.3,
    comps: [
      { a: 16, f: 1.4, s: 0.00017, p: 0.8, bd: 0.3, bs: 0.0001, bp: 2.2 },
      { a: 7, f: 2.5, s: -0.00022, p: 1.7, bd: 0.3, bs: 0.00017, bp: 0.4 },
    ],
  },
] as const

type Line = (typeof LINES)[number]

function defaultCy(mode: "floor" | "center" | "band" = "floor", cyProp?: number): number {
  if (cyProp != null) return cyProp
  if (mode === "floor") return 648
  if (mode === "band") return 320
  return 360
}

function buildPath(line: Line, t: number, cy: number, amp: number) {
  let d = ""
  for (let x = -40; x <= W + 40; x += STEP) {
    let y = cy + line.offset
    for (const c of line.comps) {
      const a = c.a * amp * (1 + c.bd * Math.sin(c.bs * t + c.bp))
      y += a * Math.sin((c.f * 2 * Math.PI * x) / W + c.s * t + c.p)
    }
    d += (x === -40 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " "
  }
  return d
}

const SWELL_TAU = 640

function swellEnvelope(impulses: number[], now: number) {
  let e = 0
  for (const t0 of impulses) {
    const u = (now - t0) / SWELL_TAU
    if (u > 0) e += u * Math.exp(1 - u)
  }
  return Math.min(e, 1.7)
}

export interface SoundWaveHandle {
  excite: () => void
}

export interface SoundWaveProps {
  mode?: "floor" | "center" | "band"
  cy?: number
  getCy?: () => number
  color?: string
  amplitude?: number
  swell?: number
  swellOn?: "parent" | "document" | Element
  className?: string
}

const SoundWave = forwardRef<SoundWaveHandle, SoundWaveProps>(function SoundWave(
  {
    mode = "floor",
    cy: cyProp,
    getCy,
    color = "var(--wave-color, currentColor)",
    amplitude = 1,
    swell = 0,
    swellOn = "parent",
    className,
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null)
  const impulses = useRef<number[]>([])
  const baseCy = defaultCy(mode, cyProp)
  const getCyRef = useRef(getCy)
  getCyRef.current = getCy

  const excite = () => {
    impulses.current.push(performance.now())
    if (impulses.current.length > 14) impulses.current.shift()
  }
  useImperativeHandle(ref, () => ({ excite }), [])

  useEffect(() => {
    if (!swell || prefersReduced) return
    const host = svgRef.current?.closest(".sound-wave")
    const target =
      swellOn === "document"
        ? document
        : swellOn === "parent"
          ? host?.parentElement
          : swellOn
    if (!target) return
    const onClick = () => excite()
    const onInput = () => excite()
    target.addEventListener("click", onClick)
    target.addEventListener("input", onInput)
    return () => {
      target.removeEventListener("click", onClick)
      target.removeEventListener("input", onInput)
    }
  }, [swell, swellOn])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>("path[data-wave]"))
    const fill = svg.querySelector<SVGPathElement>("path[data-fill]")

    const frame = (t: number) => {
      const cy = getCyRef.current ? getCyRef.current() : baseCy
      const amp = amplitude * (1 + (swell || 0) * swellEnvelope(impulses.current, t))
      LINES.forEach((l, i) => {
        if (paths[i]) paths[i].setAttribute("d", buildPath(l, t, cy, amp))
      })
      if (fill) {
        fill.setAttribute(
          "d",
          buildPath(LINES[0], t, cy, amp) + `L ${W + 40} ${H + 40} L -40 ${H + 40} Z`,
        )
      }
    }

    if (prefersReduced) {
      frame(0)
      return
    }

    let raf = 0
    const loop = (t: number) => {
      frame(t)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [mode, cyProp, baseCy, amplitude, swell])

  return (
    <div
      className={cn("sound-wave", `sound-wave--${mode}`, className)}
      aria-hidden="true"
    >
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path data-fill fill={color} opacity={0.05} stroke="none" />
        {LINES.map((l, i) => (
          <path
            key={i}
            data-wave
            fill="none"
            stroke={color}
            strokeWidth={l.w}
            strokeLinecap="round"
            opacity={l.op}
          />
        ))}
      </svg>
    </div>
  )
})

export default SoundWave
