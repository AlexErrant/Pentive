import { createResource, Resource } from "solid-js"
import { db } from "../db"

function HomeData(): Resource<number> {
  const [age] = createResource(async () => await db.getAge(), {
    initialValue: 2,
  })
  return age
}

export default HomeData
