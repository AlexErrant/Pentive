import { type VoidComponent } from "solid-js"
import { type NoteCard } from "../domain/card"
import "@github/time-elements"
import AgGridSolid, { type AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import {
  type ColDef,
  type GetRowIdParams,
  type GridReadyEvent,
  type IGetRowsParams,
} from "ag-grid-community"
import { type CardId } from "shared"
import { db } from "../db"
import { assertNever } from "shared"

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<NoteCard>> = [
  { field: "card.id" },
  { field: "note.id" },
  {
    headerName: "Card",
    valueGetter: (x) => {
      if (x.data != null) {
        switch (x.data.template.templateType.tag) {
          case "standard":
            return x.data.template.templateType.templates.at(x.data.card.ord)
              ?.name
          case "cloze":
            return `Cloze ${x.data.card.ord}`
          default:
            return assertNever(x.data.template.templateType)
        }
      }
    },
  },
  {
    headerName: "Due",
    valueGetter: (x) => x.data?.card.due.toLocaleDateString(),
  },
  {
    headerName: "Tags",
    valueGetter: (x) => Array.from(x.data?.note.tags.keys() ?? []).join(", "),
  },
]

const defaultColDef: ColDef<NoteCard> = { sortable: true }

const getRowId = (params: GetRowIdParams<NoteCard>): CardId =>
  params.data.card.id

// eslint-disable-next-line @typescript-eslint/naming-convention
const CardsTable: VoidComponent<{
  readonly onSelectionChanged: (noteCards: NoteCard[]) => void
}> = (props) => {
  return (
    <div class="ag-theme-alpine" style="height: 500px">
      <AgGridSolid
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        ref={gridRef}
        getRowId={getRowId}
        rowSelection="multiple"
        rowModelType="infinite"
        onGridReady={onGridReady}
        cacheBlockSize={cacheBlockSize}
        onSelectionChanged={(event) => {
          const ncs = event.api.getSelectedRows() as NoteCard[]
          props.onSelectionChanged(ncs)
        }}
      />
    </div>
  )
}

export default CardsTable

const cacheBlockSize = 100

const onGridReady = ({ api }: GridReadyEvent) => {
  api.setDatasource({
    getRows: (p: IGetRowsParams) => {
      db.getCards(p.startRow, cacheBlockSize) // medTODO could just cache the Template and mutate the NoteCard obj to add it
        .then((x) => {
          p.successCallback(x.noteCards, x.count)
        })
        .catch(() => {
          p.failCallback()
        })
    },
  })
}
