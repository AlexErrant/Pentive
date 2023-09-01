export type Result<TOk, TError> =
	| {
			readonly tag: 'Ok'
			readonly ok: TOk
	  }
	| {
			readonly tag: 'Error'
			readonly error: TError
	  }

export function toOk<T>(ok: T): { tag: 'Ok'; ok: T } {
	return {
		tag: 'Ok',
		ok,
	}
}

export function toError<T>(error: T): { tag: 'Error'; error: T } {
	return {
		tag: 'Error',
		error,
	}
}
