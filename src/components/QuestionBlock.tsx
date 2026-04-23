import { X } from "lucide-react"
import { useEffect, useState, type ChangeEvent } from "react"

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

  useEffect(() => {
    setShowRightContent(false)
    const timer = window.setTimeout(() => {
      setShowRightContent(true)
    }, 700)

    return () => window.clearTimeout(timer)
  }, [props.prompt, props.kind])

  return (
    <section className="grid gap-6 text-left md:grid-cols-2 md:items-start">
      <div className="animate-in fade-in duration-700 space-y-4">
        <p className="text-lg leading-tight md:pr-4">{prompt}</p>

        {props.kind === "search" && (
          <Command
            shouldFilter={false}
            className={`mt-2 p-0 text-left transition-all duration-500 [&_[data-slot=command-input-wrapper]]:p-0 ${
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
                <CommandItem key={result.id} onSelect={result.onSelect}>
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
          <div className="flex flex-wrap gap-2">
            {props.options.map((option) => (
              <Badge
                key={option}
                variant={props.selectedValues.includes(option) ? "default" : "outline"}
                onClick={() => props.onToggle(option)}
              >
                {option}
              </Badge>
            ))}
          </div>
        )}

        {props.kind === "search" && !!props.selectedItems?.length && (
          <div className="flex flex-wrap gap-2">
            {props.selectedItems.map((item) => (
              <Badge key={item.id}>
                {item.label}
                {props.onRemoveSelectedItem && (
                  <X
                    className="cursor-pointer"
                    onClick={() => props.onRemoveSelectedItem?.(item.id)}
                  />
                )}
              </Badge>
            ))}
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
