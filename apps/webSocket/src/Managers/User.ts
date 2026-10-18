import type WebSocket from "ws";
import jwt from "jsonwebtoken";
import { prisma } from "@repo/db";
import { UserManager } from "./UserManager";
import { IssueManager } from "./IssueManager";
import { jwtSecret } from "../../config.ts";
import {
    ChangeBoardSchema,
    CreateBoardSchema,
    CreateSectionSchema,
    CreateTaskSchema,
    DeleteSectionSchema,
    DeleteTaskSchema,
    JoinRoomSchema,
    MoveTaskSchema,
} from "../utils/PayloadSchema.ts";

export class User {
    public id!: string;
    public username!: string;
    public ws: WebSocket;
    public joinedBoards: Set<string>;

    constructor(ws: WebSocket) {
        this.ws = ws;
        this.joinedBoards = new Set();
        this.initHandler();
    }

    private sendError(message: string, requestId?: string) {
        this.ws.send(
            JSON.stringify({
                type: "error",
                payload: { message, requestId },
            })
        );
    }

    private async ensureOrganizationMembership(userId: string, organizationId: string) {
        const membership = await prisma.membership.findFirst({
            where: {
                userId,
                organisationId: organizationId,
            },
        });

        if (!membership) {
            throw new Error("Forbidden");
        }

        return membership;
    }

    private async ensureBoardMembership(userId: string, boardId: string) {
        const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: { id: true, organisationId: true },
        });

        if (!board) {
            throw new Error("Board not found");
        }

        const membership = await this.ensureOrganizationMembership(userId, board.organisationId);
        return { board, membership };
    }

    private async ensureIssueInBoard(issueId: string, boardId: string) {
        const issue = await prisma.issue.findFirst({
            where: {
                id: issueId,
                boardId,
            },
        });

        if (!issue) {
            throw new Error("Issue not found for this board");
        }

        return issue;
    }

    private async ensureSectionInBoard(sectionId: string, boardId: string) {
        const section = await prisma.section.findFirst({
            where: {
                id: sectionId,
                boardId,
            },
        });

        if (!section) {
            throw new Error("Section not found for this board");
        }

        return section;
    }

    private async ensureBoardAdmin(organisationId: string, userId: string) {
        const membership = await prisma.membership.findFirst({
            where: {
                userId: userId,
                organisationId: organisationId,
                role: "ADMIN"
            }
        })
        console.log("memshiop",membership)
        if(!membership){
            throw new Error("Not authorized for this request");
            return;
        }
    }

    initHandler() {
        this.ws.on("message", async (data) => {
            let requestId: string | undefined;
            try {
                const parsedData = JSON.parse(data.toString());
                requestId = typeof parsedData.payload?.requestId === "string"
                    ? parsedData.payload.requestId
                    : undefined;
                switch (parsedData.type) {
                    case "join": {
                        const isValid = JoinRoomSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for join");
                            return;
                        }

                        const token = parsedData.payload.token;
                        const organizationId = parsedData.payload.organizationId;
                        const requestedBoardId = parsedData.payload.boardId;
                        let user;
                        try {
                            user = jwt.verify(token, jwtSecret as string);
                        } catch {
                            this.sendError("Invalid token");
                            return;
                        }

                        this.id = (user as jwt.JwtPayload).userId;
                        const userDetail = await prisma.user.findUnique({
                            where: { id: this.id },
                        });

                        if (!userDetail) {
                            this.sendError("User not found");
                            return;
                        }

                        await this.ensureOrganizationMembership(this.id, organizationId);

                        const boards = await prisma.board.findMany({
                            where: { organisationId: organizationId },
                        });

                        if (!boards.length) {
                            this.sendError("No boards found for this organization");
                            return;
                        }

                        const validBoardIds = new Set(boards.map((board) => board.id));
                        const boardId = requestedBoardId && validBoardIds.has(requestedBoardId)
                            ? requestedBoardId
                            : boards[0]?.id;

                        if (!boardId) {
                            this.sendError("No boards found for this organization");
                            return;
                        }

                        this.joinedBoards.clear();
                        this.joinedBoards.add(boardId);

                        const repo = await prisma.repository.findFirst({
                            where: { boardId },
                        });
                        const sections = await prisma.section.findMany({
                            where: { boardId },
                            select: { id: true, title: true },
                        });
                        const issues = await prisma.issue.findMany({
                            where: { boardId },
                        });

                        this.username = userDetail.username;
                        this.id = userDetail.id;
                        UserManager.getInstance().addUser(boardId, this);
                        issues.forEach((issue) => {
                            IssueManager.getInstance().addTask(boardId, issue);
                        });

                        this.ws.send(
                            JSON.stringify({
                                type: "init-state",
                                payload: {
                                    user: {
                                        id: this.id,
                                        username: this.username,
                                    },
                                    boards,
                                    sections,
                                    issues,
                                    boardId,
                                    users: UserManager.getInstance().getUsers(boardId),
                                    repository: repo ?? null,
                                },
                            })
                        );
                        break;
                    }

                    case "change-board": {
                        const isValid = ChangeBoardSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for change-board", requestId);
                            return;
                        }

                        if (!this.id) {
                            this.sendError("Unauthorized", requestId);
                            return;
                        }

                        const { newBoardId, currentBoardId } = isValid.data;
                        await this.ensureBoardMembership(this.id, newBoardId);

                        if (currentBoardId && currentBoardId !== newBoardId) {
                            UserManager.getInstance().RemoveUser(currentBoardId, this);
                            this.joinedBoards.delete(currentBoardId);
                        }

                        UserManager.getInstance().addUser(newBoardId, this);
                        this.joinedBoards.add(newBoardId);

                        const sectionsForBoard = await prisma.section.findMany({
                            where: { boardId: newBoardId },
                        });
                        const repo = await prisma.repository.findFirst({
                            where: { boardId: newBoardId },
                        });
                        const issuesForBoard = await prisma.issue.findMany({
                            where: { boardId: newBoardId },
                        });

                        issuesForBoard.forEach((issue) => {
                            IssueManager.getInstance().addTask(newBoardId, issue);
                        });

                        this.ws.send(
                            JSON.stringify({
                                type: "update-sections",
                                payload: {
                                    sections: sectionsForBoard,
                                    issues: issuesForBoard,
                                    repository: repo ?? null,
                                    boardId: newBoardId,
                                    users: UserManager.getInstance().getUsers(newBoardId),
                                    requestId,
                                },
                            })
                        );
                        break;
                    }

                    case "create-task": {
                        console.log("create-task", parsedData.payload);
                        const isValid = CreateTaskSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for create-task", requestId);
                            return;
                        }

                        if (!this.id) {
                            this.sendError("Unauthorized", requestId);
                            return;
                        }

                        const { title, description, boardId, sectionId, temporaryId } = isValid.data;

                        let newIssue;
                        try {
                            newIssue = await prisma.issue.create({
                                data: {
                                    title,
                                    description,
                                    boardId,
                                    sectionId,
                                    createdBy: this.id,
                                },
                            });

                        } catch (error: any) {
                            this.sendError(error.message, requestId)
                            return;
                        }

                        IssueManager.getInstance().addTask(boardId, newIssue);
                        UserManager.getInstance().broadcast(
                            boardId,
                            this,
                            JSON.stringify({
                                type: "create-task",
                                payload: {
                                    id: newIssue.id,
                                    title: newIssue.title,
                                    sectionId: newIssue.sectionId,
                                    boardId,
                                },
                            })
                        );
                        this.ws.send(
                            JSON.stringify({
                                type: "create-task-success",
                                payload: {
                                    temporaryId,
                                    permanentId: newIssue.id,
                                    requestId,
                                    boardId,
                                }
                            })
                        )
                        break;
                    }

                    case "update-section": {
                        const issueId = parsedData.payload.issueId;
                        const updatedSection = parsedData.payload.updatedSection;
                        const boardId = parsedData.payload.boardId;

                        if (!this.id) {
                            this.sendError("Unauthorized");
                            return;
                        }

                        await this.ensureBoardMembership(this.id, boardId);
                        await this.ensureIssueInBoard(issueId, boardId);
                        await this.ensureSectionInBoard(updatedSection, boardId);

                        try {
                            await prisma.issue.update({
                                where: { id: issueId },
                                data: { sectionId: updatedSection },
                            });
                        } catch (error: any) {
                            this.sendError(error.message || "Failed to update task section");
                            return;
                        }

                        IssueManager.getInstance().changeSection(boardId, issueId, updatedSection);
                        UserManager.getInstance().broadcast(
                            boardId,
                            this,
                            JSON.stringify({
                                type: "update-issue",
                                payload: { issueId, updatedSection, boardId },
                            })
                        );
                        break;
                    }

                    case "add-section": {
                        const isValid = CreateSectionSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for add-section", requestId);
                            return;
                        }

                        if (!this.id) {
                            this.sendError("Unauthorized", requestId);
                            return;
                        }

                        const { title, boardId } = isValid.data;
                        await this.ensureBoardMembership(this.id, boardId);

                        const createdSection = await prisma.section.create({
                            data: {
                                title,
                                boardId,
                                createdBy: this.id,
                            },
                        });

                        this.ws.send(
                            JSON.stringify({
                                type: "create-section-success",
                                payload: {
                                    requestId,
                                    section: createdSection,
                                    boardId,
                                },
                            })
                        );
                        UserManager.getInstance().broadcast(
                            boardId,
                            this,
                            JSON.stringify({
                                type: "create-section",
                                payload: {
                                    section: createdSection,
                                    boardId,
                                },
                            })
                        );
                        break;
                    }

                    case "delete-section": {
                        const isValid = DeleteSectionSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for delete-section", requestId);
                            return;
                        }

                        if (!this.id) {
                            this.sendError("Unauthorized", requestId);
                            return;
                        }

                        const { sectionId, boardId, organizationId } = isValid.data;
                        await this.ensureBoardMembership(this.id, boardId);
                        await this.ensureSectionInBoard(sectionId, boardId);
                        await this.ensureBoardAdmin(organizationId, this.id);
                        // console.log("hello after ther ensure admin");
                        try {
                            await prisma.section.delete({
                                where: { id: sectionId },
                            });
                        } catch (error: any) {
                            this.sendError(error.message || "Failed to delete section", requestId);
                            return;
                        }

                        this.ws.send(
                            JSON.stringify({
                                type: "delete-section-success",
                                payload: { sectionId, requestId, boardId }
                            })
                        )

                        UserManager.getInstance().broadcast(
                            boardId,
                            this,
                            JSON.stringify({
                                type: "delete-section",
                                payload: { sectionId, boardId },
                            })
                        );
                        break;
                    }

                    case "move-task": {
                        const isValid = MoveTaskSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for move-task", requestId);
                            return;
                        }

                        if (!this.id) {
                            this.sendError("Unauthorized", requestId);
                            return;
                        }

                        const { issueId, updatedSection, boardId } = isValid.data;
                        await this.ensureBoardMembership(this.id, boardId);
                        await this.ensureIssueInBoard(issueId, boardId);
                        await this.ensureSectionInBoard(updatedSection, boardId);

                        try {
                            await prisma.issue.update({
                                where: { id: issueId },
                                data: { sectionId: updatedSection },
                            });
                        } catch (error: any) {
                            this.sendError(error.message || "Failed to move task", requestId);
                            return;
                        }

                        IssueManager.getInstance().changeSection(boardId, issueId, updatedSection);
                        UserManager.getInstance().broadcast(
                            boardId,
                            this,
                            JSON.stringify({
                                type: "update-issue",
                                payload: { issueId, updatedSection, boardId },
                            })
                        );
                        this.ws.send(JSON.stringify({
                            type: "move-task-success",
                            payload: { requestId, issueId, updatedSection, boardId },
                        }));
                        break;
                    }

                    case "delete-task": {
                        const isValid = DeleteTaskSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for delete-task", requestId);
                            return;
                        }

                        if (!this.id) {
                            this.sendError("Unauthorized", requestId);
                            return;
                        }

                        const { issueId, boardId } = isValid.data;
                        await this.ensureBoardMembership(this.id, boardId);
                        await this.ensureIssueInBoard(issueId, boardId);

                        try {
                            await prisma.issue.delete({
                                where: { id: issueId },
                            });
                        } catch (error: any) {
                            this.sendError(error.message || "Failed to delete task", requestId);
                            return;
                        }

                        IssueManager.getInstance().deleteTask(boardId, issueId);
                        UserManager.getInstance().broadcast(
                            boardId,
                            this,
                            JSON.stringify({
                                type: "delete-issue",
                                payload: { issueId, boardId },
                            })
                        );
                        this.ws.send(JSON.stringify({
                            type: "delete-task-success",
                            payload: { requestId, issueId, boardId },
                        }));
                        break;
                    }

                    case "create-board": {
                        //todo: validate the req is made by admin
                        const isValid = CreateBoardSchema.safeParse(parsedData.payload);
                        if (!isValid.success) {
                            this.sendError("Invalid payload for create-board");
                            return;
                        }

                        if (!this.id) {
                            this.sendError("Unauthorized");
                            return;
                        }

                        const { title, organizationId } = parsedData.payload;
                        const membership = await this.ensureOrganizationMembership(this.id, organizationId);
                        
                        if (membership.role !== "ADMIN") {
                            this.sendError("Forbidden");
                            return;
                        }

                        const createdBoard = await prisma.board.create({
                            data: {
                                title,
                                organisationId: organizationId,
                            },
                        });

                        UserManager.getInstance().broadcast(
                            organizationId,
                            this,
                            JSON.stringify({
                                type: "create-board",
                                payload: {
                                    board: createdBoard,
                                    organizationId,
                                },
                            })
                        );
                        break;
                    }

                    default:
                        this.sendError(`Unknown message type: ${parsedData.type ?? "undefined"}`);
                }
            } catch (error: any) {
                this.sendError(error.message || "Unexpected error", requestId);
            }
        });

        this.ws.on("close", () => {
            for (const boardId of this.joinedBoards) {
                UserManager.getInstance().RemoveUser(boardId, this);
            }
            this.joinedBoards.clear();
        });
    }

    destroy() {
        // intentionally left empty as a lifecycle hook
    }

}