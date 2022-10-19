import * as Comlink from "comlink"
import { NoteCard } from "../src/domain/card"
import { TemplateId, NoteId } from "../src/domain/ids"
import { Note } from "../src/domain/note"
import { Template } from "../src/domain/template"
import { cardCollectionMethods } from "./rxdb/card.orm"
import { heroCollectionMethods } from "./rxdb/hero.orm"
import { noteCollectionMethods } from "./rxdb/note.orm"
import { pluginCollectionMethods } from "./rxdb/plugin.orm"
import { remove, sync } from "./rxdb/rxdb"
import { templateCollectionMethods } from "./rxdb/template.orm"

async function getNoteCards(): Promise<NoteCard[]> {
  const [templates, notes, cards] = await Promise.all([
    templateCollectionMethods.getTemplates(),
    noteCollectionMethods.getNotes(),
    cardCollectionMethods.getCards(),
  ])
  const templatesDict: Record<TemplateId, Template> = {}
  templates.forEach((t) => (templatesDict[t.id] = t))
  const notesDict: Record<NoteId, Note> = {}
  notes.forEach((n) => (notesDict[n.id] = n))
  return cards.map((card) => {
    const note = notesDict[card.noteId]
    const template = templatesDict[note.templateId]
    return { card, note, template }
  })
}

export const exposed = {
  ...templateCollectionMethods,
  ...cardCollectionMethods,
  ...noteCollectionMethods,
  ...heroCollectionMethods,
  ...pluginCollectionMethods,
  getNoteCards,
  remove,
  sync,
}

const targetOrigin = "*" // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582
Comlink.expose(exposed, Comlink.windowEndpoint(self.parent, self, targetOrigin))
