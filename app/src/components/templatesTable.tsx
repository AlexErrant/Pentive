import {
  For,
  type JSX,
  type VoidComponent,
  createSignal,
  Show,
  type Setter,
} from "solid-js"
import AgGridSolid, { type AgGridSolidRef } from "ag-grid-solid"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-alpine.css"
import {
  type ICellRendererParams,
  type ColDef,
  type GetRowIdParams,
  type GridReadyEvent,
  type IGetRowsParams,
} from "ag-grid-community"
import { LicenseManager } from "ag-grid-enterprise"
import {
  type Template,
  type NookId,
  type RemoteTemplateId,
  type TemplateId,
  nookId,
  throwExp,
} from "shared"
import _ from "lodash"
import ResizingIframe from "./resizingIframe"
import "@github/relative-time-element"
import { db } from "../db"

LicenseManager.setLicenseKey(import.meta.env.VITE_AG_GRID_LICENSE)

let gridRef: AgGridSolidRef

function removeNook(
  templateId: TemplateId,
  nook: NookId,
  setRemotes: Setter<Array<[NookId, RemoteTemplateId | null]>>
) {
  return (
    <button
      type="button"
      onClick={async () => {
        await db.makeTemplateNotUploadable(templateId, nook)
        setRemotes((rs) => rs.filter(([n]) => n !== nook))
      }}
    >
      ❌
    </button>
  )
}

function remoteCell(template: Template): JSX.Element {
  const [getRemotes, setRemotes] = createSignal(Array.from(template.remotes))
  return (
    <>
      <ul>
        <For each={getRemotes()}>
          {([nookId, remoteTemplateId]) => (
            <li class="py-2 px-4">
              <Show when={remoteTemplateId != null} fallback={nookId}>
                <a
                  href={`${
                    import.meta.env.VITE_HUB_ORIGIN
                  }/t/${remoteTemplateId!}`}
                >
                  {nookId}
                </a>
              </Show>
              {removeNook(template.id, nookId, setRemotes)}
            </li>
          )}
        </For>
      </ul>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          const newNookId = nookId.parse(formData.get("newNookId"))
          if (
            getRemotes()
              .map(([n]) => n)
              .includes(newNookId)
          )
            throwExp("No dupes")
          await db.makeTemplateUploadable(template.id, newNookId)
          setRemotes((x) => [...x, [newNookId, null]])
        }}
      >
        <input
          name="newNookId"
          class="w-75px p-1 bg-white text-sm rounded-lg border"
          type="text"
        />
      </form>
    </>
  )
}

const columnDefs: Array<ColDef<Template>> = [
  {
    headerName: "Name",
    valueGetter: (row) => row.data?.name,
  },
  {
    headerName: "Type",
    valueGetter: (row) => _.startCase(row?.data?.templateType.tag),
  },
  {
    headerName: "Upload",
    cellRenderer: (props: ICellRendererParams<Template>) => (
      <Show when={props.data != null}>{remoteCell(props.data!)}</Show>
    ),
  },
  {
    headerName: "Fields",
    valueGetter: (row) => row.data?.fields.map((f) => f.name).join(", "),
  },
  {
    headerName: "Created",
    cellRenderer: (props: ICellRendererParams<Template>) => (
      <relative-time date={props.data?.created} />
    ),
  },
  {
    headerName: "Updated",
    cellRenderer: (props: ICellRendererParams<Template>) => (
      <relative-time date={props.data?.updated} />
    ),
  },
]

const getRowId = (params: GetRowIdParams<Template>): TemplateId =>
  params.data.id

const TemplatesTable: VoidComponent<{
  readonly templates: Template[]
  readonly onSelectionChanged: (templates: Template[]) => void
}> = (props) => {
  return (
    <div class="ag-theme-alpine" style={{ height: "500px" }}>
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
        rowModelType="infinite"
        onGridReady={onGridReady}
        cacheBlockSize={cacheBlockSize}
        onSelectionChanged={(event) => {
          const ncs = event.api.getSelectedRows() as Template[]
          props.onSelectionChanged(ncs)
        }}
      />
    </div>
  )
}

export default TemplatesTable

const cacheBlockSize = 100

const onGridReady = ({ api }: GridReadyEvent) => {
  api.setDatasource({
    getRows: (p: IGetRowsParams) => {
      db.getTemplatesInfinitely(p.startRow, cacheBlockSize)
        .then((x) => {
          p.successCallback(x.templates, x.count)
        })
        .catch(() => {
          p.failCallback()
        })
    },
  })
}
