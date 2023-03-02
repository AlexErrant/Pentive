import {
  For,
  JSX,
  VoidComponent,
  Suspense,
  createResource,
  createSignal,
  Show,
} from "solid-js"
import {
  ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table"
import { Template } from "../domain/template"
import _ from "lodash"
import ResizingIframe from "./resizing-iframe"
import "@github/time-elements"
import { NookId } from "shared"

function id(id: keyof Template): keyof Template {
  return id
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
                <a href={`https://pentive.com/t/${remoteTemplateId!}`}>
                  {nookId}
                </a>
              </Show>
            </li>
          )}
        </For>
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const formData = new FormData(e.target as HTMLFormElement)
          const newNookId = formData.get("newNookId") as NookId
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

const columns: Array<ColumnDef<Template>> = [
  {
    header: "Name",
    accessorKey: id("name"),
  },
  {
    header: "Type",
    accessorFn: (row) => _.startCase(row.templateType.tag),
  },
  {
    header: "Upload",
    cell: (info) => remoteCell(info.row.original),
  },
  {
    header: "Fields",
    accessorFn: (row) => row.fields.map((f) => f.name).join(", "),
  },
  {
    header: "Created",
    accessorKey: id("created"),
    cell: (info) => {
      return <time-ago attr:datetime={info.getValue<Date>()}></time-ago>
    },
  },
  {
    header: "Modified",
    accessorKey: id("modified"),
    cell: (info) => {
      return <time-ago attr:datetime={info.getValue<Date>()}></time-ago>
    },
  },
  {
    header: "Preview",
    cell: (info) => {
      return (
        // lowTODO: iterate over all templates... or not. If there are 10 it'll look ugly
        <ResizingIframe
          i={{
            tag: "template",
            side: "front",
            templateId: info.row.original.id,
            index: "0",
          }}
        ></ResizingIframe>
      )
    },
  },
]

// eslint-disable-next-line @typescript-eslint/naming-convention
const TemplatesTable: VoidComponent<{
  readonly getTemplates: () => Promise<Template[]>
}> = (props) => {
  const [templates] = createResource(async () => await props.getTemplates(), {
    initialValue: [],
  })
  const table = createSolidTable({
    get data() {
      return templates()
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  return (
    <Suspense fallback={<span>Loading...</span>}>
      <table>
        <thead>
          <For each={table.getHeaderGroups()}>
            {(headerGroup) => (
              <tr>
                <For each={headerGroup.headers}>
                  {(header) => (
                    <th>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  )}
                </For>
              </tr>
            )}
          </For>
        </thead>
        <tbody>
          <For each={table.getRowModel().rows}>
            {(row) => (
              <tr>
                <For each={row.getVisibleCells()}>
                  {(cell) => (
                    <td>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  )}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </Suspense>
  )
}

export default TemplatesTable
