import { createEffect, createSignal, For, Index, Show } from 'solid-js'
import {
	getPosts,
	getNotes,
	type NoteSortColumn,
	pageSize,
	type NoteCursor,
	type SortState,
	type GetNotesParam,
	getNotesParam,
} from 'shared-edge'
import { noteOrds, toSampleCard } from 'shared-dom/cardHtml'
import type { NookId, Ord } from 'shared/brand'
import { ResizingIframe } from '~/components/resizingIframe'
import { getUserId } from '~/session'
import {
	noteOrdsRenderContainer,
	remoteToNote,
	remoteToTemplate,
} from '~/lib/utility'
import {
	A,
	query,
	createAsync,
	type RouteDefinition,
	type RouteSectionProps,
} from '@solidjs/router'
import { getNookDetailsCached } from '~/lib/useServer'
import {
	getCoreRowModel,
	type ColumnDef,
	createSolidTable,
	type PaginationState,
} from '@tanstack/solid-table'
import '@github/relative-time-element'
import { createInfiniteQuery, keepPreviousData } from '@tanstack/solid-query'
import { Dynamic } from 'solid-js/web'
import { dateToEpoch } from 'shared/utility'
import { LoadingSpinner } from 'shared-dom/icons'
import { toastError } from 'shared-dom/toasts'
import { useUserIdContext } from '~/components/userIdContext'
import RelativeTime from '~/components/relativeTime'

const getPostsCached = query(async (nook: string) => {
	'use server'
	return await getPosts({ nook })
}, 'posts')

const getNotesCached = query(async (x: GetNotesParam) => {
	'use server'
	return await getNotes(getNotesParam.parse(x), await getUserId())
}, 'notes')

export const route = {
	preload({ params }) {
		void getPostsCached(params.nook!)
		void getNotesCached({
			nook: params.nook as NookId,
			cursor: undefined,
			sortState: [{ id: 'note.id', desc: 'desc' }],
		})
	},
} satisfies RouteDefinition

type Note = Awaited<ReturnType<typeof getNotesCached>>[0]

export default function Nook(props: RouteSectionProps) {
	const [sort, setSort] = createSignal<
		Array<{ id: NoteSortColumn; desc: boolean }>
	>([{ id: 'note.id', desc: true }])
	const [pagination, setPagination] = createSignal<PaginationState>({
		pageIndex: 0,
		pageSize,
	})
	const posts = createAsync(
		async () => await getPostsCached(props.params.nook!),
		{ deferStream: true },
	)
	const notes = createInfiniteQuery(() => {
		const params = {
			nook: props.params.nook as NookId,
			sortState: sort().map((s) => ({
				id: s.id,
				desc: s.desc ? ('desc' as const) : undefined,
			})) satisfies SortState,
		}
		return {
			queryKey: ['nook/notes', params],
			queryFn: async ({ pageParam }) =>
				await getNotesCached({ cursor: pageParam ?? undefined, ...params }),
			initialPageParam: null as NoteCursor | null,
			getNextPageParam: (lastPage) => {
				if (lastPage.length < pageSize) {
					return undefined
				}
				const lastItem = lastPage.slice(-1)[0]!
				return {
					'note.id': lastItem.id,
					subscribers: lastItem.subscribers,
					noteEdited: dateToEpoch(lastItem.noteEdited),
					comments: lastItem.comments,
					til: lastItem.til?.getTime(),
				} satisfies NoteCursor
			},
			refetchOnWindowFocus: false,
			placeholderData: keepPreviousData,
			deferStream: true,
		}
	})
	const nookDetails = createAsync(
		async () => await getNookDetailsCached(props.params.nook),
	)
	createEffect(() => {
		if (notes.isError) {
			toastError(notes.error.message)
		}
	})
	const userId = useUserIdContext()
	const table = createSolidTable({
		onSortingChange: setSort,
		manualSorting: true,
		enableMultiSort: false,

		onPaginationChange: setPagination,
		manualPagination: true,
		pageCount: -1,
		autoResetPageIndex: true,

		initialState: {
			columnVisibility: {
				til: userId() != null,
			},
		},

		state: {
			get sorting() {
				return sort()
			},
			get pagination() {
				return pagination()
			},
		},
		get data() {
			return notes.data?.pages.flat() ?? []
		},
		columns: [
			{
				header: () => 'Subscribers',
				id: 'subscribers' satisfies NoteSortColumn,
				accessorFn: (x) => x.subscribers,
				cell: (info) => info.row.original.subscribers,
			},
			{
				header: () => 'Created',
				id: 'note.id' satisfies NoteSortColumn,
				accessorFn: (x) => x.note.created,
				cell: (info) => <RelativeTime date={info.row.original.note.created} />,
			},
			{
				header: () => 'Edited',
				id: 'noteEdited' satisfies NoteSortColumn,
				accessorFn: (x) => x.note.edited,
				cell: (info) => <RelativeTime date={info.row.original.note.edited} />,
			},
			{
				header: () => 'Til',
				id: 'til' satisfies NoteSortColumn,
				accessorFn: (x) => x.til,
				cell: (info) => (
					<>
						{info.row.original.til == null ? (
							''
						) : (
							<>
								Last synced at
								<RelativeTime date={info.row.original.til} />
							</>
						)}
					</>
				),
			},
			{
				header: () => 'Comments',
				id: 'comments' satisfies NoteSortColumn,
				accessorFn: (x) => x.comments,
				cell: (info) => (
					<a href={`/n/${props.params.nook}/note/${info.row.original.id}`}>
						{info.row.original.comments}
					</a>
				),
			},
			{
				id: 'preview',
				cell: (info) => {
					const localNote = () => remoteToNote(info.row.original.note)
					const template = () => remoteToTemplate(info.row.original.template)
					const count = () =>
						noteOrds.bind(noteOrdsRenderContainer)(localNote(), template())
							.length - 1
					return (
						<>
							<ResizingIframe
								i={{
									tag: 'card',
									side: 'front',
									template: template(),
									card: toSampleCard(0 as Ord),
									note: localNote(),
								}}
							/>
							<Show when={count() !== 0}>+{count()}</Show>
						</>
					)
				},
			},
		] satisfies Array<ColumnDef<Note>>,
		getCoreRowModel: getCoreRowModel(),
	})
	return (
		<>
			<ul>
				<For each={posts()}>
					{(post) => (
						<li>
							<A href={`thread/${post.id}`}>{post.title}</A>
						</li>
					)}
				</For>
			</ul>
			<Show when={notes.data?.pages[0]?.length !== 0}>
				<div class='relative'>
					<Show when={notes.isFetching}>
						<div class='bg-white absolute inset-0 flex items-center justify-center bg-opacity-50'>
							<LoadingSpinner class='text-gray-200 h-8 w-8 animate-spin fill-blue-600 dark:text-gray-600' />
						</div>
					</Show>
					<table class='w-full table-auto text-left'>
						<thead>
							<For each={table.getHeaderGroups()}>
								{(headerGroup) => (
									<tr>
										<For each={headerGroup.headers}>
											{(header) => (
												<th colSpan={header.colSpan}>
													<Show when={!header.isPlaceholder}>
														<div
															class={
																header.column.getCanSort()
																	? 'cursor-pointer select-none'
																	: undefined
															}
															onClick={header.column.getToggleSortingHandler()}
														>
															<Dynamic
																component={header.column.columnDef.header}
																{...header.getContext()}
															/>
															{{
																asc: ' 🔼',
																desc: ' 🔽',
															}[header.column.getIsSorted() as string] ?? null}
														</div>
													</Show>
												</th>
											)}
										</For>
									</tr>
								)}
							</For>
						</thead>
						<tbody>
							<Index each={table.getRowModel().rows}>
								{(row) => (
									<tr>
										<Index each={row().getVisibleCells()}>
											{(cell) => (
												<td>
													<Dynamic
														component={cell().column.columnDef.cell}
														{...cell().getContext()}
													/>
												</td>
											)}
										</Index>
									</tr>
								)}
							</Index>
						</tbody>
						<tfoot>
							<For each={table.getFooterGroups()}>
								{(footerGroup) => (
									<tr>
										<For each={footerGroup.headers}>
											{(header) => (
												<th colSpan={header.colSpan}>
													<Show when={!header.isPlaceholder}>
														<Dynamic
															component={header.column.columnDef.footer}
															{...header.getContext()}
														/>
													</Show>
												</th>
											)}
										</For>
									</tr>
								)}
							</For>
						</tfoot>
					</table>
				</div>
				<button
					class='rounded border p-1'
					onClick={async () => {
						await notes.fetchNextPage()
					}}
					disabled={!notes.hasNextPage}
				>
					{notes.hasNextPage ? 'Load More' : 'No More Items'}
				</button>
			</Show>
			<Show
				when={
					notes.data?.pages[0]?.length === 0 && // We optimize for when there is more than one note/post (which is more common).
					posts()?.length === 0 && // Only if there are none do we check to see if the nook exists, which is async.
					nookDetails() == null // If it doesn't, show the create link.
				}
			>
				<a href={`/nooks/create?nook=${props.params.nook ?? ''}`}>
					Create Nook
				</a>
			</Show>
		</>
	)
}
