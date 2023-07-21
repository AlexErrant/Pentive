import "./index.css"
import { render } from "solid-js/web"
import { Router } from "@solidjs/router"
import App from "./app"
import { db } from "./db"
import * as Comlink from "comlink"
import { registerPluginServices } from "./pluginManager"
import {
  type CardId,
  type ChildTemplate,
  type MediaId,
  type NookId,
  type RemoteNote,
  type RemoteTemplate,
  throwExp,
  relativeChar,
  type Template,
  type Note,
  type Card,
} from "shared"
import { ulidAsBase64Url } from "./domain/utility"
import { getKysely } from "./sqlite/crsqlite"
import { type Transaction } from "kysely"
import { type DB } from "./sqlite/database"
import { noteOrds } from "shared-dom"

const plugins = await db.getPlugins()

export const C = await registerPluginServices(plugins)

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
)

export const appExpose = {
  addTemplate: async (rt: RemoteTemplate) => {
    const serializer = new XMLSerializer()
    const k = await getKysely()
    await k.transaction().execute(async (trx) => {
      const template: Template = {
        id: rt.id,
        name: rt.name,
        css: rt.css,
        created: new Date(),
        updated: new Date(),
        templateType: rt.templateType,
        fields: rt.fields.map((name) => ({ name })),
        remotes: new Map([
          [rt.nook, { remoteTemplateId: rt.id, uploadDate: new Date() }],
        ]),
      }
      const dp = new DOMParser()
      if (template.templateType.tag === "standard") {
        await Promise.all(
          template.templateType.templates.map(async (t) => {
            const { imgSrcs, front, back } = getTemplateImages(t, dp)
            t.front = serializer.serializeToString(front)
            t.back = serializer.serializeToString(back)
            return await downloadImages(imgSrcs, trx)
          })
        )
      } else {
        const { imgSrcs, front, back } = getTemplateImages(
          template.templateType.template,
          dp
        )
        await downloadImages(imgSrcs, trx)
        template.templateType.template.front =
          serializer.serializeToString(front)
        template.templateType.template.back = serializer.serializeToString(back)
      }
      await db.upsertTemplate(template, trx)
    })
  },
  addNote: async (rn: RemoteNote, nook: NookId) => {
    const k = await getKysely()
    await k.transaction().execute(async (trx) => {
      const template =
        (await db.getTemplateIdByRemoteId(rn.templateId, trx)) ??
        throwExp(`You don't have the remote template ${rn.templateId}`)
      const n: Note = {
        id: rn.id,
        templateId: template.id,
        // ankiNoteId: rn.ankiNoteId,
        created: rn.created,
        updated: rn.updated,
        tags: new Set(rn.tags),
        fieldValues: rn.fieldValues,
        remotes: new Map([[nook, rn.id]]),
      }
      await downloadImages(getNoteImages(n.fieldValues, new DOMParser()), trx)
      await db.upsertNote(n, trx)
      const ords = noteOrds.bind(C)(n, template)
      const cards = ords.map((i) => {
        const now = new Date()
        const card: Card = {
          id: ulidAsBase64Url() as CardId,
          ord: i,
          noteId: n.id,
          deckIds: new Set(),
          created: now,
          updated: now,
          due: now,
        }
        return card
      })
      await db.bulkUpsertCards(cards, trx)
    })
  },
}

// highTODO needs security on the origin
Comlink.expose(appExpose, Comlink.windowEndpoint(self.parent))

function getNoteImages(fieldValues: Map<string, string>, dp: DOMParser) {
  const imgSrcs = new Map<MediaId, string>()
  for (const [f, v] of fieldValues) {
    const doc = dp.parseFromString(v, "text/html")
    Array.from(doc.images).forEach((i) => {
      mutate(i, imgSrcs)
    })
    fieldValues.set(f, doc.body.innerHTML)
  }
  return imgSrcs
}

function mutate(img: HTMLImageElement, imgSrcs: Map<MediaId, string>) {
  const src = img.getAttribute("src")
  if (src == null || src === "") {
    // do nothing
  } else if (src.startsWith(relativeChar)) {
    const id = src.slice(1) as MediaId
    imgSrcs.set(id, import.meta.env.VITE_AUGC_URL + "i" + src)
    img.setAttribute("src", id)
  } else {
    // not sure that this branch should ever be hit
    const id = ulidAsBase64Url() as string as MediaId
    imgSrcs.set(id, img.src)
    img.setAttribute("src", id)
  }
}

function getTemplateImages(ct: ChildTemplate, dp: DOMParser) {
  const imgSrcs = new Map<MediaId, string>()
  const front = dp.parseFromString(ct.front, "text/html")
  const back = dp.parseFromString(ct.back, "text/html")
  Array.from(front.images).forEach((i) => {
    mutate(i, imgSrcs)
  })
  Array.from(back.images).forEach((i) => {
    mutate(i, imgSrcs)
  })
  return { imgSrcs, front, back }
}

// VERYlowTODO could sent it over Comlink - though that'll be annoying because it's in hub-ugc
async function downloadImages(
  imgSrcs: Map<MediaId, string>,
  trx: Transaction<DB>
) {
  return await Promise.all(
    Array.from(imgSrcs).map(async ([id, imgSrc]) => {
      const response = await fetch(imgSrc)
      if (response.status === 200) {
        const now = new Date()
        await db.insertMediaTrx(
          {
            id,
            created: now,
            updated: now,
            data: await response.arrayBuffer(),
          },
          trx
        )
      } else {
        console.error(response)
        throwExp(`Fetching ${imgSrc} got a status code of ${response.status}`)
      }
    })
  )
}
