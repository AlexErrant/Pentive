import { JSX, VoidComponent, createResource } from "solid-js"
import { Card, NoteCard } from "../domain/card"
import _ from "lodash"
import ResizingIframe from "./resizing-iframe"
import "@github/time-elements"
import AgGridSolid, { AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import {
  ColDef,
  GetRowIdParams,
  ICellRendererParams,
  RowNode,
} from "ag-grid-community"
import { throwExp } from "../domain/utility"
import { CardId, NoteId, TemplateId } from "../domain/ids"
import { db } from "../messenger"
import { Note } from "../domain/note"
import { Template } from "../domain/template"

let gridRef: AgGridSolidRef

const cardPreview = (p: ICellRendererParams<NoteCard>): JSX.Element => {
  if (p.data?.note == null || p.data.template == null) {
    return <span>Loading...</span>
  }
  return (
    <ResizingIframe
      i={{
        tag: "card",
        side: "front",
        templateId: p.data.template.id,
        noteId: p.data.note.id,
        cardId: p.data.card.id,
      }}
    ></ResizingIframe>
  )
}

const columnDefs: Array<ColDef<NoteCard>> = [
  { field: "card.id" },
  { field: "note.id" },
  { field: "preview", cellRenderer: cardPreview },
]

let cache: {
  templateDict: Record<TemplateId, Template>
  cardsByNoteId: Record<NoteId, Card[]>
} | null = { templateDict: {}, cardsByNoteId: {} }

async function fillGrid(): Promise<void> {
  if (cache === null)
    throwExp("Cache has been cleared - why is `fillGrid` rerunning?")
  const { templateDict, cardsByNoteId } = cache
  const templates = await db.getTemplates()
  for (const t of templates) {
    templateDict[t.id] = t
  }
  let cards: Card[] = []
  do {
    cards = await db.getCards(_.last(cards)?.id, 1000)
    const noteCards = cards.map((card) => {
      return { card }
    })
    gridRef.api.applyTransaction({ add: noteCards })
    for (const c of cards) {
      c.noteId in cardsByNoteId
        ? cardsByNoteId[c.noteId].push(c)
        : (cardsByNoteId[c.noteId] = [c])
    }
  } while (cards.length !== 0)
  let notes: Note[] = []
  do {
    notes = await db.getNotes(_.last(notes)?.id, 1000)
    const noteCards = getUpdatedNoteCards(notes, cardsByNoteId, templateDict)
    gridRef.api.applyTransaction({ update: noteCards })
  } while (notes.length !== 0)
  cache = null
}

function getUpdatedNoteCards(
  notes: Note[],
  cardsByNoteId: Record<NoteId, Card[]>,
  templateDict: Record<TemplateId, Template>
): NoteCard[] {
  const noteCards: NoteCard[] = []
  for (const note of notes) {
    const cards = cardsByNoteId[note.id]
    const template = templateDict[note.templateId]
    const updatedNoteCards = cards.map((card) => {
      return { note, card, template }
    })
    noteCards.push(...updatedNoteCards)
  }
  return noteCards
}

const defaultColDef: ColDef<NoteCard> = { sortable: true }

const getRowId = (params: GetRowIdParams<NoteCard>): CardId =>
  params.data.card.id

async function onBodyScrollEnd(): Promise<void> {
  if (cache !== null) {
    const { templateDict, cardsByNoteId } = cache
    const renderedNodes = gridRef.api.getRenderedNodes() as Array<
      RowNode<NoteCard>
    >
    const renderedCardIds = renderedNodes.map(
      (n) =>
        n.data?.card.noteId ??
        throwExp("Impossible - grid should be rendered and we don't group")
    )
    const notes = await db.getNotesByIds(renderedCardIds)
    const noteCards = getUpdatedNoteCards(notes, cardsByNoteId, templateDict)
    gridRef.api.applyTransaction({ update: noteCards })
    gridRef.api.redrawRows({ rowNodes: renderedNodes })
  }
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const CardsTable: VoidComponent = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [noteCards] = createResource(fillGrid)
  return (
    <div class="ag-grid-alpine" style="height: 500px">
      <AgGridSolid
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowHeight={() => 500}
        ref={gridRef}
        getRowId={getRowId}
        onBodyScrollEnd={onBodyScrollEnd}
      />
    </div>
  )
}

export default CardsTable
