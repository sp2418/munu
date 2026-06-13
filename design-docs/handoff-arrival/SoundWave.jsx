import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

/*
 * SoundWave — a calm, continuously undulating "sound wave" ambient layer.
 * Drop-in replacement for a concentric-circles background.
 *
 * A few layered sine-driven lines (+ a faint fill under the front line)
 * that breathe slowly over time. rAF-driven; honors reduced-motion.
 *
 *   <div style={{ position: "relative" }}>           // a screen / section
 *     <SoundWave mode="floor" color="#8a5cf6" />     // sits behind content
 *     <YourContent />                                // give content z-index >= 1
 *   </div>
 *
 * Props:
 *   mode       "floor" (low horizon, default) | "center" (mid-screen, masked
 *              so it dissolves behind centered text and reads at the margins)
 *   color      any CSS color for the strokes (defaults to --wave-color, then
 *              currentColor). Opacity per line is applied separately.
 *   amplitude  motion multiplier (1 = default; try 0.7 calmer, 1.4 more present)
 *   swell      0 = off (default). > 0 makes the wave gently swell then settle
 *              on clicks / typing (e.g. 0.4). The swell is additive on top of
 *              `amplitude`. Honors reduced-motion (disabled).
 *   swellOn    where to listen for clicks/typing: "parent" (default, the
 *              container holding <SoundWave/>), "document", or an Element.
 *   className  extra classes for the wrapper
 *
 * Imperative trigger: pass a ref and call ref.current.excite() to swell the
 * wave from your own code (e.g. on a custom button press) regardless of swellOn.
 *
 * The internal coordinate space is a fixed 1120×720 viewBox stretched to fill
 * the parent (preserveAspectRatio="none"), so it adapts to any screen size.
 */

const W = 1120, H = 720, STEP = 6;

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// "Layered+" recipe: each line = sum of two slow sines whose amplitude itself
// breathes (bd/bs/bp). offset = vertical stagger; op = opacity; w = stroke width.
const LINES = [
  { offset: 0,   op: 0.46, w: 2.2, comps: [
    { a: 30, f: 0.8, s: 0.00026, p: 0,   bd: 0.28, bs: 0.00011, bp: 0 },
    { a: 14, f: 1.6, s: -0.00020, p: 1.0, bd: 0.30, bs: 0.00014, bp: 1.5 },
  ]},
  { offset: -18, op: 0.30, w: 1.7, comps: [
    { a: 23, f: 1.1, s: 0.00022, p: 2.0, bd: 0.30, bs: 0.00013, bp: 0.5 },
    { a: 11, f: 2.2, s: -0.00017, p: 0.5, bd: 0.30, bs: 0.00016, bp: 2 },
  ]},
  { offset: 20,  op: 0.22, w: 1.5, comps: [
    { a: 20, f: 0.7, s: -0.00019, p: 1.2, bd: 0.30, bs: 0.00012, bp: 3 },
    { a: 10, f: 1.9, s: 0.00024, p: 2.4, bd: 0.30, bs: 0.00015, bp: 1 },
  ]},
  { offset: -36, op: 0.14, w: 1.3, comps: [
    { a: 16, f: 1.4, s: 0.00017, p: 0.8, bd: 0.30, bs: 0.00010, bp: 2.2 },
    { a: 7,  f: 2.5, s: -0.00022, p: 1.7, bd: 0.30, bs: 0.00017, bp: 0.4 },
  ]},
];

function buildPath(line, t, cy, amp) {
  let d = "";
  for (let x = -40; x <= W + 40; x += STEP) {
    let y = cy + line.offset;
    for (const c of line.comps) {
      const a = c.a * amp * (1 + c.bd * Math.sin(c.bs * t + c.bp));
      y += a * Math.sin((c.f * 2 * Math.PI * x) / W + c.s * t + c.p);
    }
    d += (x === -40 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d;
}

// Each click/keystroke pushes a timestamp; this sums a smooth rise-and-settle
// envelope (alpha function: u·e^(1−u)) so the wave swells then eases back.
const SWELL_TAU = 640; // ms to peak per impulse
function swellEnvelope(impulses, now) {
  let e = 0;
  for (const t0 of impulses) {
    const u = (now - t0) / SWELL_TAU;
    if (u > 0) e += u * Math.exp(1 - u);
  }
  return Math.min(e, 1.7);
}

function SoundWave({
  mode = "floor",
  color = "var(--wave-color, currentColor)",
  amplitude = 1,
  swell = 0,
  swellOn = "parent",
  className = "",
}, ref) {
  const svgRef = useRef(null);
  const impulses = useRef([]);
  const cy = mode === "floor" ? 648 : 360;

  const excite = () => {
    impulses.current.push(performance.now());
    if (impulses.current.length > 14) impulses.current.shift();
  };
  useImperativeHandle(ref, () => ({ excite }), []);

  // Listen for clicks / typing and trigger a swell.
  useEffect(() => {
    if (!swell || prefersReduced) return;
    const host = svgRef.current && svgRef.current.closest(".sound-wave");
    const target =
      swellOn === "document" ? document
      : swellOn === "parent" ? (host && host.parentElement)
      : swellOn;
    if (!target) return;
    const onClick = () => excite();
    const onInput = () => excite();
    target.addEventListener("click", onClick);
    target.addEventListener("input", onInput);
    return () => {
      target.removeEventListener("click", onClick);
      target.removeEventListener("input", onInput);
    };
  }, [swell, swellOn]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const paths = Array.from(svg.querySelectorAll("path[data-wave]"));
    const fill = svg.querySelector("path[data-fill]");

    const frame = (t) => {
      const amp = amplitude * (1 + (swell || 0) * swellEnvelope(impulses.current, t));
      LINES.forEach((l, i) => paths[i] && paths[i].setAttribute("d", buildPath(l, t, cy, amp)));
      if (fill) {
        fill.setAttribute("d", buildPath(LINES[0], t, cy, amp) + `L ${W + 40} ${H + 40} L -40 ${H + 40} Z`);
      }
    };

    if (prefersReduced) { frame(0); return; }     // one static frame, no motion

    let raf;
    const loop = (t) => { frame(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode, cy, amplitude, swell]);

  return (
    <div className={`sound-wave sound-wave--${mode} ${className}`} aria-hidden="true">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <path data-fill fill={color} opacity={0.05} stroke="none" />
        {LINES.map((l, i) => (
          <path key={i} data-wave fill="none" stroke={color} strokeWidth={l.w} strokeLinecap="round" opacity={l.op} />
        ))}
      </svg>
    </div>
  );
}

export default forwardRef(SoundWave);
