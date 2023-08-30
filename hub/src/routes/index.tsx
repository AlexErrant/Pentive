import { type TemplateId, type Ord, type Template } from 'shared'
import { toSampleCard, toSampleNote } from 'shared-dom'
import { type JSX, createSignal } from 'solid-js'
import ResizingIframe from '~/components/resizingIframe'

export default function Home(): JSX.Element {
	const [template, setTemplate] = createSignal<Template>({
		id: '' as TemplateId,
		name: '',
		created: new Date(),
		updated: new Date(),
		remotes: {},
		css: '',
		fields: [{ name: 'Front' }, { name: 'Back' }],
		templateType: {
			tag: 'standard',
			templates: [
				{
					id: 0 as Ord,
					name: 'My Template',
					front: '{{Front}}',
					back: `{{FrontSide}}<hr id=answer>{{Back}}`,
					shortFront: '{{Front}}',
					shortBack: '{{Back}}',
				},
			],
		},
	})

	return (
		<main class='w-full space-y-2 p-4'>
			<h3 class='text-xl font-bold'>Message board</h3>
			<ResizingIframe
				i={{
					tag: 'template',
					side: 'back',
					template: template(),
					index: 0,
				}}
			/>
			<ResizingIframe
				i={{
					tag: 'card',
					side: 'back',
					template: template(),
					card: toSampleCard(0 as Ord),
					note: toSampleNote(
						new Map([
							['Front', 'q'],
							['Back', 'a'],
						]),
					),
				}}
			/>
			<button
				onClick={() => {
					setTemplate((t) => {
						if (t.templateType.tag === 'cloze') {
							return {
								...t,
								templateType: {
									...t.templateType,
									template: {
										...t.templateType.template,
										front: `${t.templateType.template.front}!`,
									},
								},
							}
						} else {
							return {
								...t,
								templateType: {
									...t.templateType,
									templates: t.templateType.templates.map((t, i) => {
										if (i === 0) {
											return {
												...t,
												front: `${t.front}!`,
											}
										}
										return t
									}),
								},
							}
						}
					})
				}}
			>
				mutate!
			</button>
		</main>
	)
}
