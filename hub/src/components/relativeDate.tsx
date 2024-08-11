import { type Component } from 'solid-js'

const RelativeDate: Component<{ date: Date }> = (props) => {
	return (
		<time datetime={props.date.toISOString()}>
			{props.date.toLocaleString()}
		</time>
	)
}

export default RelativeDate
