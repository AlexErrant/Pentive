import { createStore } from 'solid-js/store'
import { type JSX, Show, onMount, For, createEffect } from 'solid-js'
import { getCardSettings } from './settings.data'
import { createAsync } from '@solidjs/router'
import { GoldenLayout, LayoutConfig } from 'golden-layout'
import { render } from 'solid-js/web'
import EditCardSetting from '../components/editCardSetting'
import { cloneDeep } from 'lodash-es'
import { ulidAsBase64Url } from '../domain/utility'
import { type CardSettingId } from 'shared/brand'
import {
	type CardSetting,
	getDefaultCardSetting,
} from 'shared/domain/cardSetting'

export default function Settings(): JSX.Element {
	const initialSettings = createAsync(async () => await getCardSettings(), {
		initialValue: [],
	})
	const [settings, setSettings] = createStore({
		cardSettings: [] as CardSetting[],
	})
	createEffect(() => {
		setSettings({ cardSettings: initialSettings() })
	})
	const [selected, setSelected] = createStore<{ setting?: CardSetting }>({})
	let glRoot: HTMLDivElement
	onMount(() => {
		const goldenLayout = new GoldenLayout(glRoot)
		goldenLayout.resizeWithContainerAutomatically = true
		goldenLayout.registerComponentFactoryFunction(
			'SettingsTable',
			(container) => {
				render(
					() => (
						<ul>
							<For each={settings.cardSettings}>
								{(s) => (
									<li>
										<button
											type='button'
											onClick={() => {
												const setting = cloneDeep(
													settings.cardSettings.find((c) => c.id === s.id),
												) // some fns mutate the selectedSetting, so clone to avoid issues... I think. Just copy pasting for now, maybe I don't need to clone.
												setSelected('setting', setting)
											}}
										>
											{s.name}
										</button>
									</li>
								)}
							</For>
						</ul>
					),
					container.element,
				)
			},
		)
		goldenLayout.registerComponentFactoryFunction(
			'SettingDetail',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<Show when={selected.setting != null}>
							<EditCardSetting
								cardSetting={selected.setting!}
								setCardSetting={(s: CardSetting) => {
									setSettings(
										'cardSettings',
										(x) => x.id === selected.setting!.id,
										s,
									)
								}}
							/>
						</Show>
					),
					container.element,
				)
			},
		)
		goldenLayout.registerComponentFactoryFunction(
			'Add Setting',
			(container) => {
				container.element.style.overflow = 'auto'
				render(
					() => (
						<EditCardSetting
							setCardSetting={(s: CardSetting) => {
								setSettings('cardSettings', [...settings.cardSettings, s])
							}}
							cardSetting={getDefaultCardSetting(
								ulidAsBase64Url() as CardSettingId,
							)}
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
									goldenLayout.addComponent('SettingsTable')
								}}
							>
								Add SettingsTable
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									goldenLayout.addComponent('SettingDetail')
								}}
							>
								Add SettingDetail
							</button>
							<button
								class='text-white bg-green-600 m-2 rounded p-2 px-4 font-bold hover:bg-green-700'
								onClick={() => {
									localStorage.removeItem('settingPageLayoutConfig')
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
		goldenLayout.on('stateChanged', () => {
			const config = LayoutConfig.fromResolved(goldenLayout.saveLayout())
			localStorage.setItem('settingPageLayoutConfig', JSON.stringify(config))
		})
		const layoutConfig = localStorage.getItem('settingPageLayoutConfig')
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
									componentType: 'SettingsTable',
								},
								{
									type: 'component',
									componentType: 'Add Setting',
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
									componentType: 'SettingDetail',
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
