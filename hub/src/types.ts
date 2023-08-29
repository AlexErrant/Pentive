export interface IComment {
	user: string
	timeAgo: string
	content: string
	comments: IComment[]
}

export interface IStory {
	id: string
	points: string
	url: string
	title: string
	domain: string
	type: string
	timeAgo: string
	user: string
	commentsCount: number
	comments: IComment[]
}
