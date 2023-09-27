// mostly copied from https://github.com/kobaltedev/kobalte/blob/5dd86f7f557fcb9f00b7b004aa0686ee61769330/apps/docs/src/components/theme-selector.tsx

import { Select } from '@kobalte/core'
import { createSignal, onMount, type JSX, createEffect } from 'solid-js'
import { Dynamic } from 'solid-js/web'
import nightwind from 'nightwind/helper'
import { DesktopIcon, MoonIcon, SunIcon } from './icons'

type Themes = 'light' | 'dark' | 'system'

interface ThemeOption {
	value: Themes
	label: string
	icon: () => JSX.Element
}

const THEME_OPTIONS: ThemeOption[] = [
	{
		value: 'light',
		label: 'Light',
		icon: () => <SunIcon class='h-4 w-4' />,
	},
	{
		value: 'dark',
		label: 'Dark',
		icon: () => <MoonIcon class='h-4 w-4' />,
	},
	{
		value: 'system',
		label: 'System',
		icon: () => <DesktopIcon class='h-4 w-4' />,
	},
]

export function ThemeSelector() {
	const [colorMode, setColorMode] = createSignal<Themes>('system')

	onMount(() => {
		const mode = window.localStorage.getItem('nightwind-mode')
		if (mode === 'light' || mode === 'dark') {
			setColorMode(mode)
		} else {
			setColorMode('system')
		}
	})
	createEffect(() => {
		if (colorMode() === 'system') {
			window.localStorage.removeItem('nightwind-mode')
			nightwind.addNightModeSelector() // yes the name is confusing; it adds/removes "dark" based on the system setting; see source code
			document.documentElement.style.setProperty('color-scheme', 'light dark')
		} else {
			window.localStorage.setItem('nightwind-mode', colorMode())
			nightwind.enable(colorMode() === 'dark')
			document.documentElement.style.setProperty('color-scheme', colorMode())
		}
	})
	return (
		<Select.Root<ThemeOption>
			options={THEME_OPTIONS}
			optionValue='value'
			optionTextValue='label'
			defaultValue={THEME_OPTIONS.find(
				(option) => option.value === colorMode(),
			)}
			onChange={(option) => {
				setColorMode(option.value)
			}}
			gutter={8}
			sameWidth={false}
			placement='bottom'
			itemComponent={(props) => (
				<Select.Item
					item={props.item}
					class='flex items-center space-x-2 px-3 py-1 text-sm outline-none ui-selected:text-sky-700 ui-highlighted:bg-zinc-100 transition-colors cursor-pointer hover:bg-zinc-100'
				>
					{props.item.rawValue.icon()}
					<Select.ItemLabel>{props.item.rawValue.label}</Select.ItemLabel>
				</Select.Item>
			)}
		>
			<Select.Trigger
				aria-label='toggle color mode'
				class='flex p-2.5 rounded-md cursor-pointer items-center justify-center transition text-zinc-700 hover:text-zinc-800 hover:bg-zinc-100'
			>
				<Select.Value<ThemeOption>>
					{({ selectedOptions }) => (
						<Dynamic
							component={
								selectedOptions()[0]!.value === 'dark' ? MoonIcon : SunIcon
							}
							class='h-5 w-5'
						/>
					)}
				</Select.Value>
			</Select.Trigger>
			<Select.Portal>
				<Select.Content class='bg-white border border-zinc-300 rounded shadow-md py-1 z-50'>
					<Select.Listbox />
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	)
}
