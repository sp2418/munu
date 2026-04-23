import type { ReactNode } from "react"

import { Button } from "./ui/button"

interface QuestionStageLayoutProps {
  currentQuestion: number
  totalQuestions: number
  onBack: () => void
  onNext: () => void
  isBackDisabled?: boolean
  nextLabel?: string
  questionKey: string
  children: ReactNode
}

function QuestionStageLayout({
  currentQuestion,
  totalQuestions,
  onBack,
  onNext,
  isBackDisabled = false,
  nextLabel = "Next",
  questionKey,
  children,
}: QuestionStageLayoutProps) {
  return (
    <div className="flex min-h-svh items-center justify-center px-6 py-10">
      <div className="w-full max-w-3xl">
        <div className="min-h-[520px] space-y-4">
          <div className="flex justify-end">
            <p className="text-sm text-muted-foreground">
              Question {currentQuestion} of {totalQuestions}
            </p>
          </div>
          <div className="min-h-[420px] flex items-start pt-8">
            <div key={questionKey} className="w-full">
              {children}
            </div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={isBackDisabled}>
            Back
          </Button>
          <Button type="button" onClick={onNext}>
            {nextLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default QuestionStageLayout
