import { type JSX, Show, createSignal, batch, Suspense } from 'solid-js'
import type StudyData from './study.data'
import { useRouteData } from '@solidjs/router'
import ResizingIframe from '../components/resizingIframe'

export default function Study(): JSX.Element {
	const studyData = useRouteData<typeof StudyData>()
	const [i, setI] = createSignal(0)
	const [side, setSide] = createSignal<'front' | 'back'>('front')
	const noteCard = () => studyData.cardStudy()?.noteCards.at(i())
	return (
		<div class='flex h-full flex-col'>
			<Suspense fallback={'Loading...'}>
				<Show when={noteCard()} fallback={'No cards!'}>
					<ResizingIframe
						i={{
							tag: 'card',
							side: side(),
							card: noteCard()!.card,
							note: noteCard()!.note,
							template: noteCard()!.template,
						}}
						resize={false}
						class='h-full flex-1 overflow-auto'
					/>
				</Show>
			</Suspense>
			<div class='bg-gray-200 flex flex-row items-center justify-center'>
				<button
					onClick={() => {
						if (side() === 'front') {
							setSide('back')
						} else {
							batch(() => {
								setSide('front')
								setI((i) => i + 1)
							})
						}
					}}
				>
					Next
				</button>
			</div>
		</div>
	)
}
