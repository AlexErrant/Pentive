export interface CommentDefinition {
	user: string
	// eslint-disable-next-line @typescript-eslint/naming-convention
	time_ago: string
	content: string
	comments: CommentDefinition[]
}

export interface StoryDefinition {
	id: string
	points: string
	url: string
	title: string
	domain: string
	type: string
	// eslint-disable-next-line @typescript-eslint/naming-convention
	time_ago: string
	user: string
	// eslint-disable-next-line @typescript-eslint/naming-convention
	comments_count: number
	comments: CommentDefinition[]
}

export interface UserDefinition {
	error: string
	id: string
	created: string
	karma: number
	about: string
}

export type StoryTypes = 'top' | 'new' | 'show' | 'ask' | 'job'
