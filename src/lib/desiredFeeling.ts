import type { DesiredFeelingId } from "./reccobeatsEnrich"

export type DesiredFeelingOption = {
  id: DesiredFeelingId
  label: string
  subtitle: string
}

export const DESIRED_FEELING_PROMPT = "How do you want to feel after listening to your playlist?"

export const DESIRED_FEELING_OPTIONS: ReadonlyArray<DesiredFeelingOption> = [
  { id: "calm", label: "Calm", subtitle: "settle down, quiet the noise" },
  { id: "comforted", label: "Comforted", subtitle: "feel less alone in it" },
  { id: "ready-to-rest", label: "Ready to rest", subtitle: "wind down toward sleep" },
  { id: "reflective", label: "Reflective", subtitle: "sit with it and think" },
  { id: "lighthearted", label: "Lighthearted", subtitle: "stop taking it so seriously" },
  { id: "happy", label: "Happy", subtitle: "lift the mood" },
  { id: "energized", label: "Energized", subtitle: "wake up, get moving" },
  { id: "confident", label: "Confident", subtitle: "feel bolder" },
]
