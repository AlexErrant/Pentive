import { JSX, VoidComponent, createResource } from "solid-js"
import { Card, NoteCard } from "../domain/card"
import _ from "lodash"
import ResizingIframe from "./resizing-iframe"
import "@github/time-elements"
import { C } from ".."
import AgGridSolid, { AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import { ColDef, GetRowIdParams, ICellRendererParams } from "ag-grid-community"
import { throwExp } from "../domain/utility"
import { CardId, NoteId, TemplateId } from "../domain/ids"
import { db } from "../messenger"
import { Note } from "../domain/note"
import { Template } from "../domain/template"

let gridRef: AgGridSolidRef

const cardPreview = (p: ICellRendererParams<NoteCard>): JSX.Element => {
  if (
    p.data === undefined ||
    p.data.note === undefined ||
    p.data.template === undefined
  ) {
    return <span>Loading...</span>
  }
  const { note, card, template } = p.data
  const { fields, values } = note
  const fv = _.zip(fields, values) as ReadonlyArray<readonly [string, string]>
  const { front, back } =
    template.templateType.tag === "standard"
      ? template.templateType.templates.find((t) => t.id === card.pointer) ??
        throwExp(`Invalid pointer ${card.pointer} for template ${template.id}`)
      : template.templateType.template

  const frontBack = C.html(fv, front, back, card.pointer, template.css)
  if (frontBack === null) {
    return <span>Card is invalid!</span>
  }
  return <ResizingIframe srcdoc={frontBack[0]}></ResizingIframe>
}

const columnDefs: Array<ColDef<NoteCard>> = [
  { field: "card.id" },
  { field: "note.id" },
  { field: "preview", cellRenderer: cardPreview },
]

async function fillGrid(): Promise<void> {
  const cardsByNoteId: Record<NoteId, Card[]> = {}
  const templateDict: Record<TemplateId, Template> = {}
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
    const noteCards: NoteCard[] = []
    for (const note of notes) {
      const cards = cardsByNoteId[note.id]
      const template = templateDict[note.templateId]
      const updatedNoteCards = cards.map((card) => {
        return { note, card, template }
      })
      noteCards.push(...updatedNoteCards)
    }
    gridRef.api.applyTransaction({ update: noteCards })
  } while (notes.length !== 0)
  gridRef.api.redrawRows()
}

const defaultColDef: ColDef<NoteCard> = { sortable: true }

const getRowId = (params: GetRowIdParams<NoteCard>): CardId =>
  params.data.card.id

// eslint-disable-next-line @typescript-eslint/naming-convention
const CardsTable: VoidComponent = () => {
  const [noteCards] = createResource(fillGrid)
  return (
    <div class="ag-grid-alpine" style="height: 500px">
      <AgGridSolid
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowHeight={() => 500}
        ref={gridRef}
        getRowId={getRowId}
      />
    </div>
  )
}

export default CardsTable
