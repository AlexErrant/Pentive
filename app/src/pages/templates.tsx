import { createStore } from 'solid-js/store'
import { type JSX, Show, onMount, For } from 'solid-js'
import TemplatesTable from '../components/templatesTable'
import { getTemplates } from './templates.data'
import { createAsync } from '@solidjs/router'
import {
	type TemplateId,
	type Template,
	getDefaultTemplate as getDefaultTemplateOg,
} from 'shared'
import ResizingIframe from '../components/resizingIframe'
import { GoldenLayout, LayoutConfig } from 'golden-layout'
import { render } from 'solid-js/web'
import { EditTemplate } from 'shared-dom/editTemplate'
import { cloneDeep } from 'lodash-es'
import { ulidAsBase64Url } from '../domain/utility'
import { C, theme } from '../topLevelAwait'
import TemplateSync from '../components/templateSync'
import { db } from '../db'

const getDefaultTemplate = () =>
	getDefaultTemplateOg(ulidAsBase64Url() as TemplateId)

const saveButton = (template: { template: Template }) => (
	<button
		onClick={async () => {
			await db.upsertTemplate(template.template)
		}}
	>
		Save
	</button>
)

export default function Templates(): JSX.Element {
	const templates = createAsync(async () => await getTemplates(), {
		initialValue: [],
	})
	const [selected, setSelected] = createStore<{ template?: Template }>({})
	let glRoot: HTMLDivElement
	onMount(() => {
		const goldenLayout = new GoldenLayout(glRoot)
		goldenLayout.resizeWithContainerAutomatically = true
		goldenLayout.registerComponentFactoryFunction(
			'TemplatesTable',
			(container) => {
				render(
					() => (
						<TemplatesTable
							templates={templates()}
							onSelectionChanged={(templates) => {
								const t = cloneDeep(templates.at(0)) // some fns mutate the selectedTemplate, so clone to avoid issues
								setSelected('template', t)
							}}
						/>
					),
					container.element,
				)
			},
		)
		goldenLayout.registerComponentFactoryFunction(
			'TemplateDetail',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<Show when={selected.template != null}>
							<EditTemplate
								getDefaultTemplate={getDefaultTemplate}
								saveButton={saveButton}
								theme={theme()}
								renderContainer={C}
								template={selected.template!}
							/>
						</Show>
					),
					container.element,
				)
			},
		)
		goldenLayout.registerComponentFactoryFunction(
			'TemplateSync',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<Show when={selected.template != null}>
							<TemplateSync template={selected.template!} />
						</Show>
					),
					container.element,
				)
			},
		)
		goldenLayout.registerComponentFactoryFunction(
			'Add Template',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<EditTemplate
							getDefaultTemplate={getDefaultTemplate}
							saveButton={saveButton}
							theme={theme()}
							renderContainer={C}
							template={getDefaultTemplate()}
						/>
					),
					container.element,
				)
			},
		)
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
									goldenLayout.addComponent('TemplatesTable')
								}}
							>
								Add TemplatesTable
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									goldenLayout.addComponent('TemplateDetail')
								}}
							>
								Add TemplateDetail
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									goldenLayout.addComponent('Preview Template')
								}}
							>
								Add Preview Template
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									localStorage.removeItem('templatePageLayoutConfig')
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
			'Preview Template',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<Show when={selected.template != null}>
							<For each={C.templateIndexes(selected.template!)}>
								{(index) => (
									<>
										<ResizingIframe
											i={{
												tag: 'template',
												side: 'front',
												template: selected.template!,
												index,
											}}
										/>
										<ResizingIframe
											i={{
												tag: 'template',
												side: 'back',
												template: selected.template!,
												index,
											}}
										/>
									</>
								)}
							</For>
						</Show>
					),
					container.element,
				)
			},
		)
		goldenLayout.on('stateChanged', () => {
			const config = LayoutConfig.fromResolved(goldenLayout.saveLayout())
			localStorage.setItem('templatePageLayoutConfig', JSON.stringify(config))
		})
		const layoutConfig = localStorage.getItem('templatePageLayoutConfig')
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
									componentType: 'TemplatesTable',
								},
								{
									type: 'component',
									componentType: 'Add Template',
								},
								{
									type: 'component',
									componentType: 'Layout Manager',
									isClosable: false,
								},
							],
						},
						{
							type: 'stack',
							content: [
								{
									type: 'component',
									componentType: 'TemplateDetail',
								},
								{
									type: 'component',
									componentType: 'TemplateSync',
								},
								{
									type: 'component',
									componentType: 'Preview Template',
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
