import { X } from "lucide-react"
import { useEffect, useRef, useState, type ChangeEvent } from "react"

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
} & (MultipleChoiceQuestion | SearchQuestion | TextareaQuestion)

function QuestionBlock(props: QuestionBlockProps) {
  const { prompt } = props
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

  return (
    <section className="grid gap-6 text-left md:grid-cols-2 md:items-start">
      <div className="animate-in fade-in duration-700 space-y-4">
        <p className="text-lg leading-tight md:pr-4">{prompt}</p>

        {props.kind === "search" && (
          <Command
            shouldFilter={false}
            className={`mt-2 bg-background p-0 text-left text-foreground transition-all duration-500 [&_[data-slot=command-input-wrapper]]:p-0 ${
              showRightContent ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
            }`}
          >
            <CommandInput
              className="text-left"
              value={props.searchTerm}
              onValueChange={props.onSearchTermChange}
              placeholder={props.placeholder}
            />
            <CommandList className="min-h-40">
              {props.results.map((result) => (
                <CommandItem
                  key={result.id}
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
        )}
      </div>

      <div
        className={`space-y-4 transition-all duration-500 ${
          showRightContent ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        {props.kind === "multiple-choice" && (
          <div className="flex flex-wrap gap-3">
            {props.options.map((option) => (
              <Badge
                key={option}
                variant={props.selectedValues.includes(option) ? "default" : "outline"}
                className="h-auto min-h-10 cursor-pointer rounded-xl px-4 py-2.5 text-sm leading-snug"
                onClick={() => props.onToggle(option)}
              >
                {option}
              </Badge>
            ))}
          </div>
        )}

        {props.kind === "search" && !!props.selectedItems?.length && (
          <div
            ref={selectedItemsScrollRef}
            className="max-h-96 overflow-y-hidden pr-1 hover:overflow-y-auto focus-within:overflow-y-auto"
          >
            <div className="flex flex-wrap gap-3">
            {props.selectedItems.map((item) => (
              item.imageUrl ? (
                <div
                  key={item.id}
                  className="group relative w-40 animate-in fade-in duration-300 overflow-hidden rounded-xl border border-border bg-card"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.label}
                    className="h-28 w-full object-cover transition-opacity duration-300 group-hover:opacity-40"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <p className="line-clamp-2 text-sm font-semibold text-black drop-shadow-sm">{item.label}</p>
                    {item.subtitle && (
                      <p className="line-clamp-2 text-xs text-black/90 drop-shadow-sm">{item.subtitle}</p>
                    )}
                  </div>
                  {props.onRemoveSelectedItem && (
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-background"
                      onClick={() => props.onRemoveSelectedItem?.(item.id)}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div
                  key={item.id}
                  className="group relative flex h-28 w-40 animate-in fade-in flex-col items-center justify-center gap-1 rounded-xl border border-border/60 bg-zinc-900 px-2 py-2 text-center duration-300 dark:bg-zinc-950"
                >
                  <p className="line-clamp-3 text-sm font-medium text-zinc-50">{item.label}</p>
                  {item.subtitle && (
                    <p className="line-clamp-2 text-xs text-zinc-300">{item.subtitle}</p>
                  )}
                  {props.onRemoveSelectedItem && (
                    <button
                      type="button"
                      className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-background"
                      onClick={() => props.onRemoveSelectedItem?.(item.id)}
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              )
            ))}
            </div>
          </div>
        )}

        {props.kind === "textarea" && (
          <Textarea
            value={props.value}
            onChange={props.onChange}
            placeholder={props.placeholder}
          />
        )}
      </div>
    </section>
  )
}

export default QuestionBlock
