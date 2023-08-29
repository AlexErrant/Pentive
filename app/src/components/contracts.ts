import { type JSX } from 'solid-js'

export interface NavLinkData {
	readonly child: JSX.Element | (() => JSX.Element)
	readonly href: string
}
