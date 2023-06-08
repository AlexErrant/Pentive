// @ts-nocheck

import {
  template as _$template,
  delegateEvents as _$delegateEvents,
  insert as _$insert,
} from "solid-js/web"
const _tmpl$ = /* #__PURE__ */ _$template(
  `<div class="border rounded-lg p-1 m-1 border-gray-900"><h1>My Plugin Baby</h1><button class="border rounded-lg px-2 mx-2 border-gray-900">-</button><output>Negative Count: </output><button class="border rounded-lg px-2 mx-2 border-gray-900">+`
)
export const PluginChild = (props) => {
  return (() => {
    const _el$ = _tmpl$()
    const _el$2 = _el$.firstChild
    const _el$3 = _el$2.nextSibling
    const _el$4 = _el$3.nextSibling
    const _el$6 = _el$4.nextSibling
    _el$3.$$click = () => props.setCount(props.count - 1)
    _$insert(_el$4, () => props.count * -1, null)
    _el$6.$$click = () => props.setCount(props.count + 1)
    return _el$
  })()
}
_$delegateEvents(["click"])
