import type { Component } from 'solid-js'
import '@github/relative-time-element'

const RelativeTime: Component<{
	date: Date
}> = (props) => {
	return (
		<relative-time prop:date={props.date}>
			<time
				datetime={props.date.toISOString()}
				title={props.date.toISOString()}
			>
				{props.date.toLocaleDateString()}
			</time>
		</relative-time>
	)
}

export default RelativeTime
