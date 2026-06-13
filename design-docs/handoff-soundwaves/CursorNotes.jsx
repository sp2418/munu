import { useEffect, useRef } from "react";

/*
 * CursorNotes — a calm, steady trickle of musical notes that follow the cursor
 * while it's inside the parent element, drifting up and fading. OPTIONAL extra
 * on top of <SoundWave/>. rAF-driven; honors reduced-motion.
 *
 *   <div style={{ position: "relative" }}>
 *     <SoundWave mode="floor" color="#8a5cf6" />
 *     <CursorNotes color="#8a5cf6" />              // listens on its parent
 *     <YourContent />
 *   </div>
 *
 * Props:
 *   every   ms between emitted notes (default 300 — sparse & calm; lower = denser)
 *   color   any CSS color for the notes (defaults to --wave-color, currentColor)
 *
 * It attaches mousemove/mouseleave to its PARENT element, so wrap it in the
 * screen/section container you want responsive to the cursor.
 */

const GLYPHS = ["\u266a", "\u266b", "\u2669", "\u266c"]; // ♪ ♫ ♩ ♬

const prefersReduced =
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function CursorNotes({ every = 300, color = "var(--wave-color, currentColor)" }) {
  const layerRef = useRef(null);
  const st = useRef({ x: 0, y: 0, inside: false, last: 0, notes: [] });

  useEffect(() => {
    const layer = layerRef.current;
    const screen = layer && layer.parentElement;
    if (!layer || !screen || prefersReduced) return;

    const onMove = (e) => {
      const r = layer.getBoundingClientRect();
      // map screen px → layer-local px (handles any CSS scaling of the parent)
      const sx = r.width ? layer.offsetWidth / r.width : 1;
      const sy = r.height ? layer.offsetHeight / r.height : 1;
      const s = st.current;
      s.x = (e.clientX - r.left) * sx;
      s.y = (e.clientY - r.top) * sy;
      s.inside = true;
    };
    const onLeave = () => { st.current.inside = false; };
    screen.addEventListener("mousemove", onMove);
    screen.addEventListener("mouseleave", onLeave);

    let raf;
    const tick = (now) => {
      const s = st.current;
      if (s.inside && now - s.last > every && s.notes.length < 26) {
        s.last = now + Math.random() * 90;
        const el = document.createElement("span");
        el.className = "cursor-note";
        el.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        el.style.left = (s.x + (Math.random() * 2 - 1) * 12) + "px";
        el.style.top = (s.y + (Math.random() * 2 - 1) * 10) + "px";
        el.style.fontSize = (14 + Math.random() * 9).toFixed(0) + "px";
        layer.appendChild(el);
        s.notes.push({
          el, born: now, life: 2400 + Math.random() * 1000,
          dx: (Math.random() * 2 - 1) * 30, rot: (Math.random() * 2 - 1) * 22,
          peak: 0.34 + Math.random() * 0.18,
        });
      }
      for (let i = s.notes.length - 1; i >= 0; i--) {
        const n = s.notes[i];
        const p = (now - n.born) / n.life;
        if (p >= 1) { n.el.remove(); s.notes.splice(i, 1); continue; }
        const op = p < 0.2 ? (p / 0.2) * n.peak : n.peak * (1 - (p - 0.2) / 0.8);
        n.el.style.opacity = Math.max(0, op).toFixed(3);
        n.el.style.transform =
          `translate(-50%,-50%) translate(${(n.dx * p).toFixed(1)}px, ${(-74 * p).toFixed(1)}px) ` +
          `rotate(${(n.rot * p).toFixed(1)}deg) scale(${(0.6 + 0.4 * p).toFixed(2)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      screen.removeEventListener("mousemove", onMove);
      screen.removeEventListener("mouseleave", onLeave);
      st.current.notes.forEach((n) => n.el.remove());
      st.current.notes = [];
    };
  }, [every]);

  return <div className="cursor-notes-layer" ref={layerRef} style={{ color }} aria-hidden="true" />;
}
