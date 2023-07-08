import { type JSX, Show, createResource, createEffect, onMount } from "solid-js"
import { GoldenLayout } from "golden-layout"
import { createStore } from "solid-js/store"
import CardsTable from "../components/cardsTable"
import {
  type Override,
  type NoteCard,
  type Template,
  type Card,
  throwExp,
} from "shared"
import { CardsRemote } from "../components/cardsRemote"
import { FieldsEditor } from "../components/fieldsEditor"
import { CardsPreview } from "../components/cardsPreview"
import { db } from "../db"

import "golden-layout/dist/css/goldenlayout-base.css"
import "golden-layout/dist/css/themes/goldenlayout-light-theme.css"

export interface NoteCardView {
  template: Template
  note: Override<
    NoteCard["note"],
    { fieldValues: Array<readonly [string, string]> }
  >
  mainCard?: Card
  cards: Card[]
}

export function toNoteCards(noteCardView: NoteCardView): NoteCard[] {
  return noteCardView.cards.map((card) => ({
    template: noteCardView.template,
    note: {
      ...noteCardView.note,
      fieldValues: new Map(noteCardView.note.fieldValues),
    },
    card,
  }))
}

export function toMainNoteCards(noteCardView: NoteCardView): NoteCard {
  return {
    template: noteCardView.template,
    note: {
      ...noteCardView.note,
      fieldValues: new Map(noteCardView.note.fieldValues),
    },
    card: noteCardView.mainCard ?? throwExp("YA DONE GOOFED"),
  }
}

export default function Cards(): JSX.Element {
  const [selected, setSelected] = createStore<{ noteCard?: NoteCardView }>({})
  const [cards] = createResource(
    () => selected.noteCard?.note.id,
    db.getCardsByNote
  )
  createEffect(() => {
    if (cards() != null) setSelected("noteCard", "cards", cards()!)
  })
  let glRoot: HTMLDivElement
  onMount(() => {
    const goldenLayout = new GoldenLayout(glRoot)
    goldenLayout.resizeWithContainerAutomatically = true
    goldenLayout.registerComponentFactoryFunction("CardsTable", (container) => {
      const cardsTable = (
        <CardsTable
          onSelectionChanged={(ncs) => {
            if (ncs.length > 0) {
              const nc = ncs[0]
              const selected: NoteCardView = {
                ...nc,
                note: {
                  ...nc.note,
                  fieldValues: Array.from(nc.note.fieldValues.entries()),
                },
                mainCard: nc.card,
                cards: [],
              }
              setSelected("noteCard", selected)
            } else {
              setSelected("noteCard", undefined)
            }
          }}
        />
      ) as unknown as () => Node
      createEffect(() => {
        // lowTODO use import.meta.env.DEV
        const ct = cardsTable instanceof Function ? cardsTable() : cardsTable
        container.element.appendChild(ct)
      })
    })
    goldenLayout.registerComponentFactoryFunction("CardDetail", (container) => {
      const cardDetail = (
        <Show when={selected.noteCard != null} fallback={<span />}>
          <div class="overflow-auto h-full">
            <CardsRemote noteCard={selected.noteCard!} />
            <FieldsEditor
              noteCard={selected.noteCard!}
              setNoteCard={setSelected}
            />
            <CardsPreview noteCard={selected.noteCard!} />
          </div>
        </Show>
      ) as unknown as () => Node
      createEffect(() => {
        // lowTODO use import.meta.env.DEV
        const cd = cardDetail instanceof Function ? cardDetail() : cardDetail
        container.element.appendChild(cd)
      })
    })
    goldenLayout.registerComponentFactoryFunction(
      "Layout Manager",
      (container) => {
        const layoutManager = (
          <div>
            <button
              class="border"
              onClick={() => {
                goldenLayout.addComponent("CardDetail")
              }}
            >
              Add CardDetail
            </button>
          </div>
        ) as unknown as Node
        createEffect(() => {
          // lowTODO use import.meta.env.DEV
          const lm = (
            layoutManager instanceof Function ? layoutManager() : layoutManager
          ) as Node
          container.element.appendChild(lm)
        })
      }
    )
    goldenLayout.loadLayout({
      header: {
        popout: false,
        maximise: false, // disabling for now because using it causes the other panels to be at the bottom of the screen for some reason
      },
      root: {
        type: "row",
        content: [
          {
            type: "stack",
            content: [
              {
                type: "component",
                componentType: "CardsTable",
              },
              {
                type: "component",
                componentType: "Layout Manager",
              },
            ],
          },
          {
            type: "component",
            componentType: "CardDetail",
          },
        ],
      },
    })
  })
  return <div ref={(e) => (glRoot = e)} class="h-full" />
}
