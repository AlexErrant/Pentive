import { createResource, type Resource } from 'solid-js'

async function sleep(ms: number): Promise<unknown> {
	return await new Promise((resolve) => setTimeout(resolve, ms))
}

function HomeData(): Resource<number> {
	const [age] = createResource(
		async () => {
			await sleep(500)
			return 18
		},
		{
			initialValue: 2,
		},
	)
	return age
}

export default HomeData
