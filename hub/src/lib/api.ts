import { query } from '@solidjs/router'
import type { StoryDefinition, StoryTypes, UserDefinition } from '~/types'

const story = (path: string) => `https://node-hnapi.herokuapp.com/${path}`
const user = (path: string) =>
	`https://hacker-news.firebaseio.com/v0/${path}.json`

async function fetchAPI<T>(path: string) {
	const url = path.startsWith('user') ? user(path) : story(path)

	const headers: Record<string, string> = { 'User-Agent': 'chrome' }

	const response = await fetch(url, { headers })
	const text = await response.text()
	try {
		return JSON.parse(text) as T
	} catch (e) {
		console.error(`Received from API: ${text}`)
		console.error(e)
		throw e
	}
}

const mapStories = {
	top: 'news',
	new: 'newest',
	show: 'show',
	ask: 'ask',
	job: 'jobs',
} as const

export const getStories = query(async (type: StoryTypes, page: number) => {
	'use server'
	return await fetchAPI<StoryDefinition[]>(`${mapStories[type]}?page=${page}`)
}, 'stories')

export const getStory = query(async (id: string) => {
	'use server'
	return await fetchAPI<StoryDefinition>(`item/${id}`)
}, 'story')

export const getUser = query(async (id: string) => {
	'use server'
	return await fetchAPI<UserDefinition>(`user/${id}`)
}, 'user')
