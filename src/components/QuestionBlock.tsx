import { X } from "lucide-react"
import { useEffect, useRef, useState, type ChangeEvent } from "react"

import { cn } from "../lib/utils"
import { Badge } from "./ui/badge"
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import { Textarea } from "./ui/textarea"

type MultipleChoiceQuestion = {
  kind: "multiple-choice"
  options: string[]
  selectedValues: string[]
  onToggle: (value: string) => void
}

type SearchResultItem = {
  id: string
  label: string
  onSelect: () => void
}

type SelectedItem = {
  id: string
  label: string
  subtitle?: string
  imageUrl?: string
}

type SearchQuestion = {
  kind: "search"
  searchTerm: string
  onSearchTermChange: (value: string) => void
  placeholder: string
  results: SearchResultItem[]
  selectedItems?: SelectedItem[]
  onRemoveSelectedItem?: (id: string) => void
}

type TextareaQuestion = {
  kind: "textarea"
  value: string
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
}

type QuestionBlockProps = {
  prompt: string
  /** When true, multiple-choice, search (input + results + chip removal), and textarea are non-editable. */
  interactionLocked?: boolean
} & (MultipleChoiceQuestion | SearchQuestion | TextareaQuestion)

const SEARCH_PICKS_EMPTY_HINT = "Your picks will gather here."

function QuestionBlock(props: QuestionBlockProps) {
  const { prompt, interactionLocked } = props
  const locked = interactionLocked === true
  const [showRightContent, setShowRightContent] = useState(false)
  const selectedItemsScrollRef = useRef<HTMLDivElement | null>(null)
  const selectedSearchCount = props.kind === "search" ? (props.selectedItems?.length ?? 0) : 0

  useEffect(() => {
    setShowRightContent(false)
    const timer = window.setTimeout(() => {
      setShowRightContent(true)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [props.prompt, props.kind])

  useEffect(() => {
    if (props.kind !== "search" || selectedSearchCount === 0) return

    const container = selectedItemsScrollRef.current
    if (!container) return

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }, [props.kind, selectedSearchCount])

  const questionClassName =
    "m-0 w-full max-w-[12em] text-pretty font-serif text-[30px] font-medium leading-[1.34] tracking-[-0.008em] text-[var(--ink)]"

  if (props.kind === "search") {
    const visibleResults = locked ? [] : props.results

    return (
      <section className="grid min-h-0 flex-1 gap-8 text-left md:grid-cols-2 md:items-stretch md:gap-12">
        <div className="min-w-0 animate-in fade-in duration-700">
          <p className={questionClassName}>{prompt}</p>
          <div className="munu-search-wrap mt-6 max-w-[460px]">
            <Command shouldFilter={false} className="munu-search-picker">
              <CommandInput
                className="text-left"
                value={props.searchTerm}
                onValueChange={locked ? () => {} : props.onSearchTermChange}
                placeholder={props.placeholder}
                disabled={locked}
              />
              <CommandList
                className={cn(
                  "munu-search-dropdown",
                  visibleResults.length === 0 && "hidden",
                  locked && "pointer-events-none",
                )}
              >
                {visibleResults.map((result) => (
                  <CommandItem
                    key={result.id}
                    className="munu-search-opt"
                    onSelect={() => {
                      result.onSelect()
                      props.onSearchTermChange("")
                    }}
                  >
                    <span>{result.label}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </div>
        </div>

        <div
          className={cn(
            "munu-picks-column transition-all duration-500",
            showRightContent ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
          )}
        >
          {selectedSearchCount === 0 ? (
            <p className="munu-picks-empty">{SEARCH_PICKS_EMPTY_HINT}</p>
          ) : (
            <div
              ref={selectedItemsScrollRef}
              className="munu-picks-scroll overflow-y-auto pr-1"
            >
              <div className="munu-picks-list">
                {props.selectedItems?.map((item) => (
                  <div key={item.id} className="munu-pick-card animate-in fade-in duration-300">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.label}
                        className="munu-pick-card__media"
                      />
                    ) : (
                      <span className="munu-pick-card__media" aria-hidden />
                    )}
                    {props.onRemoveSelectedItem && !locked && (
                      <button
                        type="button"
                        className="munu-pick-card__remove"
                        aria-label={`Remove ${item.label}`}
                        onClick={() => props.onRemoveSelectedItem?.(item.id)}
                      >
                        <X strokeWidth={2.2} />
                      </button>
                    )}
                    <span className="munu-pick-card__label">
                      {item.label}
                      {item.subtitle ? (
                        <span className="munu-pick-card__subtitle">{item.subtitle}</span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    )
  }

  const isTextarea = props.kind === "textarea"

  return (
    <section
      className={cn(
        "grid gap-8 text-left",
        isTextarea
          ? "md:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] md:items-start md:gap-14"
          : "md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:items-center md:gap-16",
      )}
    >
      <div
        className={cn(
          "min-w-0 animate-in fade-in space-y-4 duration-700",
          isTextarea && "pt-1.5",
        )}
      >
        <p className={cn(questionClassName, "md:pr-4")}>{prompt}</p>
      </div>

      <div
        className={cn(
          "min-w-0 space-y-4 transition-all duration-500",
          showRightContent ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        {props.kind === "multiple-choice" && (
          <div
            className={cn(
              "flex flex-wrap justify-start gap-x-[15px] gap-y-[13px]",
              locked && "pointer-events-none",
            )}
            role="group"
            aria-label={prompt}
            aria-disabled={locked}
          >
            {props.options.map((option) => {
              const selected = props.selectedValues.includes(option)
              return (
                <Badge
                  key={option}
                  variant="outline"
                  aria-pressed={selected}
                  className={cn(
                    "munu-chip",
                    locked ? "cursor-default select-none" : "cursor-pointer",
                    locked && !selected && "opacity-45",
                  )}
                  onClick={locked ? undefined : () => props.onToggle(option)}
                >
                  {option}
                </Badge>
              )
            })}
          </div>
        )}

        {props.kind === "textarea" && (
          <Textarea
            className="munu-field w-full min-w-0"
            value={props.value}
            onChange={props.onChange}
            placeholder={props.placeholder}
            disabled={locked}
          />
        )}
      </div>
    </section>
  )
}

export default QuestionBlock
