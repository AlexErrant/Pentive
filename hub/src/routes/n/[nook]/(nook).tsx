import { For, Show } from 'solid-js'
import { getPosts, getNotes } from 'shared-edge'
import { noteOrds, toSampleCard } from 'shared-dom/cardHtml'
import { type NookId, type Ord } from 'shared/brand'
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
	flexRender,
	getCoreRowModel,
	type ColumnDef,
	createSolidTable,
} from '@tanstack/solid-table'
import '@github/relative-time-element'

const getPostsCached = query(async (nook: string) => {
	'use server'
	return await getPosts({ nook })
}, 'posts')

const getNotesCached = query(async (nook: string) => {
	'use server'
	return await getUserId().then(
		async (userId) => await getNotes(nook as NookId, userId),
	)
}, 'notes')

export const route = {
	preload({ params }) {
		void getPostsCached(params.nook!)
		void getNotesCached(params.nook!)
	},
} satisfies RouteDefinition

type Note = Awaited<ReturnType<typeof getNotesCached>>[0]

export default function Nook(props: RouteSectionProps) {
	const posts = createAsync(
		async () => await getPostsCached(props.params.nook!),
		{ deferStream: true },
	)
	const notes = createAsync(
		async () => await getNotesCached(props.params.nook!),
		{ initialValue: [], deferStream: true },
	)
	const nookDetails = createAsync(
		async () => await getNookDetailsCached(props.params.nook),
	)
	const table = createSolidTable({
		get data() {
			return notes()
		},
		columns: [
			{
				header: 'Subscribers',
				cell: (info) => info.row.original.subscribers,
			},
			{
				header: 'Created',
				cell: (info) => (
					<relative-time prop:date={info.row.original.note.created} />
				),
			},
			{
				header: 'Edited',
				cell: (info) => (
					<relative-time prop:date={info.row.original.note.edited} />
				),
			},
			{
				header: 'Til',
				cell: (info) => (
					<>
						{info.row.original.til == null ? (
							''
						) : (
							<>
								Last synced at
								<relative-time prop:date={info.row.original.til} />
							</>
						)}
					</>
				),
			},
			{
				header: 'Comments',
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
				<table class='w-full table-auto text-left'>
					<thead>
						<For each={table.getHeaderGroups()}>
							{(headerGroup) => (
								<tr>
									<For each={headerGroup.headers}>
										{(header) => (
											<th>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.header,
															header.getContext(),
														)}
											</th>
										)}
									</For>
								</tr>
							)}
						</For>
					</thead>
					<tbody>
						<For each={table.getRowModel().rows}>
							{(row) => (
								<tr>
									<For each={row.getVisibleCells()}>
										{(cell) => (
											<td>
												{flexRender(
													cell.column.columnDef.cell,
													cell.getContext(),
												)}
											</td>
										)}
									</For>
								</tr>
							)}
						</For>
					</tbody>
					<tfoot>
						<For each={table.getFooterGroups()}>
							{(footerGroup) => (
								<tr>
									<For each={footerGroup.headers}>
										{(header) => (
											<th>
												{header.isPlaceholder
													? null
													: flexRender(
															header.column.columnDef.footer,
															header.getContext(),
														)}
											</th>
										)}
									</For>
								</tr>
							)}
						</For>
					</tfoot>
				</table>
			</ul>
			<Show
				when={
					notes()?.length === 0 && // We optimize for when there is more than one note/post (which is more common).
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
