import { cn } from "../lib/utils"
import MunuLogo from "../components/MunuLogo"

export interface WelcomeProps {
  onGetStarted: () => void
  onSeeDemo: () => void
  /** Content fading out before the wave descends to the floor. */
  exiting?: boolean
}

export default function Welcome({ onGetStarted, onSeeDemo, exiting = false }: WelcomeProps) {
  return (
    <main
      className={cn(
        "relative flex min-h-svh w-full items-center justify-center",
        "px-6 py-12 text-center antialiased",
        "font-serif text-[var(--ink)]",
      )}
    >
      <div
        className={cn(
          "relative z-[1] flex w-full max-w-[560px] flex-col items-center",
          "transition-opacity ease-in-out motion-reduce:transition-none",
          "motion-safe:duration-[900ms]",
          exiting ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={exiting || undefined}
      >
        <div className="mb-[30px]">
          <MunuLogo size={64} withWordmark wordmarkSize={18} />
        </div>

        <p
          className={cn(
            "m-0 max-w-none font-serif",
            "text-[26px] font-medium leading-[1.35] tracking-[-0.005em] text-balance text-[var(--ink)] sm:text-[31px] sm:leading-[1.48]",
          )}
        >
          <span className="block sm:whitespace-nowrap">Hi there. Welcome to Musical Nutrients.</span>
          {/* <span className="block">an app that guides you through</span>
          <span className="block">your feelings with music that</span>
          <span className="block">
            <em className="font-serif font-medium italic text-[var(--accent-text)]">
              already feels like yours.
            </em>
          </span> */}
        </p>

        <p
          className={cn(
            "m-0 mt-5 max-w-[430px] text-pretty sm:mt-0",
            "font-ui text-[17px] leading-[1.66] text-[var(--ink-muted)]",
          )}
        >
          We&rsquo;ll start with how you&rsquo;re feeling right now, learn a little about the
          music you love, and build a playlist that carries you toward where you want to be.
        </p>

        <button
          type="button"
          onClick={onGetStarted}
          disabled={exiting}
          className={cn(
            "mt-9 cursor-pointer whitespace-nowrap rounded-full border-0",
            "font-ui text-base font-semibold tracking-[0.01em]",
            "bg-[var(--fill)] px-10 py-[15px] text-[var(--on-fill)]",
            "shadow-[0_2px_6px_-2px_rgba(var(--fill-rgb),0.35),0_12px_28px_-12px_rgba(var(--fill-rgb),0.45)]",
            "transition-[transform,filter,box-shadow] duration-200 ease-out",
            "hover:-translate-y-0.5 hover:brightness-105 motion-reduce:hover:translate-y-0 motion-reduce:hover:brightness-100",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-[rgba(var(--fill-rgb),0.55)]",
            "disabled:cursor-default",
          )}
        >
          Get Started
        </button>

        <div className="mt-[42px] flex flex-col items-center gap-[14px]">
          <p
            className={cn(
              "m-0 max-w-[340px] text-balance",
              "font-serif text-base italic leading-[1.55] text-[var(--ink-faint)]",
            )}
          >
            Short on time, or just curious? See how MuNu guides someone from anxious to calm.
          </p>
          <button
            type="button"
            onClick={onSeeDemo}
            disabled={exiting}
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-full bg-transparent",
              "border-[1.5px] border-[rgba(var(--fill-rgb),0.28)]",
              "px-7 py-3 font-ui text-[15px] font-medium",
              "text-[var(--accent-text)]",
              "transition-[background-color,border-color] duration-200",
              "hover:border-[rgba(var(--fill-rgb),0.5)] hover:bg-[rgba(var(--fill-rgb),0.07)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[rgba(var(--fill-rgb),0.55)]",
              "disabled:cursor-default",
            )}
          >
            See it in action
          </button>
        </div>
      </div>
    </main>
  )
}
