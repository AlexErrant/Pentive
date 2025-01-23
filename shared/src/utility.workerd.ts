export * from './utility'

// The `debugger` statement in `./utility.ts` causes `wrangler dev` to pause, even without a debugger attached.
// It is removed here because the pause is confusing since you probably don't have a debugger attached.
export function throwExp(error?: unknown, ...metadata: unknown[]): never {
	if (error == null) {
		console.trace()
		throw new Error(
			'This error should never occur - please open an issue if you see this!',
		)
	}
	if (metadata.length !== 0) console.error(...metadata)
	if (typeof error === 'string') {
		throw new Error(error)
	}
	throw error as unknown
}
