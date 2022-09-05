import fc from "fast-check"

import {
  ChildTemplateId,
  RemoteTemplateId,
  TemplateId,
} from "../src/domain/ids"
import {
  ChildTemplate,
  Field,
  Template,
  TemplateType,
} from "../src/domain/template"
import { reasonableDates, recordWithOptionalFields } from "./arbitrary"

const field = recordWithOptionalFields<Field>(
  {
    name: fc.string(),
  },
  {
    rightToLeft: fc.boolean(),
    sticky: fc.boolean(),
    private: fc.boolean(),
  }
)

const childTemplate = recordWithOptionalFields<ChildTemplate>(
  {
    id: fc.uuidV(4).map((x) => x as ChildTemplateId),
    name: fc.string(),
    front: fc.string(),
    back: fc.string(),
  },
  {
    shortFront: fc.string(),
    shortBack: fc.string(),
  }
)

const standardTemplateType = fc.record<TemplateType>({
  tag: fc.constant("standard"),
  templates: fc.array(childTemplate),
})

const clozeTemplateType = fc.record<TemplateType>({
  tag: fc.constant("cloze"),
  template: childTemplate,
})

const templateType = fc.oneof(standardTemplateType, clozeTemplateType)

export const template = recordWithOptionalFields<Template>(
  {
    id: fc.uuidV(4).map((x) => x as TemplateId),
    name: fc.string(),
    css: fc.string(),
    fields: fc.array(field),
    created: reasonableDates,
    modified: reasonableDates,
    templateType,
  },
  {
    pushId: fc.uuidV(4).map((x) => x as RemoteTemplateId),
    push: fc.constant(true),
  }
)
