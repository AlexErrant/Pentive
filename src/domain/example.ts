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

export const sampleExample = {
  id: "B598A95F-2372-45DE-B7A6-29CA67A10D8E" as ExampleId,
  authorId: "FA12DB13-7DA3-4CA1-8C46-86379CC34232" as UserId,
  frontPersonalField: "",
  backPersonalField: "",
  deckIds: new Set(),
  tags: new Set(),
  cards: [
    {
      pointer: {
        tag: "Normal",
        id: "ED061BC3-B183-4C55-BE0D-0A820F491CE1" as CardTemplateId,
      },
      cardSettingId: "D85F630A-EAC4-41DD-B7AA-5F6DEF5FC4FA" as CardSettingId,
      easeFactor: 0,
      intervalOrStepsIndex: {
        tag: "NewStepsIndex",
        index: 0,
      },
      due: new Date(),
      isLapsed: false,
      reviews: [],
      state: "Normal",
    },
    {
      pointer: {
        tag: "Normal",
        id: "ED061BC3-B183-4C55-BE0D-0A820F491CE1" as CardTemplateId, // should be different from other card
      },
      cardSettingId: "D85F630A-EAC4-41DD-B7AA-5F6DEF5FC4FA" as CardSettingId,
      easeFactor: 0,
      intervalOrStepsIndex: {
        tag: "NewStepsIndex",
        index: 0,
      },
      due: new Date(),
      isLapsed: false,
      reviews: [],
      state: "Normal",
    },
  ],
  specimenRevisionId: null,
  ankiNoteId: null,
  title: null,
  templateId: "EC2EFBBE-C944-478A-BFC4-023968B38A72" as TemplateId,
  fieldValues: new Map(),
  created: new Date(),
  modified: new Date(),
}
