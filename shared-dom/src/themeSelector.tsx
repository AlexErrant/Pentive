// mostly copied from https://github.com/kobaltedev/kobalte/blob/5dd86f7f557fcb9f00b7b004aa0686ee61769330/apps/docs/src/components/theme-selector.tsx

import { Select } from '@kobalte/core'
import {
	createSignal,
	onMount,
	createEffect,
	type VoidComponent,
	createContext,
	untrack,
	type JSX,
	useContext,
	type Signal,
	type Accessor,
	onCleanup,
} from 'solid-js'
import { Dynamic } from 'solid-js/web'
import nightwind from 'nightwind/helper'
import { DesktopIcon, MoonIcon, SunIcon } from './icons'

type Themes = 'light' | 'dark' | 'system'

interface ThemeOption {
	value: Themes
	label: string
	icon: VoidComponent<{ class: string }>
}

const THEME_OPTIONS: ThemeOption[] = [
	{
		value: 'light',
		label: 'Light',
		icon: (props) => <SunIcon class={props.class} />,
	},
	{
		value: 'dark',
		label: 'Dark',
		icon: (props) => <MoonIcon class={props.class} />,
	},
	{
		value: 'system',
		label: 'System',
		icon: (props) => <DesktopIcon class={props.class} />,
	},
]

export function ThemeSelector() {
	let mo: MutationObserver
	const [colorMode, setColorMode] = createSignal<Themes>('system')

	onMount(() => {
		const [theme, setTheme] = useThemeContext()
		const currentTheme = () =>
			document.documentElement.className.includes('dark')
				? ('dark' as const)
				: ('light' as const)
		mo = new MutationObserver(() => {
			const current = currentTheme()
			if (current !== untrack(theme)) {
				setTheme(current)
			}
		})
		mo.observe(document.documentElement, {
			attributes: true,
		})
		const mode = window.localStorage.getItem('nightwind-mode')
		if (mode === 'light' || mode === 'dark') {
			setColorMode(mode)
		} else {
			setColorMode('system')
		}
	})
	onCleanup(() => {
		mo.disconnect()
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
			value={THEME_OPTIONS.find((option) => option.value === colorMode())}
			onChange={(option) => {
				setColorMode(option?.value ?? 'system')
			}}
			gutter={8}
			sameWidth={false}
			placement='bottom'
			disallowEmptySelection={true}
			itemComponent={(props) => (
				<Select.Item
					item={props.item}
					class='flex items-center space-x-2 px-3 py-1 text-sm outline-none ui-selected:text-sky-700 ui-highlighted:bg-zinc-100 transition-colors cursor-pointer hover:bg-zinc-100'
				>
					{props.item.rawValue.icon({ class: 'h-4 w-4' })}
					<Select.ItemLabel>{props.item.rawValue.label}</Select.ItemLabel>
				</Select.Item>
			)}
		>
			<Select.Trigger
				aria-label='toggle color mode'
				class='flex p-2.5 rounded-md cursor-pointer items-center justify-center transition text-zinc-700 hover:text-zinc-800 hover:bg-zinc-100'
			>
				<Select.Value<ThemeOption>>
					{({ selectedOption }) => (
						<Dynamic component={selectedOption().icon} class='h-5 w-5' />
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

export const agGridTheme = (theme: Accessor<'light' | 'dark'>) =>
	theme() === 'light' ? 'ag-theme-alpine' : 'ag-theme-alpine-dark'

const ThemeContext = createContext<Signal<'light' | 'dark'>>()

export function ThemeProvider(props: { children: JSX.Element }) {
	const [theme, setTheme] = createSignal<'light' | 'dark'>('light')
	return (
		<ThemeContext.Provider value={[theme, setTheme]}>
			{props.children}
		</ThemeContext.Provider>
	)
}

export function useThemeContext() {
	const context = useContext(ThemeContext)
	if (context == null) {
		throw new Error('useThemeContext: cannot find a ThemeContext')
	}
	return context
}
