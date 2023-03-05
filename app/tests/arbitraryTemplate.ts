import fc from "fast-check"

import { Ord, RemoteTemplateId, TemplateId } from "../src/domain/ids"
import { Field, Template } from "../src/domain/template"
import {
  arbitraryUlid,
  reasonableDates,
  recordWithOptionalFields,
} from "./arbitrary"
import { ChildTemplate, NookId, TemplateType } from "shared"

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
    id: fc.integer().map((x) => x as Ord),
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
    remotes: fc
      .dictionary(fc.string(), arbitraryUlid<RemoteTemplateId>())
      .map(
        (x) => new Map(Object.entries(x) as Array<[NookId, RemoteTemplateId]>)
      ),
  },
  {}
)
