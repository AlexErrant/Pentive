/* eslint-disable @typescript-eslint/naming-convention */

// https://stackoverflow.com/a/72239265
// https://github.com/solidjs/solid/issues/616

import type RelativeTimeElement from '@github/relative-time-element'

declare module 'solid-js' {
	// eslint-disable-next-line @typescript-eslint/no-namespace
	namespace JSX {
		interface IntrinsicElements {
			// https://github.com/github/relative-time-element/blob/3a8f30f1a66edbe8d4e76c721ff1767c49b0ed27/src/relative-time-element-define.ts#L27
			'relative-time': JSX.IntrinsicElements['span'] &
				Partial<Omit<RelativeTimeElement, keyof HTMLElement>>
		}
	}
}
