import { VoidComponent } from "solid-js"
import { NoteCard } from "../domain/card"
import "@github/time-elements"
import AgGridSolid, { AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import {
  ColDef,
  GetRowIdParams,
  GridReadyEvent,
  IGetRowsParams,
} from "ag-grid-community"
import { CardId } from "../domain/ids"
import { db } from "../db"

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<NoteCard>> = [
  { field: "card.id" },
  { field: "note.id" },
]

const defaultColDef: ColDef<NoteCard> = { sortable: true }

const getRowId = (params: GetRowIdParams<NoteCard>): CardId =>
  params.data.card.id

// eslint-disable-next-line @typescript-eslint/naming-convention
const CardsTable: VoidComponent<{
  readonly onSelectionChanged: (noteCards: NoteCard[]) => void
}> = (props) => {
  return (
    <div class="ag-grid-alpine" style="height: 500px">
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
        .then((x) => p.successCallback(x.noteCards, x.count))
        .catch(() => p.failCallback())
    },
  })
}
