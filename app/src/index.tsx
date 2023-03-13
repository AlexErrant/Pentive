import "./index.css"
import { render } from "solid-js/web"
import { Router } from "solid-app-router"
import App from "./app"
import { db } from "./db"
import * as Comlink from "comlink"

import { registerPluginServices } from "./pluginManager"
import { ChildTemplate, MediaId, RemoteTemplate } from "shared"
import { Template } from "./domain/template"
import { Media } from "./domain/media"

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
          async (t) => await downloadImages(t, dp)
        )
      )
    } else {
      await downloadImages(template.templateType.template, dp)
    }
    return await db.insertTemplate(template)
  },
}

// highTODO needs security
Comlink.expose(appExpose, Comlink.windowEndpoint(self.parent))

// VERYlowTODO could sent it over Comlink - though that'll be annoying because it's in hub-ugc
async function downloadImages(ct: ChildTemplate, dp: DOMParser) {
  const imgSrcs = new Set<string>()
  for (const img of dp.parseFromString(ct.front, "text/html").images) {
    imgSrcs.add(img.src)
  }
  for (const img of dp.parseFromString(ct.back, "text/html").images) {
    imgSrcs.add(img.src)
  }
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
