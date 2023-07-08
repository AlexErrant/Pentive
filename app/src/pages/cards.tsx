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
import { render } from "solid-js/web"

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
      render(
        () => (
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
        ),
        container.element
      )
    })
    goldenLayout.registerComponentFactoryFunction("CardDetail", (container) => {
      render(
        () => (
          <Show when={selected.noteCard != null}>
            <div class="overflow-auto h-full">
              <CardsRemote noteCard={selected.noteCard!} />
              <FieldsEditor
                noteCard={selected.noteCard!}
                setNoteCard={setSelected}
              />
            </div>
          </Show>
        ),
        container.element
      )
    })
    goldenLayout.registerComponentFactoryFunction(
      "Layout Manager",
      (container) => {
        render(
          () => (
            <div>
              <button
                class="bg-green-600 hover:bg-green-700 text-white font-bold p-2 px-4 rounded m-2"
                onClick={() => {
                  goldenLayout.addComponent("CardsTable")
                }}
              >
                Add CardsTable
              </button>
              <button
                class="bg-green-600 hover:bg-green-700 text-white font-bold p-2 px-4 rounded m-2"
                onClick={() => {
                  goldenLayout.addComponent("CardDetail")
                }}
              >
                Add CardDetail
              </button>
              <button
                class="bg-green-600 hover:bg-green-700 text-white font-bold p-2 px-4 rounded m-2"
                onClick={() => {
                  goldenLayout.addComponent("Preview Card")
                }}
              >
                Add Preview Card
              </button>
            </div>
          ),
          container.element
        )
      }
    )
    goldenLayout.registerComponentFactoryFunction(
      "Preview Card",
      (container) => {
        render(
          () => (
            <Show when={selected.noteCard != null}>
              <CardsPreview noteCard={selected.noteCard!} />
            </Show>
          ),
          container.element
        )
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
            type: "stack",
            content: [
              {
                type: "component",
                componentType: "CardDetail",
              },
              {
                type: "component",
                componentType: "Preview Card",
              },
            ],
          },
        ],
      },
    })
  })
  return <div ref={(e) => (glRoot = e)} class="h-full" />
}
