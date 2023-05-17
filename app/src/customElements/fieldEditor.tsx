import { type VoidComponent } from "solid-js"

export const FieldEditor: VoidComponent<{
  readonly field: string
  readonly value: string
}> = (props) => {
  return (
    <>
      <div>{props.field}</div>
      <div>{props.value}</div>
    </>
  )
}
