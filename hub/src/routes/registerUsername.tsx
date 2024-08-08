import { Show } from 'solid-js'
import { createUserSession, getInfo, getUserId } from '~/session'
import { getCasedUserId, registerUser } from 'shared-edge'
import {
	A,
	type RouteSectionProps,
	action,
	cache,
	redirect,
	type RouteDefinition,
	useSubmission,
} from '@solidjs/router'
import { getRequestEvent } from 'solid-js/web'

// https://stackoverflow.com/a/25352300
function isAlphaNumeric(str: string) {
	let code, i, len
	for (i = 0, len = str.length; i < len; i++) {
		code = str.charCodeAt(i)
		if (
			!(code > 47 && code < 58) && // numeric (0-9)
			!(code > 64 && code < 91) && // upper alpha (A-Z)
			!(code > 96 && code < 123) // lower alpha (a-z)
		) {
			return false
		}
	}
	return true
}

async function validateUsername(username: unknown) {
	if (typeof username !== 'string' || username.length < 3) {
		return `Username must be at least 3 characters long.`
	}
	if (!isAlphaNumeric(username)) {
		return 'Username must contain only letters or numbers.'
	}
	const casedUserId = await getCasedUserId(username)
	if (casedUserId != null) {
		return `Username '${casedUserId.id}' already taken.`
	}
}

const getUserIdCached = cache(async () => {
	'use server'
	if ((await getUserId()) != null) {
		throw redirect('/') as unknown
	}
	return null
}, 'userId')

export const route = {
	preload() {
		void getUserIdCached()
	},
} satisfies RouteDefinition

interface ValidationError {
	message: string
	fieldErrors?: {
		username?: string
	}
}

const registering = action(async (form: FormData) => {
	'use server'
	const username = form.get('username')
	const redirectTo = form.get('redirectTo') ?? '/'
	if (typeof username !== 'string' || typeof redirectTo !== 'string') {
		throw new Error(`Form not submitted correctly.`)
	}
	const fieldErrors = {
		username: await validateUsername(username),
	}
	if (Object.values(fieldErrors).some(Boolean)) {
		throw {
			message: `Username is invalid`,
			fieldErrors,
		} satisfies ValidationError as unknown
	}
	const request = getRequestEvent()?.request
	if (request == null) return redirect('/error') // medTODO needs a page
	const email = await getInfo(request)
	if (email == null) return redirect('/error') // medTODO needs a page
	await registerUser(username, email)
	return await createUserSession(username, redirectTo)
})

export default function RegisterUsername(props: RouteSectionProps) {
	const isRegistering = useSubmission(registering)
	const error = () => isRegistering.error as undefined | ValidationError
	return (
		<main>
			<h1>Register Username</h1>
			<form action={registering} method='post'>
				<input
					type='hidden'
					name='redirectTo'
					value={props.params.redirectTo ?? '/'}
				/>
				<div>
					<label for='username-input'>Username</label>
					<input id='username-input' name='username' />
				</div>
				<Show when={error()?.fieldErrors?.username}>
					<p role='alert'>{error()!.fieldErrors!.username}</p>
				</Show>
				<Show when={error()}>
					<p role='alert' id='error-message'>
						{error()!.message}
					</p>
				</Show>
				<button disabled={isRegistering.pending} type='submit'>
					Register
				</button>
			</form>
			<h2>
				Until further notice, the database will be deleted often and without
				warning.
			</h2>
			<div>
				Usernames are case insensitive, yet case preserving. For example, if you
				choose the username <code>AlexErrant</code>, it will be displayed as{' '}
				<code>AlexErrant</code>, but links like{' '}
				<A href='/u/alexerrant'>https://pentive.com/u/alexerrant</A> will work.
				Usernames are not modifiable after creation, so make sure the casing is
				correct!
			</div>
			<div>
				If you've changed your email and already have a Pentive account, contact
				support.
			</div>
		</main>
	)
}
