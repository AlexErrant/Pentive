import { createResource, Resource } from "solid-js"
import { getAge } from "../../secure/rxdb/rxdb"

function HomeData(): Resource<number> {
  const [age] = createResource(getAge, { initialValue: 2 })
  return age
}

export default HomeData
