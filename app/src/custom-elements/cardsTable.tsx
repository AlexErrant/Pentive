import { JSX, VoidComponent, Suspense, createResource } from "solid-js"
import { NoteCard } from "../domain/card"
import _ from "lodash"
import ResizingIframe from "./resizing-iframe"
import "@github/time-elements"
import { C } from ".."
import AgGridSolid, { AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import { ColDef, GetRowIdParams, ICellRendererParams } from "ag-grid-community"
import { throwExp } from "../domain/utility"
import { CardId } from "../domain/ids"
import { db } from "../messenger"

let gridRef: AgGridSolidRef

const cardPreview = (p: ICellRendererParams<NoteCard>): JSX.Element => {
  if (p.data === undefined) {
    return <span>Loading... I think? highTODO</span>
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
  { field: "id" },
  { field: "noteId" },
  { field: "preview", cellRenderer: cardPreview },
]

const defaultColDef: ColDef<NoteCard> = { sortable: true }

const getRowId = (params: GetRowIdParams<NoteCard>): CardId =>
  params.data.card.id

// eslint-disable-next-line @typescript-eslint/naming-convention
const CardsTable: VoidComponent = () => {
  const [noteCards] = createResource(async () => await db.getNoteCards(), {
    initialValue: [],
  })
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <div class="ag-grid-alpine" style="height: 500px">
        <AgGridSolid
          columnDefs={columnDefs}
          rowData={noteCards()}
          defaultColDef={defaultColDef}
          getRowHeight={() => 500}
          ref={gridRef}
          getRowId={getRowId}
        />
      </div>
    </Suspense>
  )
}

export default CardsTable
