import z from "zod"

const UserSchema = z.object({
    id: z.string().min(1),
    username: z.string().min(1).max(100)
})

const JoinRoomSchema = z.object({
    token: z.string().trim().min(1).max(4096),
    organizationId: z.string().trim().min(1).max(128),
    boardId: z.string().trim().min(1).max(128).optional(),
})

const ChangeBoardSchema = z.object({
    requestId: z.string().trim().min(1).max(128),
    currentBoardId: z.string().trim().max(128).optional(),
    newBoardId: z.string().trim().min(1).max(128),
}).passthrough()

const CreateTaskSchema = z.object({
    requestId: z.string().trim().min(1).max(128),
    temporaryId: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(200),
    boardId: z.string().trim().min(1).max(128),
    createdBy: z.string().trim().min(1).max(128).optional(),
    description: z.string().trim().max(2000).default(""),
    sectionId: z.string().trim().min(1).max(128),
}).passthrough()

const CreateSectionSchema = z.object({
    requestId: z.string().trim().min(1).max(128),
    title: z.string().trim().min(1).max(100),
    boardId: z.string().trim().min(1).max(128),
}).passthrough()

const CreateBoardSchema = z.object({
    title: z.string().trim().min(1).max(100),
    organizationId: z.string().trim().min(1).max(128),
}).passthrough()

const DeleteSectionSchema = z.object({
    requestId: z.string().trim().min(1).max(128),
    sectionId: z.string().trim().min(1).max(128),
    boardId: z.string().trim().min(1).max(128),
    organizationId: z.string().trim().min(1).max(128)
}).passthrough()

const MoveTaskSchema = z.object({
    requestId: z.string().trim().min(1).max(128),
    issueId: z.string().trim().min(1).max(128),
    updatedSection: z.string().trim().min(1).max(128),
    boardId: z.string().trim().min(1).max(128),
}).passthrough()

const DeleteTaskSchema = z.object({
    requestId: z.string().trim().min(1).max(128),
    issueId: z.string().trim().min(1).max(128),
    boardId: z.string().trim().min(1).max(128),
}).passthrough()

export {
    JoinRoomSchema,
    ChangeBoardSchema,
    CreateTaskSchema,
    CreateSectionSchema,
    CreateBoardSchema,
    DeleteSectionSchema,
    MoveTaskSchema,
    DeleteTaskSchema
}