// https://stackoverflow.com/a/71542987
export function disposeObserver(
	ro: ResizeObserver | undefined,
	ref: Element | undefined,
) {
	if (ro == null) return
	if (ref != null) {
		ro.unobserve(ref)
	} else {
		ro.disconnect()
	}
}

let domParser: DOMParser
export function parseHtml(html: string) {
	if (domParser == null) domParser = new DOMParser()
	return domParser.parseFromString(html, 'text/html')
}
