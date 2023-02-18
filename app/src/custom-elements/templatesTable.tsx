import { For, JSX, VoidComponent, Suspense, createResource } from "solid-js"
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

function id(id: keyof Template): keyof Template {
  return id
}

function remoteCell(template: Template): JSX.Element {
  const url = `https://pentive.com/t/${template.remoteId as string}`
  const content = template.push === true ? "☁" : "🔗"
  return <a href={url}>{content}</a>
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
