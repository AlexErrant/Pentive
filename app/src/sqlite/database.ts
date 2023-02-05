export interface Note {
  id: Buffer | null;
  templateId: Buffer | null;
  pushId: Buffer | null;
  pushTemplateId: Buffer | null;
  push: string | null;
  ankiNoteId: string | null;
  created: string | null;
  modified: string | null;
  tags: string | null;
  fieldValues: string | null;
}

export interface Template {
  id: Buffer | null;
  pushId: Buffer | null;
  push: string | null;
  name: string | null;
  css: string | null;
  fields: string | null;
  created: string | null;
  modified: string | null;
  templateType: string | null;
}

export interface DB {
  note: Note;
  template: Template;
}
