import { iframeResizer, type IFrameComponent } from 'iframe-resizer'
import {
	createEffect,
	onCleanup,
	type VoidComponent,
	Show,
	For,
} from 'solid-js'
import * as Comlink from 'comlink'
import {
	type Template,
	type Card,
	type Note,
	type Side,
	type MediaId,
	assertNever,
} from 'shared'
import { type SetStoreFunction, createStore, unwrap } from 'solid-js/store'
import { db } from '../db'
import { C } from '../topLevelAwait'
import { debounce, leadingAndTrailing } from '@solid-primitives/scheduled'
import { type Error, type Warning, type HtmlResult } from 'shared-dom'

const targetOrigin = '*' // highTODO make more limiting. Also implement https://stackoverflow.com/q/8169582

export type RenderBodyInput =
	| {
			readonly tag: 'template'
			readonly side: Side
			readonly template: Template
			readonly index: number
	  }
	| {
			readonly tag: 'card'
			readonly side: Side
			readonly card: Card
			readonly note: Note
			readonly template: Template
	  }
	| {
			readonly tag: 'raw'
			readonly html: string
			readonly css: string
	  }

export interface RawRenderBodyInput {
	readonly body: string
	readonly css?: string
}

async function getLocalMedia(id: MediaId): Promise<ArrayBuffer | null> {
	const media = await db.getMedia(id)
	return media?.data ?? null
}

export interface AppExpose {
	renderTemplate: typeof C.renderTemplate
	html: typeof C.html
	getLocalMedia: typeof getLocalMedia
	rawRenderBodyInput: RawRenderBodyInput
	resize: () => void
}

interface Diagnostics {
	errors: Error[]
	warnings: Warning[]
}

const ResizingIframe: VoidComponent<{
	readonly i: RenderBodyInput
	class?: string
	resize?: false
}> = (props) => {
	let iframeReference: IFrameComponent | undefined
	onCleanup(() => {
		iframeReference?.iFrameResizer?.close()
	})
	const [diagnostics, setDiagnostics] = createStore<Diagnostics>({
		errors: [],
		warnings: [],
	})
	const debouncePostMessage = leadingAndTrailing(
		debounce,
		// eslint-disable-next-line solid/reactivity
		() => {
			try {
				iframeReference?.contentWindow?.postMessage(
					{
						type: 'pleaseRerender',
						i: buildHtml(
							unwrap(props.i),
							setDiagnostics,
						) satisfies RawRenderBodyInput,
					},
					targetOrigin,
				)
			} catch (error) {
				C.toastError('Error communicating with iframe.', error)
			}
		},
		200,
	)
	createEffect(() => {
		if (props.i.tag === 'template') {
			// "touch" certain fields so they're reactive
			/* eslint-disable @typescript-eslint/no-unused-expressions */
			props.i.template.css
			if (props.i.template.templateType.tag === 'cloze') {
				props.i.template.templateType.template.front
				props.i.template.templateType.template.back
			} else {
				props.i.template.templateType.templates[props.i.index]!.front
				props.i.template.templateType.templates[props.i.index]!.back
			}
			/* eslint-enable @typescript-eslint/no-unused-expressions */
		}
		debouncePostMessage()
	})
	return (
		<div class={'flex flex-col ' + (props.class ?? 'w-full')}>
			<RenderDiagnostics heading='Error' diagnostics={diagnostics.errors} />
			<RenderDiagnostics heading='Warning' diagnostics={diagnostics.warnings} />
			<iframe
				ref={(x) => (iframeReference = x as IFrameComponent)}
				onLoad={() => {
					const resize = () => {
						if (props.resize === false) return
						iframeReference?.iFrameResizer?.resize()
					}
					const appExpose: AppExpose = {
						renderTemplate: (x) => C.renderTemplate(x), // do not eta-reduce. `C`'s `this` binding apparently doesn't work across Comlink
						html: (x, y, z) => C.html(x, y, z), // do not eta-reduce. `C`'s `this` binding apparently doesn't work across Comlink
						getLocalMedia,
						rawRenderBodyInput: buildHtml(unwrap(props.i), setDiagnostics),
						resize,
					}
					const { port1, port2 } = new MessageChannel()
					const comlinkInit: ComlinkInit = {
						type: 'ComlinkInit',
						port: port1,
					}
					Comlink.expose(appExpose, port2)
					iframeReference!.contentWindow!.postMessage(
						comlinkInit,
						targetOrigin,
						[port1],
					)
					Comlink.expose(
						appExpose,
						Comlink.windowEndpoint(
							iframeReference!.contentWindow!,
							self,
							targetOrigin,
						),
					)
					if (props.resize == null) {
						iframeResizer(
							{
								// log: true,

								// If perf becomes an issue consider debouncing https://github.com/davidjbradshaw/iframe-resizer/issues/816

								checkOrigin: [import.meta.env.VITE_APP_UGC_ORIGIN],
							},
							iframeReference!,
						)
					}
					new IntersectionObserver(resize).observe(iframeReference!) // Resize when the iframe becomes visible, e.g. after the "Add Template" tab is clicked when we're looking at another tab. The resizing script behaves poorly when the iframe isn't visible.
					debouncePostMessage()
					resize()
				}}
				sandbox='allow-scripts allow-same-origin' // Changing this has security ramifications! https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
				// "When the embedded document has the same origin as the embedding page, it is strongly discouraged to use both allow-scripts and allow-same-origin"
				// Since this iframe is hosted on `app-user-generated-content` and this component is hosted on `app`, resulting in different origins, we should be safe. https://web.dev/sandboxed-iframes/ https://stackoverflow.com/q/35208161
				src={import.meta.env.VITE_APP_UGC_ORIGIN}
			/>
		</div>
	)
}

export default ResizingIframe

export interface ComlinkInit {
	type: 'ComlinkInit'
	port: MessagePort
}

function getOk(
	htmlResult: HtmlResult | null | undefined,
	setDiagnostics: SetStoreFunction<Diagnostics>,
) {
	if (htmlResult?.tag === 'Ok') {
		setDiagnostics({ warnings: htmlResult.warnings, errors: [] })
		return htmlResult.ok
	} else if (htmlResult?.tag === 'Error') {
		setDiagnostics({ errors: htmlResult?.errors, warnings: [] })
	}
	return null
}

function buildHtml(
	i: RenderBodyInput,
	setDiagnostics: SetStoreFunction<Diagnostics>,
): RawRenderBodyInput {
	switch (i.tag) {
		case 'template': {
			const template = i.template
			const result = getOk(C.renderTemplate(template)[i.index], setDiagnostics)
			if (result == null) {
				return {
					body: `Error rendering Template #${i.index}".`,
					css: template.css,
				}
			} else {
				return {
					body: i.side === 'front' ? result[0] : result[1],
					css: template.css,
				}
			}
		}
		case 'card': {
			const frontBack = getOk(
				C.html(i.card, i.note, i.template),
				setDiagnostics,
			)
			if (frontBack == null) {
				return { body: 'Card is invalid!' }
			}
			const body = i.side === 'front' ? frontBack[0] : frontBack[1]
			return { body }
		}
		case 'raw': {
			return { body: i.html, css: i.css }
		}
		default:
			return assertNever(i)
	}
}

const RenderDiagnostics: VoidComponent<{
	readonly diagnostics: Array<Warning | Error>
	readonly heading: 'Error' | 'Warning'
}> = (props) => {
	return (
		<Show when={props.diagnostics.length !== 0}>
			{props.heading}
			{props.diagnostics.length > 1 ? 's' : ''}:
			<ul>
				<For each={props.diagnostics}>
					{(d) => (
						<li>
							{d.tag === 'SyntaxError' && (
								<>
									There's a syntax error in the template near{' '}
									<code>{d.errorParent}</code>.
								</>
							)}
							{d.tag === 'Transformer404' && (
								<>
									Transformer <code>{d.transformer}</code> not found.
								</>
							)}
						</li>
					)}
				</For>
			</ul>
		</Show>
	)
}

// this exists to cause type errors if new tags are added.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function throwaway(d: Warning | Error) {
	if (d.tag === 'SyntaxError') {
		return ''
	} else if (d.tag === 'Transformer404') {
		return ''
	}
	assertNever(d)
}
