import { setBody } from "./setBody"
import "./registerServiceWorker"
import { hubMessenger } from "./hubMessenger"

const i = await hubMessenger.renderBodyInput
setBody(i)
