import { createResource, createSignal, untrack } from "solid-js"
import { cwaClient } from "./trpcClient"

// lowTODO have hub send app a message when a successful login occurs
export const [getUserId] = createResource(
  async () => await cwaClient.getUser.query()
)

const currentTheme = () =>
  document.documentElement.className.includes("light")
    ? ("light" as const)
    : ("dark" as const)

export const [theme, setTheme] = createSignal<"light" | "dark">(currentTheme())

new MutationObserver((_: MutationRecord[]) => {
  const current = currentTheme()
  if (current !== untrack(theme)) {
    setTheme(current)
  }
}).observe(document.documentElement, {
  attributes: true,
})

export const agGridTheme = () =>
  theme() === "light" ? "ag-theme-alpine" : "ag-theme-alpine-dark"
