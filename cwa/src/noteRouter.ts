import {
  commentText,
  createRemoteNote,
  editRemoteNote,
  noteCommentId,
  remoteNoteId,
} from "shared"
import { z } from "zod"
import { authedProcedure } from "./trpc"
import {
  editNotes,
  insertNoteChildComment,
  insertNoteComment,
  insertNotes,
  subscribeToNote,
} from "shared-edge"

export const noteRouter = {
  createNote: authedProcedure
    .input(z.array(createRemoteNote).min(1))
    .mutation(async ({ input, ctx }) => {
      const remoteIdByLocal = await insertNotes(ctx.user, input)
      return remoteIdByLocal
    }),
  insertNoteComment: authedProcedure
    .input(z.object({ noteId: remoteNoteId, text: commentText }))
    .mutation(async ({ input, ctx }) => {
      await insertNoteComment(input.noteId, input.text, ctx.user)
    }),
  insertNoteChildComment: authedProcedure
    .input(z.object({ parentCommentId: noteCommentId, text: commentText }))
    .mutation(async ({ input, ctx }) => {
      await insertNoteChildComment(input.parentCommentId, input.text, ctx.user)
    }),
  subscribeToNote: authedProcedure
    .input(remoteNoteId)
    .mutation(async ({ input, ctx }) => {
      await subscribeToNote(ctx.user, input)
    }),
  editNote: authedProcedure
    .input(z.array(editRemoteNote).min(1))
    .mutation(async ({ input, ctx }) => {
      await editNotes(ctx.user, input)
    }),
}
