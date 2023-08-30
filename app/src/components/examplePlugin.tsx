import { type Setter, type VoidComponent } from 'solid-js'
import { Dynamic } from 'solid-js/web'

const ExamplePlugin: VoidComponent<{
	count: number
	setCount: Setter<number>
	child: VoidComponent<{ count: number; setCount: Setter<number> }>
}> = (props) => {
	return (
		<div class='border-gray-900 m-1 rounded-lg border p-1'>
			<h1>Default Plugin Placeholder</h1>
			<button
				class='border-gray-900 mx-2 rounded-lg border px-2'
				onClick={() => props.setCount(props.count - 2)}
			>
				-2
			</button>
			<output>Count: {props.count}</output>
			<button
				class='border-gray-900 mx-2 rounded-lg border px-2'
				onClick={() => props.setCount(props.count + 2)}
			>
				+2
			</button>
			<Dynamic
				component={props.child}
				count={props.count}
				setCount={props.setCount}
			/>
		</div>
	)
}

export default ExamplePlugin
