// https://stackoverflow.com/a/72239265
// https://github.com/solidjs/solid/issues/616

export {}

declare module 'solid-js' {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace JSX {
		type ElementProps<T> = {
			// Add both the element's prefixed properties and the attributes
			[K in keyof T]: Props<T[K]> & HTMLAttributes<T[K]>
		}
		// Prefixes all properties with `prop:` to match Solid's property setting syntax
		type Props<T> = {
			[K in keyof T as `prop:${string & K}`]?: T[K]
		}
		interface IntrinsicElements extends ElementProps<HTMLElementTagNameMap> {}
	}
}
