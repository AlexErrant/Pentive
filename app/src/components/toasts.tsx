import { throwExp } from 'shared'
import {
	type JSXElement,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'
import toast from 'solid-toast'

export function toastError(userMsg: JSXElement, ...consoleMsg: unknown[]) {
	if (consoleMsg.length === 0) {
		console.error(userMsg)
	} else {
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
				<h1 class='text-red-500 font-bold'>Error</h1>
				{userMsg}
			</div>
		),
		{
			unmountDelay: 0,
			duration: Infinity,
		},
	)
}

export function toastFatal(
	userMsg: JSXElement,
	throwMsg: unknown,
	...consoleMsg: unknown[]
) {
	toastError(userMsg, ...consoleMsg)
	return throwExp(throwMsg)
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
