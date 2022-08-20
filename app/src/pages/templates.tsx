import { JSX, createEffect, Suspense, For } from "solid-js"
import { useRouteData } from "solid-app-router"
import TemplatesData from "./templates.data"
import {
  ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table"
import { Template } from "../domain/template"

function id(id: keyof Template): keyof Template {
  return id
}

function remoteCell(hasRemote: boolean): JSX.Element {
  return hasRemote ? "☁" : ""
}

const columns: Array<ColumnDef<Template>> = [
  {
    header: "Name",
    accessorKey: id("name"),
  },
  {
    header: "Type",
    accessorFn: (row) => row.templateType.tag,
  },
  {
    header: "Remote",
    accessorFn: (row) => row.sourceId != null,
    cell: (info) => remoteCell(info.getValue<boolean>()),
  },
  {
    header: "Fields",
    accessorFn: (row) => row.fields.map((f) => f.name).join(", "),
  },
  {
    header: "Created",
    accessorKey: id("created"),
  },
  {
    header: "Modified",
    accessorKey: id("modified"),
  },
]

export default function Templates(): JSX.Element {
  const templates = useRouteData<typeof TemplatesData>()

  createEffect(() => {
    console.log(templates())
  })

  const table = createSolidTable({
    get data() {
      return templates()
    },
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <section class="bg-pink-100 text-gray-700 p-8">
      <h1 class="text-2xl font-bold">Templates</h1>

      <p class="mt-4">A page all about this website.</p>

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
    </section>
  )
}
