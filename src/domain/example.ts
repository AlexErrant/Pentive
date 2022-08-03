import {
  CardSettingId,
  CardTemplateId,
  DeckId,
  ExampleId,
  SpecimenRevisionId,
  TemplateId,
  UserId,
} from "./ids"

type CardState = "Normal" | "SchedulerBuried" | "UserBuried" | "Suspended"
type Score = "Again" | "Hard" | "Good" | "Easy"

interface Review {
  score: Score
  created: Date
  intervalOrStepsIndex: IntervalOrStepsIndex
  easeFactor: number
  millisecondsFromSeeingQuestionToScore: number
}

type CardTemplatePointer =
  | {
      tag: "Normal"
      id: CardTemplateId
    }
  | {
      tag: "Cloze"
      index: number
    }

type IntervalOrStepsIndex =
  | {
      tag: "NewStepsIndex"
      index: number
    }
  | {
      tag: "LapsedStepsIndex"
      index: number
    }
  | {
      tag: "Interval"
      seconds: number
    }

interface Card {
  pointer: CardTemplatePointer
  cardSettingId: CardSettingId
  easeFactor: number
  intervalOrStepsIndex: IntervalOrStepsIndex // needs a better name
  due: Date
  isLapsed: boolean
  reviews: Review[]
  state: CardState
}

export interface Example {
  id: ExampleId
  authorId: UserId
  frontPersonalField: string
  backPersonalField: string
  deckIds: Set<DeckId>
  tags: Set<string>
  cards: Card[]
  specimenRevisionId: SpecimenRevisionId | null
  ankiNoteId: number | null
  title: string | null
  templateId: TemplateId
  fieldValues: Map<string, string>
  created: Date
  modified: Date
}
