// https://stackoverflow.com/a/71542987
export function disposeObserver(ro: ResizeObserver | undefined, ref: Element) {
	if (ro == null) return
	if (ref != null) {
		ro.unobserve(ref)
	} else {
		ro.disconnect()
	}
}
