import type { CSSProperties } from "react"

import "./MunuLogo.css"

export type MunuLogoProps = {
  /** Height of the mark in px (width scales with it). Default 32. */
  size?: number
  /** Slow 7s breath animation. Default true. */
  animated?: boolean
  /** Render “MuNu” beside the mark. Default false. */
  withWordmark?: boolean
  /** Wordmark font size in px. Defaults to ~70% of `size`. */
  wordmarkSize?: number
  className?: string
  style?: CSSProperties
}

/*
 * MunuLogo — the MuNu speaker mark with a breathing orb + colour wash.
 * Presentational only.
 *
 * Notes:
 *  - Gradient/pattern ids are prefixed by `uid` so several logos can sit on
 *    one page without clashing.
 *  - prefers-reduced-motion is respected (holds the mid-breath frame).
 */
let _n = 0

export default function MunuLogo({
  size = 32,
  animated = true,
  withWordmark = false,
  wordmarkSize,
  className = "",
  style,
}: MunuLogoProps) {
  const uid = ((_n = (_n + 1) % 1000), "ml" + _n)
  const id = (s: string) => `${uid}-${s}`
  const mark = (
    <svg
      className={"munu-logo" + (animated ? " is-animated" : "") + (className ? " " + className : "")}
      style={{ height: size, width: size, ...style }}
      viewBox="-20 -20 140 140"
      role="img"
      aria-label="MuNu"
    >
      <defs>
        <radialGradient id={id("aura")}>
          <stop offset="0" stopColor="#b891a8" stopOpacity=".9" />
          <stop offset=".4" stopColor="#c4a3b5" stopOpacity=".6" />
          <stop offset=".75" stopColor="#cbb3c2" stopOpacity=".25" />
          <stop offset="1" stopColor="#cbb3c2" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("glow")}>
          <stop offset="0" stopColor="#cbb3c2" stopOpacity=".75" />
          <stop offset=".6" stopColor="#cbb3c2" stopOpacity=".28" />
          <stop offset="1" stopColor="#cbb3c2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("cab")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f3ede2" />
          <stop offset=".5" stopColor="#fdfaf4" />
          <stop offset="1" stopColor="#ebe3d6" />
        </linearGradient>
        <radialGradient id={id("cone")} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#e0cfd6" />
          <stop offset=".55" stopColor="#cbb3c2" />
          <stop offset="1" stopColor="#a88c9c" />
        </radialGradient>
        <radialGradient id={id("cap")} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#bd9db0" />
          <stop offset=".45" stopColor="#8a6a7c" />
          <stop offset="1" stopColor="#5a4150" />
        </radialGradient>
        <radialGradient id={id("tw")} cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#977a8a" />
          <stop offset="1" stopColor="#553f4b" />
        </radialGradient>
        <linearGradient id={id("rim")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5a4f45" />
          <stop offset="1" stopColor="#2c2620" />
        </linearGradient>
        <pattern id={id("grill")} width="4" height="4" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r=".9" fill="#39322a" opacity=".35" />
        </pattern>
      </defs>

      {/* breath wash — behind everything */}
      <circle className="munu-logo__aura" cx="50" cy="56" r="70" fill={`url(#${id("aura")})`} />

      {/* cabinet */}
      <rect x="26" y="7" width="48" height="86" rx="9" fill="#2c2620" opacity=".12" transform="translate(1.5 2)" />
      <rect x="25" y="6" width="50" height="88" rx="10" fill={`url(#${id("cab")})`} stroke="#39322a" strokeWidth="3" />
      <rect x="28.5" y="9.5" width="43" height="81" rx="7.5" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="1" />
      <rect x="29" y="10" width="42" height="80" rx="7" fill={`url(#${id("grill")})`} />
      <circle cx="32.5" cy="13.5" r="1.1" fill="#39322a" opacity=".5" />
      <circle cx="67.5" cy="13.5" r="1.1" fill="#39322a" opacity=".5" />
      <circle cx="32.5" cy="86.5" r="1.1" fill="#39322a" opacity=".5" />
      <circle cx="67.5" cy="86.5" r="1.1" fill="#39322a" opacity=".5" />

      {/* tweeter */}
      <circle cx="50" cy="24" r="8" fill={`url(#${id("rim")})`} />
      <circle cx="50" cy="24" r="6.2" fill="#fdfaf4" opacity=".5" />
      <circle cx="50" cy="24" r="5" fill={`url(#${id("tw")})`} />
      <circle cx="48" cy="22" r="1.6" fill="#fff" opacity=".55" />

      {/* woofer */}
      <circle cx="50" cy="56" r="20.5" fill={`url(#${id("rim")})`} />
      <circle cx="50" cy="56" r="18.5" fill="#fdfaf4" opacity=".55" />
      <circle cx="50" cy="56" r="17" fill={`url(#${id("cone")})`} />
      <circle cx="50" cy="56" r="15.5" fill="none" stroke="#39322a" strokeOpacity=".22" strokeWidth=".7" />
      <circle cx="50" cy="56" r="13.5" fill="none" stroke="#39322a" strokeOpacity=".18" strokeWidth=".7" />
      <circle cx="50" cy="56" r="11.5" fill="none" stroke="#6b5478" strokeOpacity=".22" strokeWidth=".7" />
      <path
        d="M36 50a15 15 0 0 1 8-10"
        stroke="#fff"
        strokeOpacity=".5"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
      />

      {/* the breathing orb (dust cap) */}
      <circle className="munu-logo__glow" cx="50" cy="56" r="15" fill={`url(#${id("glow")})`} />
      <circle className="munu-logo__orb" cx="50" cy="56" r="8.5" fill={`url(#${id("cap")})`} />
      <ellipse className="munu-logo__orb" cx="47" cy="52.5" rx="3" ry="1.9" fill="#fff" opacity=".45" />

      {/* bass port + feet */}
      <rect x="41" y="81.5" width="18" height="5" rx="2.5" fill={`url(#${id("rim")})`} />
      <rect x="42.5" y="82.8" width="15" height="2.4" rx="1.2" fill="#111" opacity=".65" />
      <rect x="30" y="94" width="8" height="3" rx="1" fill="#39322a" />
      <rect x="62" y="94" width="8" height="3" rx="1" fill="#39322a" />
    </svg>
  )

  if (!withWordmark) return mark
  return (
    <span className="munu-lockup" style={{ fontSize: wordmarkSize ?? Math.round(size * 0.7) }}>
      {mark}
      <span className="munu-lockup__word">MuNu</span>
    </span>
  )
}
