import { type Component } from 'solid-js'

// needs to handle string due to https://github.com/solidjs/solid-start/issues/768
const RelativeDate: Component<{ date: Date | string }> = (props) => {
	const date = () =>
		typeof props.date === 'string' ? new Date(props.date) : props.date

	return <span>{date().toLocaleString()}</span>
}

export default RelativeDate
