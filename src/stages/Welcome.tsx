import { cn } from "../lib/utils"
import "./Welcome.css"

export interface WelcomeProps {
  onGetStarted: () => void
  onSeeDemo: () => void
}

export default function Welcome({ onGetStarted, onSeeDemo }: WelcomeProps) {
  return (
    <main
      className={cn(
        "relative flex min-h-svh w-full items-center justify-center overflow-hidden",
        "px-6 py-12 text-center antialiased",
        "font-serif text-[var(--ink)]",
      )}
    >
      <div className="relative z-[1] flex w-full max-w-[560px] flex-col items-center">
        <div className="mb-[30px] flex items-center gap-[11px]">
          <div className="welcome-dot size-[30px] shrink-0 rounded-full" aria-hidden />
          <span className="font-ui text-base font-semibold text-[var(--ink)]">
            MuNu
          </span>
        </div>

        <p
          className={cn(
            "m-0 max-w-none font-serif",
            "text-[31px] font-medium leading-[1.48] tracking-[-0.005em] text-[var(--ink)]",
          )}
        >
          <span className="block whitespace-nowrap">Hi there. Welcome to Musical Nutrients,</span>
          <span className="block">an app that guides you through</span>
          <span className="block">your feelings with music that</span>
          <span className="block">
            <em className="font-serif font-medium italic text-[var(--accent-text)]">
              already feels like yours.
            </em>
          </span>
        </p>

        <p
          className={cn(
            "mt-[42px] m-0 max-w-[430px] text-pretty",
            "font-ui text-[17px] leading-[1.66] text-[var(--ink-muted)]",
          )}
        >
          We&rsquo;ll get to know your taste, ask how you&rsquo;re doing today, and build a
          playlist that helps you find your way through.
        </p>

        <button
          type="button"
          onClick={onGetStarted}
          className={cn(
            "mt-9 cursor-pointer whitespace-nowrap rounded-full border-0",
            "font-ui text-base font-semibold tracking-[0.01em]",
            "bg-[var(--fill)] px-10 py-[15px] text-[var(--on-fill)]",
            "shadow-[0_2px_6px_-2px_rgba(var(--fill-rgb),0.35),0_12px_28px_-12px_rgba(var(--fill-rgb),0.45)]",
            "transition-[transform,filter,box-shadow] duration-200 ease-out",
            "hover:-translate-y-0.5 hover:brightness-105 motion-reduce:hover:translate-y-0 motion-reduce:hover:brightness-100",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
            "focus-visible:outline-[rgba(var(--fill-rgb),0.55)]",
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
            className={cn(
              "cursor-pointer whitespace-nowrap rounded-full bg-transparent",
              "border-[1.5px] border-[rgba(var(--fill-rgb),0.28)]",
              "px-7 py-3 font-ui text-[15px] font-medium",
              "text-[var(--accent-text)]",
              "transition-[background-color,border-color] duration-200",
              "hover:border-[rgba(var(--fill-rgb),0.5)] hover:bg-[rgba(var(--fill-rgb),0.07)]",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              "focus-visible:outline-[rgba(var(--fill-rgb),0.55)]",
            )}
          >
            See it in action
          </button>
        </div>
      </div>
    </main>
  )
}
