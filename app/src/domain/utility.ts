// https://stackoverflow.com/a/47140708
export function strip(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html")
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  return doc.body.textContent ?? ""
}
