import {
	createGrid as createAgGrid,
	type GridOptions,
} from 'ag-grid-community2'
import { type Override } from 'shared/utility'
import { getOwner, type JSX, type Owner, runWithOwner } from 'solid-js'
import { render } from 'solid-js/web'

export class Renderer {
	eGui = document.createElement('div')
	dispose: (() => void) | undefined

	getGui() {
		return this.eGui
	}

	refresh() {
		return false
	}

	destroy() {
		if (this.dispose != null) {
			this.dispose()
		}
	}

	render(owner: Owner, fn: () => JSX.Element) {
		this.dispose = render(() => runWithOwner(owner, fn), this.eGui)
	}
}

export function createGrid<TData>(
	eGridDiv: HTMLElement,
	gridOptions: Override<
		GridOptions<TData>,
		{ context: Record<string, unknown> }
	>,
) {
	return createAgGrid(eGridDiv, {
		...gridOptions,
		context: {
			...gridOptions.context,
			owner: getOwner()!,
		},
	})
}
