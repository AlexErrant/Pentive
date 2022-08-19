import { createResource, Resource } from "solid-js"
import { Template } from "../domain/template"
import { getDb } from "../rxdb/rxdb"

async function getTemplates(): Promise<Template[]> {
  const db = await getDb()
  return await db.templates.getTemplates()
}

function TemplatesData(): Resource<Template[]> {
  const [templates] = createResource(getTemplates, { initialValue: [] })
  return templates
}

export default TemplatesData
