import { type JSX, Show, createResource, createEffect, onMount } from 'solid-js'
import { GoldenLayout, LayoutConfig } from 'golden-layout'
import { createStore } from 'solid-js/store'
import CardsTable from '../components/cardsTable'
import { CardsRemote } from '../components/cardsRemote'
import { FieldsEditor } from '../components/fieldsEditor'
import { CardsPreview } from '../components/cardsPreview'
import { db } from '../db'
import { render } from 'solid-js/web'
import AddNote from '../components/addNote'
import NoteSync from '../components/noteSync'
import NoteTags from '../components/noteTags'
import { type NoteCardView } from '../uiLogic/cards'

export default function Cards(): JSX.Element {
	const [selected, setSelected] = createStore<{ noteCard?: NoteCardView }>({})
	const [cards] = createResource(
		() => selected.noteCard?.note.id,
		db.getCardsByNote,
	)
	createEffect(() => {
		if (cards() != null) setSelected('noteCard', 'cards', cards()!)
	})
	let glRoot: HTMLDivElement
	onMount(() => {
		const goldenLayout = new GoldenLayout(glRoot)
		goldenLayout.resizeWithContainerAutomatically = true
		goldenLayout.registerComponentFactoryFunction('Add Note', (container) => {
			container.element.style.overflow = 'auto'
			render(() => <AddNote />, container.element)
		})
		goldenLayout.registerComponentFactoryFunction('CardsTable', (container) => {
			render(
				() => (
					<CardsTable
						onSelectionChanged={(ncs) => {
							const nc = ncs[0]
							if (nc != null) {
								const selected = {
									...nc,
									mainCard: nc.card,
									cards: [],
								} satisfies NoteCardView
								setSelected('noteCard', selected)
							} else {
								setSelected('noteCard', undefined)
							}
						}}
					/>
				),
				container.element,
			)
		})
		goldenLayout.registerComponentFactoryFunction('CardDetail', (container) => {
			container.element.style.overflow = 'auto'
			render(
				() => (
					<Show when={selected.noteCard != null}>
						<div class='h-full overflow-auto'>
							<CardsRemote noteCard={selected.noteCard!} />
							<FieldsEditor
								noteCard={selected.noteCard!}
								setNoteCard={setSelected}
							/>
						</div>
					</Show>
				),
				container.element,
			)
		})
		goldenLayout.registerComponentFactoryFunction('CardSync', (container) => {
			container.element.style.overflow = 'auto'
			render(
				() => (
					<Show when={selected.noteCard != null}>
						<div class='h-full overflow-auto'>
							<NoteSync
								template={selected.noteCard!.template}
								note={selected.noteCard!.note}
							/>
						</div>
					</Show>
				),
				container.element,
			)
		})
		goldenLayout.registerComponentFactoryFunction('NoteTags', (container) => {
			container.element.style.overflow = 'auto'
			render(
				() => (
					<Show when={selected.noteCard}>
						{(n) => <NoteTags noteCard={n()} />}
					</Show>
				),
				container.element,
			)
		})
		goldenLayout.registerComponentFactoryFunction(
			'Layout Manager',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<div>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									goldenLayout.addComponent('CardsTable')
								}}
							>
								Add CardsTable
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									goldenLayout.addComponent('CardDetail')
								}}
							>
								Add CardDetail
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									goldenLayout.addComponent('Preview Card')
								}}
							>
								Add Preview Card
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									localStorage.removeItem('cardPageLayoutConfig')
								}}
							>
								Reset Layout
							</button>
						</div>
					),
					container.element,
				)
			},
		)
		goldenLayout.registerComponentFactoryFunction(
			'Preview Card',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<Show when={selected.noteCard != null}>
							<CardsPreview noteCard={selected.noteCard!} />
						</Show>
					),
					container.element,
				)
			},
		)
		goldenLayout.on('stateChanged', () => {
			const config = LayoutConfig.fromResolved(goldenLayout.saveLayout())
			localStorage.setItem('cardPageLayoutConfig', JSON.stringify(config))
		})
		const layoutConfig = localStorage.getItem('cardPageLayoutConfig')
		if (layoutConfig != null) {
			goldenLayout.loadLayout(JSON.parse(layoutConfig) as LayoutConfig)
		} else {
			goldenLayout.loadLayout({
				header: {
					popout: false,
					maximise: false, // disabling for now because using it causes the other panels to be at the bottom of the screen for some reason https://github.com/golden-layout/golden-layout/issues/847
				},
				root: {
					type: 'row',
					content: [
						{
							type: 'stack',
							content: [
								{
									type: 'component',
									componentType: 'CardsTable',
								},
								{
									type: 'component',
									componentType: 'Layout Manager',
									isClosable: false,
								},
								{
									type: 'component',
									componentType: 'Add Note',
								},
							],
						},
						{
							type: 'stack',
							content: [
								{
									type: 'component',
									componentType: 'CardDetail',
								},
								{
									type: 'component',
									componentType: 'NoteTags',
								},
								{
									type: 'component',
									componentType: 'CardSync',
								},
								{
									type: 'component',
									componentType: 'Preview Card',
								},
							],
						},
					],
				},
			})
		}
	})
	return <div ref={(e) => (glRoot = e)} class='h-full' />
}
