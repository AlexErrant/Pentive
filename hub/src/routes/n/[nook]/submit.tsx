import { Show, type JSX } from 'solid-js'
import { FormError, type RouteDataArgs, useRouteData } from 'solid-start'
import { insertPost, ulidAsHex } from 'shared-edge'
import {
	createServerAction$,
	createServerData$,
	redirect,
} from 'solid-start/server'
import { requireCsrfSignature, requireSession, isInvalidCsrf } from '~/session'

export function routeData({ params }: RouteDataArgs) {
	const nook = (): string => params.nook
	return {
		nook,
		csrfSignature: createServerData$(
			async (_, { request }) => await requireCsrfSignature(request),
			{ key: () => ['csrfSignature'] },
		),
	}
}

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

export default function Submit(): JSX.Element {
	const { nook, csrfSignature } = useRouteData<typeof routeData>()

	const [submitting, { Form }] = createServerAction$(
		async (form: FormData, { request }) => {
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
				throw new FormError(
					`Title, text, nook, and csrfSignature should be strings.`,
				)
			}
			const fields = { title, text, nook }
			const fieldErrors = {
				title: validateTitle(title),
				text: validateText(text),
				nook: validateNook(nook),
			}
			if (Object.values(fieldErrors).some(Boolean)) {
				throw new FormError('Some fields are invalid', { fieldErrors, fields })
			}
			const session = await requireSession(request)
			if (await isInvalidCsrf(csrfSignature, session.jti)) {
				const searchParams = new URLSearchParams([
					['redirectTo', new URL(request.url).pathname],
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
		},
	)
	const error = (): FormError | undefined =>
		submitting.error as undefined | FormError

	// highTODO idempotency token

	return (
		<main>
			<h1>Submit new Post</h1>
			<Form>
				<input type='hidden' name='nook' value={nook()} />
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
				<button type='submit'>Submit</button>
			</Form>
		</main>
	)
}
