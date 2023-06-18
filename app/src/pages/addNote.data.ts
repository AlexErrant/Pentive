import { createResource } from "solid-js"
import { db } from "../db"

function AddNoteData() {
  const [templates] = createResource(db.getTemplates)
  return templates
}

export default AddNoteData
