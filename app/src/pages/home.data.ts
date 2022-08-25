import { createResource, Resource } from "solid-js"
import { getDb } from "../../secure/rxdb/rxdb"

function HomeData(): Resource<number> {
  const [age] = createResource(
    async () => await getDb().then(async (db) => await db.heroes.getAge()),
    { initialValue: 2 }
  )
  return age
}

export default HomeData
