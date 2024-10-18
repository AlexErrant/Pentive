import {
	type JSX,
	Show,
	createSignal,
	batch,
	Suspense,
	createResource,
} from 'solid-js'
import { getCards } from './study.data'
import { createAsync } from '@solidjs/router'
import ResizingIframe from '../components/resizingIframe'
import { db } from '../db'
import { cardSetting as cardSettingParser } from './importer/parser'
import init, { Fsrs } from 'fsrs-browser'
import { type ReviewId, type CardSettingId } from 'shared/brand'
import { ulidAsBase64Url } from '../domain/utility'
import { C } from '../topLevelAwait'

export default function Study(): JSX.Element {
	const cards = createAsync(async () => await getCards())
	const [i, setI] = createSignal(0)
	const [side, setSide] = createSignal<'front' | 'back'>('front')
	const noteCard = () => cards()?.noteCards.at(i())
	const [cardSettings] = createResource(db.getCardSettings)
	const [fsrsMap] = createResource(cardSettings, async (cardSettings) => {
		await init()
		const fsrsMap = new Map<CardSettingId, Fsrs>()
		cardSettings.forEach((cs) => {
			const weights = cardSettingParser.parse(cs).fsrsWeights
			const weightsArray =
				weights == null ? undefined : new Float32Array(weights)
			fsrsMap.set(cs.id, new Fsrs(weightsArray))
		})
		return fsrsMap
	})
	const cardId = () => noteCard()?.card.id
	const [fsrsItems] = createResource(cardId, db.getFsrsItemsForCard)
	const states = () => {
		const cid = cardId()
		const fi = fsrsItems()
		if (cid != null && fi != null) {
			const { eases, ids, cids, types } = fi
			const fsrs = fsrsMap()?.get(cid) ?? new Fsrs()
			const [stability, difficulty] =
				fi.ids.length === 0
					? [undefined, undefined]
					: (fsrs.memoryStateAnki(cids, eases, ids, types) ?? [
							undefined,
							undefined,
						])
			const now = BigInt(new Date().getTime())
			const mostRecent = ids.at(-1) ?? now
			const daysElapsed = (now - mostRecent) / 86400000n + 1n // +1n because BigInt division truncates and we want to simulate Math.ceil
			const desiredRetention =
				cardSettings()
					?.map((cs) => cardSettingParser.parse(cs)) // medTODO could memoize
					.find((cs) => cs.id === cardId())?.desiredRetention ?? 0.9
			return fsrs.nextStates(
				stability,
				difficulty,
				desiredRetention,
				Number(daysElapsed),
			)
		}
	}
	async function rate(rating: number) {
		await db.insertReview({
			id: ulidAsBase64Url() as ReviewId,
			cardId: cardId()!,
			created: C.getDate(),
			rating,
			kind: 'review', // highTODO
		})
		batch(() => {
			setSide('front')
			setI((i) => i + 1)
		})
	}
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
				{side() === 'front' ? (
					<button
						onClick={() => {
							setSide('back')
						}}
					>
						Show Answer
					</button>
				) : (
					<>
						<button
							class='border-red-500 mx-2 my-1 rounded-lg border-4 px-2 py-1'
							onClick={async () => {
								await rate(1)
							}}
						>
							<div>Again</div>
							<div>{states()?.again.interval}</div>
						</button>
						<button
							class='border-amber-500 mx-2 my-1 rounded-lg border-4 px-2 py-1'
							onClick={async () => {
								await rate(2)
							}}
						>
							<div>Hard</div>
							<div>{states()?.hard.interval}</div>
						</button>
						<button
							class='border-green-500 mx-2 my-1 rounded-lg border-4 px-2 py-1'
							onClick={async () => {
								await rate(3)
							}}
						>
							<div>Good</div>
							<div>{states()?.good.interval}</div>
						</button>
						<button
							class='border-sky-500 mx-2 my-1 rounded-lg border-4 px-2 py-1'
							onClick={async () => {
								await rate(4)
							}}
						>
							<div>Easy</div>
							<div>{states()?.easy.interval}</div>
						</button>
					</>
				)}
			</div>
		</div>
	)
}
