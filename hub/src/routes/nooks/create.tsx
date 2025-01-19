import { For, Show } from 'solid-js'
import { createNook } from 'shared-edge'
import {
	requireSession,
	isInvalidCsrf,
	requireUserId,
	getCsrfSignatureCached,
	type CsrfFormat,
} from '~/session'
import { type NookId } from 'shared/brand'
import {
	type RouteDefinition,
	action,
	createAsync,
	redirect,
	useSubmission,
	type RouteSectionProps,
} from '@solidjs/router'
import { getRequestEvent } from 'solid-js/web'
import { type NookType, nookTypes } from 'shared/domain/nook'

function validateSidebar(sidebar: unknown): string | undefined {
	if (typeof sidebar !== 'string' || sidebar.length < 3) {
		return `Sidebar must be at least 3 characters long.`
	}
}

function validateDescription(description: unknown): string | undefined {
	if (typeof description !== 'string' || description.length < 6) {
		return `Description must be at least 6 characters long.`
	}
}

function validateNook(nook: unknown): string | undefined {
	if (typeof nook !== 'string' || nook.length < 1) {
		return `Nook must be at least 1 character long.`
	}
}

interface ValidationError {
	message: string
	fieldErrors?: {
		sidebar?: string
		description?: string
		nook?: string
	}
}

const submitting = action(async (form: FormData) => {
	'use server'
	const sidebar = form.get('sidebar')
	const description = form.get('description')
	const nook = form.get('nook') as NookId
	const nookType = form.get('nookType') as NookType
	const csrfSignature = form.get('csrfSignature') as CsrfFormat
	if (
		typeof sidebar !== 'string' ||
		typeof description !== 'string' ||
		typeof nook !== 'string' ||
		typeof csrfSignature !== 'string'
	) {
		throw {
			message: `Sidebar, description, nook, and csrfSignature should be strings.`,
		} satisfies ValidationError as unknown
	}
	const fieldErrors = {
		sidebar: validateSidebar(sidebar),
		description: validateDescription(description),
		nook: validateNook(nook),
	}
	if (Object.values(fieldErrors).some(Boolean)) {
		throw {
			message: 'Some fields are invalid',
			fieldErrors,
		} satisfies ValidationError as unknown
	}
	const userId = await requireUserId()
	const session = await requireSession()
	if (await isInvalidCsrf(csrfSignature, session.jti)) {
		const searchParams = new URLSearchParams([
			['redirectTo', new URL(getRequestEvent()!.request.url).pathname],
		])
		throw redirect(`/login?${searchParams.toString()}`) as unknown
	}

	await createNook({
		userId,
		nookType,
		sidebar,
		description,
		nook,
	})
	return redirect(`/n/${nook}`)
})

export const route = {
	preload({ location }) {
		void getCsrfSignatureCached(location.pathname)
	},
} satisfies RouteDefinition

export default function Submit(props: RouteSectionProps) {
	const csrfSignature = createAsync(
		async () => await getCsrfSignatureCached(props.location.pathname),
	)
	const isSubmitting = useSubmission(submitting)
	const error = () => isSubmitting.error as undefined | ValidationError

	// highTODO idempotency token

	return (
		<main>
			<h1>Create Nook</h1>
			<form action={submitting} method='post'>
				<input
					type='hidden'
					name='csrfSignature'
					value={csrfSignature() ?? ''}
				/>
				<div>
					<label for='nook-input'>Nook Name</label>
					<input value={props.params.nook ?? ''} id='nook-input' name='nook' />
				</div>
				<div>
					<label for='sidebar-input'>Sidebar</label>
					<input id='sidebar-input' name='sidebar' />
				</div>
				<Show when={error()?.fieldErrors?.sidebar}>
					<p>{error()!.fieldErrors!.sidebar}</p>
				</Show>
				<div>
					<label for='description-input'>Description</label>
					<textarea
						id='description-input'
						name='description'
						rows='4'
						cols='50'
					/>
				</div>
				<Show when={error()?.fieldErrors?.description}>
					<p>{error()!.fieldErrors!.description}</p>
				</Show>
				<Show when={error()}>
					<p>{error()!.message}</p>
				</Show>
				<fieldset>
					<legend>Nook Type</legend>
					<For each={nookTypes}>
						{(nookType) => (
							<div>
								<input
									type='radio'
									id={nookType}
									name='nookType'
									value={nookType}
								/>
								<label for={nookType}>{nookType}</label>
							</div>
						)}
					</For>
				</fieldset>
				<button type='submit' disabled={isSubmitting.pending}>
					Create Nook
				</button>
			</form>
		</main>
	)
}
