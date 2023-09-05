import { throwExp } from 'shared'
import {
	type JSXElement,
	createEffect,
	createSignal,
	onCleanup,
	Show,
} from 'solid-js'
import toast from 'solid-toast'

export function toastError(userMsg: JSXElement, ...consoleMsg: unknown[]) {
	let hasConsoleMsg = false
	if (consoleMsg.length === 0) {
		console.error(userMsg)
	} else {
		hasConsoleMsg = true
		console.error(...consoleMsg)
	}
	toast.custom(
		(t) => (
			<div
				class='bg-white min-w-[350px] cursor-pointer rounded-md px-6 py-3 shadow-md'
				onClick={() => {
					toast.dismiss(t.id)
				}}
			>
				<h1 class='text-red-500 text-xl font-bold'>Error</h1>
				<div class='text-lg'>{userMsg}</div>
				<Show when={hasConsoleMsg}>
					<div class='italic'>
						The console has technical details.{' '}
						<a
							// https://stackoverflow.com/a/20327676
							class='text-blue-600 relative z-[1] m-[-1em] inline-block p-[1em] underline visited:text-purple-600 hover:text-blue-800'
							href='https://balsamiq.com/support/faqs/browserconsole'
							target='_blank'
							rel='noreferrer noopener'
							onClick={(e) => {
								e.stopPropagation()
							}}
						>
							Here's how to open the console.
						</a>
					</div>
				</Show>
			</div>
		),
		{
			unmountDelay: 0,
			duration: Infinity,
		},
	)
}

export function toastFatal(
	userMsg: string | { jsx: JSXElement; throwMsg: string },
	...consoleMsg: unknown[]
): never {
	if (typeof userMsg === 'string') {
		toastError(userMsg, ...consoleMsg)
		return throwExp(userMsg)
	} else {
		toastError(userMsg.jsx, ...consoleMsg)
		return throwExp(userMsg.throwMsg)
	}
}

// fatal may be a user error, while impossible is a "programmer screwed up" error
// medTODO customize the UI
export function toastImpossible(
	userMsg: string | { jsx: JSXElement; throwMsg: string },
	...consoleMsg: unknown[]
): never {
	if (typeof userMsg === 'string') {
		toastError(userMsg, ...consoleMsg)
		return throwExp(userMsg)
	} else {
		toastError(userMsg.jsx, ...consoleMsg)
		return throwExp(userMsg.throwMsg)
	}
}

export function toastWarn(userMsg: JSXElement, ...consoleMsg: unknown[]) {
	if (consoleMsg.length === 0) {
		console.warn(userMsg)
	} else {
		console.warn(...consoleMsg)
	}
	toast.custom(
		(t) => (
			<div
				class='bg-white min-w-[350px] cursor-pointer rounded-md px-6 py-3 shadow-md'
				onClick={() => {
					toast.dismiss(t.id)
				}}
			>
				<h1 class='text-orange-500 font-bold'>Warning</h1>
				{userMsg}
			</div>
		),
		{
			unmountDelay: 0,
			duration: Infinity,
		},
	)
}

// based on the "With Timer" example on https://www.solid-toast.com/
export function toastInfo(userMsg: string, duration: number = 6000) {
	console.info(userMsg)
	toast.custom(
		(t) => {
			const [life, setLife] = createSignal(100)
			const startTime = Date.now()

			createEffect(() => {
				if (t.paused) return
				const interval = setInterval(() => {
					const diff = Date.now() - startTime - t.pauseDuration
					setLife(100 - (diff / duration) * 100)
				})
				onCleanup(() => {
					clearInterval(interval)
				})
			})

			return (
				<div
					class='bg-white min-w-[350px] cursor-pointer rounded-md px-6 py-3 shadow-md'
					onClick={() => {
						toast.dismiss(t.id)
					}}
				>
					<div>{userMsg}</div>
					<div class='relative pt-4'>
						<div class='bg-cyan-100 h-1 w-full rounded-full' />
						<div
							class='bg-cyan-800 absolute top-4 h-1 rounded-full'
							style={{ width: `${life()}%` }}
						/>
					</div>
				</div>
			)
		},
		{
			duration,
		},
	)
}
