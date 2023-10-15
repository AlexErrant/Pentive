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
		<>
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
						class='h-full overflow-y-scroll'
					/>
				</Show>
			</Suspense>
			<div
				class='bg-gray-200 flex flex-row items-center justify-center'
				style={{
					position: 'fixed',
					bottom: '0',
					left: '0',
					right: '0',
				}}
			>
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
		</>
	)
}
