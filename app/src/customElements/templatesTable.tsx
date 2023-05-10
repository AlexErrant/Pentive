import {
  For,
  type JSX,
  type VoidComponent,
  Suspense,
  createSignal,
  Show,
  type Setter,
} from "solid-js"
import {
  type ColumnDef,
  createSolidTable,
  flexRender,
  getCoreRowModel,
} from "@tanstack/solid-table"
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
import "@github/time-elements"
import { db } from "../db"

function id(id: keyof Template): keyof Template {
  return id
}

function removeNook(
  templateId: TemplateId,
  nook: NookId,
  setRemotes: Setter<Array<[NookId, RemoteTemplateId | null]>>
) {
  return (
    <button
      type="button"
      onclick={async () => {
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
                <a href={`https://pentive.com/t/${remoteTemplateId!}`}>
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
    header: "Updated",
    accessorKey: id("updated"),
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

const TemplatesTable: VoidComponent<{
  readonly templates: Template[]
}> = (props) => {
  const table = createSolidTable({
    get data() {
      return props.templates
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
