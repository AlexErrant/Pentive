import {
	createGrid as createAgGrid,
	type GridApi,
	type GridOptions,
} from 'ag-grid-community'
import type { Override } from 'shared/utility'
import {
	createEffect,
	ErrorBoundary,
	getOwner,
	type JSX,
	on,
	type Owner,
	runWithOwner,
	type Signal,
	Suspense,
} from 'solid-js'
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
		this.dispose = render(
			() =>
				runWithOwner(owner, () => (
					<Suspense fallback='Loading...'>
						<ErrorBoundary fallback='Error rendering cell.'>
							{fn()}
						</ErrorBoundary>
					</Suspense>
				)),
			this.eGui,
		)
	}
}

export function createGrid<TData>(
	eGridDiv: HTMLElement,
	gridOptions: Override<
		GridOptions<TData>,
		{ context: Record<string, unknown> }
	>,
	context?: Record<string, unknown>,
) {
	return createAgGrid(eGridDiv, {
		...gridOptions,
		context: {
			...gridOptions.context,
			...context,
			owner: getOwner()!,
		},
	})
}

export function registerGridUpdate<T>(
	gridApi: GridApi<T>,
	[rowDelta, setRowDelta]: Signal<number | undefined>,
) {
	createEffect(
		on(
			rowDelta,
			(rowDelta) => {
				if (rowDelta != null) {
					// This code is copied from the "Using Cache API Methods" example
					// https://www.ag-grid.com/javascript-data-grid/infinite-scrolling/#example-using-cache-api-methods
					// https://codesandbox.io/p/sandbox/v6klrp

					// if the data has stopped looking for the last row, then we need to adjust the
					// row count to allow for the extra data, otherwise the grid will not allow scrolling
					// to the last row. eg if we have 1000 rows, scroll all the way to the bottom (so
					// maxRowFound=true), and then add 5 rows, the rowCount needs to be adjusted
					// to 1005, so grid can scroll to the end. the grid does NOT do this for you in the
					// refreshInfiniteCache() method, as this would be assuming you want to do it which
					// is not true, maybe the row count is constant and you just want to refresh the details.
					const maxRowFound = gridApi.isLastRowIndexKnown()
					if (maxRowFound ?? false) {
						const rowCount = gridApi.getDisplayedRowCount()
						gridApi.setRowCount(rowCount + rowDelta)
					}
					gridApi.refreshInfiniteCache()
					setRowDelta(undefined) // "unset" add so we can listen to new changes
				}
			},
			{ defer: true },
		),
	)
}
