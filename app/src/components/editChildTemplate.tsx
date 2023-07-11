import { type VoidComponent } from "solid-js"
import { type ChildTemplate } from "shared"

const EditChildTemplate: VoidComponent<{
  template: ChildTemplate
  setTemplate: (
    key: keyof ChildTemplate,
    val: ChildTemplate[keyof ChildTemplate]
  ) => void
}> = (props) => {
  return (
    <input
      class="w-full border"
      type="text"
      value={props.template.name}
      onInput={(e) => {
        props.setTemplate("name", e.currentTarget.value)
      }}
    />
  )
}

export default EditChildTemplate
