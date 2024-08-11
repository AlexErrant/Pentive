import { Show } from 'solid-js'
import { insertPost, ulidAsHex } from 'shared-edge'
import { requireCsrfSignature, requireSession, isInvalidCsrf } from '~/session'
import {
	type RouteDefinition,
	action,
	cache,
	createAsync,
	redirect,
	useSubmission,
	type RouteSectionProps,
} from '@solidjs/router'
import { getRequestEvent } from 'solid-js/web'

function validateTitle(title: unknown): string | undefined {
	if (typeof title !== 'string' || title.length < 3) {
		return `Title must be at least 3 characters long.`
	}
}

function validateText(text: unknown): string | undefined {
	if (typeof text !== 'string' || text.length < 6) {
		return `Text must be at least 6 characters long.`
	}
}

function validateNook(nook: unknown): string | undefined {
	if (typeof nook !== 'string' || nook.length < 1) {
		return `Nook must be at least 1 character long.`
	}
}

// eslint-disable-next-line @typescript-eslint/require-await
const getCsrfSignatureCached = cache(async () => {
	'use server'
	return requireCsrfSignature()
}, 'csrfSignature')

interface ValidationError {
	message: string
	fieldErrors?: {
		title?: string
		text?: string
		nook?: string
	}
}

const submitting = action(async (form: FormData) => {
	'use server'
	const title = form.get('title')
	const text = form.get('text')
	const nook = form.get('nook')
	const csrfSignature = form.get('csrfSignature')
	if (
		typeof title !== 'string' ||
		typeof text !== 'string' ||
		typeof nook !== 'string' ||
		typeof csrfSignature !== 'string'
	) {
		throw {
			message: `Title, text, nook, and csrfSignature should be strings.`,
		} satisfies ValidationError as unknown
	}
	const fieldErrors = {
		title: validateTitle(title),
		text: validateText(text),
		nook: validateNook(nook),
	}
	if (Object.values(fieldErrors).some(Boolean)) {
		throw {
			message: 'Some fields are invalid',
			fieldErrors,
		} satisfies ValidationError as unknown
	}
	const session = await requireSession()
	if (await isInvalidCsrf(csrfSignature, session.jti)) {
		const searchParams = new URLSearchParams([
			['redirectTo', new URL(getRequestEvent()!.request.url).pathname],
		])
		throw redirect(`/login?${searchParams.toString()}`) as unknown
	}

	await insertPost({
		id: ulidAsHex(),
		authorId: session.sub,
		title,
		text,
		nook,
	})
	// highTODO return redirect to post
})

export const route = {
	preload() {
		void getCsrfSignatureCached()
	},
} satisfies RouteDefinition

export default function Thread(props: RouteSectionProps) {
	const isSubmitting = useSubmission(submitting)
	const csrfSignature = createAsync(async () => await getCsrfSignatureCached())
	const error = () => isSubmitting.error as undefined | ValidationError

	// highTODO idempotency token

	return (
		<main>
			<h1>Submit new Post</h1>
			<form action={submitting} method='post'>
				<input type='hidden' name='nook' value={props.params.nook} />
				<input
					type='hidden'
					name='csrfSignature'
					value={csrfSignature() ?? ''}
				/>
				<div>
					<label for='title-input'>Title</label>
					<input id='title-input' name='title' />
				</div>
				<Show when={error()?.fieldErrors?.title}>
					<p>{error()!.fieldErrors!.title}</p>
				</Show>
				<div>
					<label for='text-input'>Text</label>
					<textarea id='text-input' name='text' rows='4' cols='50' />
				</div>
				<Show when={error()?.fieldErrors?.text}>
					<p>{error()!.fieldErrors!.text}</p>
				</Show>
				<Show when={error()}>
					<p>{error()!.message}</p>
				</Show>
				<button type='submit' disabled={isSubmitting.pending}>
					Submit
				</button>
			</form>
		</main>
	)
}
