import { ResourceId } from "./ids"

// https://stackoverflow.com/a/47140708
export function strip(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  return doc.body.textContent ?? ""
}

// https://stackoverflow.com/a/46700791
function notEmpty<TValue>(value: TValue | null): value is TValue {
  return value !== null
}

export function getImgSrcs(html: string): ResourceId[] {
  const images = new DOMParser().parseFromString(html, "text/html").images
  return Array.from(images)
    .map((i) => i.getAttribute("src") as ResourceId | null)
    .filter(notEmpty)
}
