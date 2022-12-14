import { For, VoidComponent, Suspense, createResource } from "solid-js"
import {
  ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table"
import { Plugin } from "../domain/plugin"
import "@github/time-elements"

function id(id: keyof Plugin): keyof Plugin {
  return id
}

const columns: Array<ColumnDef<Plugin>> = [
  {
    header: "Name",
    accessorKey: id("name"),
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
]

// eslint-disable-next-line @typescript-eslint/naming-convention
const PluginsTable: VoidComponent<{
  readonly getPlugins: () => Promise<Plugin[]>
}> = (props) => {
  const [plugins] = createResource(async () => await props.getPlugins(), {
    initialValue: [],
  })
  const table = createSolidTable({
    get data() {
      return plugins()
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

export default PluginsTable
