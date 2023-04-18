import { isServer } from "solid-js/web"

const story = (path: string): string =>
  `https://node-hnapi.herokuapp.com/${path}`
const user = (path: string): string =>
  `https://hacker-news.firebaseio.com/v0/${path}.json`

export default async function fetchAPI(path: string): Promise<unknown> {
  const url = path.startsWith("user") ? user(path) : story(path)
  const headers: Record<string, string> = isServer
    ? // eslint-disable-next-line @typescript-eslint/naming-convention
      { "User-Agent": "chrome" }
    : {}

  try {
    const response = await fetch(url, { headers })
    const text = await response.text()
    try {
      if (text === null) {
        return { error: "Not found" }
      }
      return JSON.parse(text) as unknown
    } catch (e) {
      console.error(`Received from API: ${text}`)
      console.error(e)
      return { error: e }
    }
  } catch (error) {
    return { error }
  }
}
