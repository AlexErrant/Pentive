import { For, type VoidComponent, Suspense, createResource } from "solid-js"
import {
  type ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table"
import { type Plugin } from "shared-dom"
import "@github/relative-time-element"
import { db } from "../db"

function id(id: keyof Plugin): keyof Plugin {
  return id
}

const columns: Array<ColumnDef<Plugin>> = [
  {
    header: "Name",
    accessorKey: id("name"),
  },
  {
    header: "Version",
    accessorKey: id("version"),
  },
  {
    header: "Dependencies",
    accessorKey: id("dependencies"),
  },
  {
    header: "Created",
    accessorKey: id("created"),
    cell: (info) => {
      return <relative-time date={info.getValue<Date>()} />
    },
  },
  {
    header: "Updated",
    accessorKey: id("updated"),
    cell: (info) => {
      return <relative-time date={info.getValue<Date>()} />
    },
  },
]

const PluginsTable: VoidComponent = () => {
  const [plugins] = createResource(db.getPlugins, {
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
