import "./index.css"
import { render } from "solid-js/web"
import { Router } from "solid-app-router"
import App from "./app"
import { db } from "./db"
import * as Comlink from "comlink"
import { registerPluginServices } from "./pluginManager"
import {
  CardId,
  ChildTemplate,
  MediaId,
  NookId,
  Ord,
  RemoteNote,
  RemoteTemplate,
  throwExp,
  maxOrdNote,
} from "shared"
import { Template } from "./domain/template"
import { Media } from "./domain/media"
import { Note } from "./domain/note"
import { Card } from "./domain/card"
import { ulidAsBase64Url } from "./domain/utility"

const plugins = await db.getPlugins()

export const [C, registeredElements] = await registerPluginServices(plugins)

render(
  () => (
    <Router>
      <App />
    </Router>
  ),
  document.getElementById("root") as HTMLElement
)

export const appExpose = {
  hiFromApp: (msg: string) => {
    console.log("Hi from app! You said:", msg)
  },
  addTemplate: async (rt: RemoteTemplate) => {
    const template: Template = {
      id: rt.id,
      name: rt.name,
      css: rt.css,
      created: new Date(),
      updated: new Date(),
      templateType: rt.templateType,
      fields: rt.fields.map((name) => ({ name })),
      remotes: new Map([[rt.nook, rt.id]]),
    }
    const dp = new DOMParser()
    if (template.templateType.tag === "standard") {
      await Promise.all(
        template.templateType.templates.map(
          async (t) => await downloadImages(getTemplateImages(t, dp))
        )
      )
    } else {
      await downloadImages(
        getTemplateImages(template.templateType.template, dp)
      )
    }
    return await db.insertTemplate(template)
  },
  addNote: async (rn: RemoteNote, nook: NookId) => {
    const template =
      (await db.getTemplateIdByRemoteId(rn.templateId)) ??
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
    await downloadImages(
      getNoteImages(Array.from(rn.fieldValues.values()), new DOMParser())
    )
    await db.upsertNote(n)
    const maxOrd = maxOrdNote.bind(C)(
      Array.from(n.fieldValues.entries()),
      template
    )
    const cards = Array.from(Array(maxOrd + 1).keys()).map((i) => {
      const now = new Date()
      const card: Card = {
        id: ulidAsBase64Url() as CardId,
        ord: i as Ord,
        noteId: n.id,
        deckIds: new Set(),
        created: now,
        updated: now,
        due: now,
      }
      return card
    })
    await db.bulkUpsertCards(cards)
  },
}

// highTODO needs security on the origin
Comlink.expose(appExpose, Comlink.windowEndpoint(self.parent))

function getNoteImages(values: string[], dp: DOMParser) {
  return new Set(
    values.flatMap((v) =>
      Array.from(dp.parseFromString(v, "text/html").images).map((i) => i.src)
    )
  )
}

function getTemplateImages(ct: ChildTemplate, dp: DOMParser) {
  const imgSrcs = new Set<string>()
  for (const img of dp.parseFromString(ct.front, "text/html").images) {
    imgSrcs.add(img.src)
  }
  for (const img of dp.parseFromString(ct.back, "text/html").images) {
    imgSrcs.add(img.src)
  }
  return imgSrcs
}

// VERYlowTODO could sent it over Comlink - though that'll be annoying because it's in hub-ugc
async function downloadImages(imgSrcs: Set<string>) {
  imgSrcs.delete("") // remove images with no src
  const getId = (imgSrc: string) => /([^/]+$)/.exec(imgSrc)![0] as MediaId // everything after the last `/`
  return await Promise.all(
    Array.from(imgSrcs).map(async (imgSrc) => {
      const response = await fetch(imgSrc)
      const now = new Date()
      const media: Media = {
        id: getId(imgSrc),
        created: now,
        updated: now,
        data: await response.arrayBuffer(),
      }
      return await db.upsertMedia(media)
    })
  )
}
