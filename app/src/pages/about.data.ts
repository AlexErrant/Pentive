import { createResource, type Resource } from 'solid-js'

async function wait<T>(ms: number, data: T): Promise<T> {
	return await new Promise((resolve) => setTimeout(resolve, ms, data))
}

function random(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min
}

async function fetchName(): Promise<string> {
	return await wait(random(500, 1000), 'Solid')
}

function AboutData(): Resource<string> {
	const [data] = createResource(fetchName)

	return data
}

export default AboutData
