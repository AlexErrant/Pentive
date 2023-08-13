import { type VoidComponent } from "solid-js"
import AgGridSolid, { type AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import { type ColDef, type GetRowIdParams } from "ag-grid-community"
import { LicenseManager } from "ag-grid-enterprise"
import "@github/relative-time-element"
import { type PeerJsId } from "shared"
import { type Peer } from "../pages/peers"

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

const columnDefs: Array<ColDef<Peer>> = [
  {
    headerName: "Id",
    valueGetter: (row) => row.data?.id,
  },
  {
    headerName: "Name",
    valueGetter: (row) => row.data?.name,
  },
]

const getRowId = (params: GetRowIdParams<Peer>): PeerJsId => params.data.id

const PeersTable: VoidComponent<{
  readonly peers: Peer[]
}> = (props) => {
  return (
    <div class="ag-theme-alpine">
      <AgGridSolid
        sideBar={{
          toolPanels: [
            {
              id: "columns",
              labelDefault: "Columns",
              labelKey: "columns",
              iconKey: "columns",
              toolPanel: "agColumnsToolPanel",
              toolPanelParams: {
                suppressRowGroups: true,
                suppressValues: true,
                suppressPivotMode: true,
              },
            },
          ],
        }}
        columnDefs={columnDefs}
        ref={gridRef}
        getRowId={getRowId}
        rowSelection="multiple"
        rowModelType="clientSide"
        rowData={props.peers}
        cacheBlockSize={cacheBlockSize}
        domLayout="autoHeight"
      />
    </div>
  )
}

export default PeersTable

const cacheBlockSize = 100
