import {
  CardSettingId,
  ChildTemplateId,
  ClozeIndex,
  DeckId,
  ExampleId,
  SpecimenRevisionId,
  TemplateId,
} from "./ids"

type State = "normal" | "scheduler buried" | "user buried" | "suspended"
type Score = "again" | "hard" | "good" | "easy"

interface Review {
  score: Score
  created: Date
  intervalOrStepsIndex: IntervalOrStepsIndex
  easeFactor: number
  millisecondsFromSeeingQuestionToScore: number
}

// needs a better name
type IntervalOrStepsIndex =
  | {
      tag: "new step"
      index: number
    }
  | {
      tag: "lapsed step"
      index: number
    }
  | {
      tag: "interval"
      seconds: number
    }

type Appearance =
  | {
      tag: "parent" | "solo" // `parent` means it has children; `solo` means it doesn't. Prevents unnecessary DB lookups.
      templateId: TemplateId
      fieldValues: Map<string, string>
    }
  | {
      tag: "child"
      parentId: ExampleId
      pointer: ChildTemplateId | ClozeIndex
    }

export interface Example {
  id: ExampleId
  deckIds: Set<DeckId>
  tags: Set<string>
  specimenRevisionId?: SpecimenRevisionId
  ankiNoteId?: number
  title?: string
  created: Date
  modified: Date
  appearance: Appearance
  cardSettingId?: CardSettingId
  due: Date
  lapsed?: boolean
  reviews: Review[]
  state?: State
}

export const sampleExample: Example = {
  id: "B598A95F-2372-45DE-B7A6-29CA67A10D8E" as ExampleId,
  deckIds: new Set(),
  tags: new Set(),
  created: new Date(),
  modified: new Date(),
  appearance: {
    tag: "solo",
    fieldValues: new Map(),
    templateId: "EC2EFBBE-C944-478A-BFC4-023968B38A72" as TemplateId,
  },
  due: new Date(),
  reviews: [],
}
