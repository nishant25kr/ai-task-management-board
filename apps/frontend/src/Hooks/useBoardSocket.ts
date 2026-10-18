import { useCallback, useEffect, useRef, useState } from "react";
import type { Board, Repository, Section, Task, User } from "@/types";
import { WS_URL } from "../config";

type RequestResult = {
    requestId: string;
    section: Section;
};

type RequestError = {
    requestId: string;
    message: string;
};

type BoardSocketState = {
    user?: User;
    boardId: string;
    tasks: Task[];
    users: User[];
    sections: Section[];
    boards: Board[];
    repository: Repository | null;
    loading: boolean;
    changingBoard: boolean;
    deletingSections: Record<string, string>;
    sectionDeleteErrors: Record<string, string>;
    sectionCreateResult: RequestResult | null;
    sectionCreateError: RequestError | null;
    error: string | null;
};

type IncomingMessage = {
    type: string;
    payload: Record<string, unknown>;
};

const initialState: BoardSocketState = {
    boardId: "",
    tasks: [],
    users: [],
    sections: [],
    boards: [],
    repository: null,
    loading: true,
    changingBoard: false,
    deletingSections: {},
    sectionDeleteErrors: {},
    sectionCreateResult: null,
    sectionCreateError: null,
    error: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUser(value: unknown): value is User {
    return isRecord(value) && typeof value.id === "string" && typeof value.username === "string";
}

function isTask(value: unknown): value is Task {
    return isRecord(value)
        && typeof value.id === "string"
        && typeof value.title === "string"
        && typeof value.sectionId === "string";
}

function isSection(value: unknown): value is Section {
    return isRecord(value) && typeof value.id === "string" && typeof value.title === "string";
}

function isBoard(value: unknown): value is Board {
    return isRecord(value) && typeof value.id === "string" && typeof value.title === "string";
}

function isRepository(value: unknown): value is Repository {
    return isRecord(value)
        && typeof value.id === "string"
        && typeof value.githubId === "string"
        && typeof value.owner === "string"
        && typeof value.name === "string"
        && typeof value.defaultBranch === "string";
}

function parseMessage(data: unknown): IncomingMessage | null {
    try {
        const parsed: unknown = JSON.parse(String(data));
        if (!isRecord(parsed) || typeof parsed.type !== "string" || !isRecord(parsed.payload)) {
            return null;
        }
        return { type: parsed.type, payload: parsed.payload };
    } catch {
        return null;
    }
}

function stringField(payload: Record<string, unknown>, key: string): string | null {
    return typeof payload[key] === "string" ? payload[key] : null;
}

function validList<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
    return Array.isArray(value) ? value.filter(guard) : [];
}

export function useBoardSocket(organizationId?: string) {
    const [state, setState] = useState(initialState);
    const stateRef = useRef(state);
    const socketRef = useRef<WebSocket | null>(null);
    const pendingSectionCreateRef = useRef<string | null>(null);
    const pendingSectionDeletesRef = useRef<Record<string, string>>({});
    const pendingTaskCreatesRef = useRef(new Set<string>());
    const pendingBoardChangesRef = useRef(new Set<string>());

    const updateState = useCallback((update: (current: BoardSocketState) => BoardSocketState) => {
        const nextState = update(stateRef.current);
        stateRef.current = nextState;
        setState(nextState);
    }, []);

    const send = useCallback((type: string, payload: Record<string, unknown>) => {
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return false;
        socket.send(JSON.stringify({ type, payload }));
        return true;
    }, []);

    const setError = useCallback((error: string | null) => {
        updateState(current => ({ ...current, error }));
    }, [updateState]);

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token || !organizationId) return;

        let active = true;
        updateState(() => ({ ...initialState }));
        pendingSectionCreateRef.current = null;
        pendingSectionDeletesRef.current = {};
        pendingTaskCreatesRef.current.clear();
        pendingBoardChangesRef.current.clear();
        const socket = new WebSocket(WS_URL);
        socketRef.current = socket;

        socket.onopen = () => {
            if (!active) return;
            socket.send(JSON.stringify({
                type: "join",
                payload: { token, organizationId },
            }));
        };

        socket.onmessage = event => {
            if (!active) return;
            const message = parseMessage(event.data);
            if (!message) {
                setError("Received an invalid message from the board server.");
                return;
            }

            const { payload } = message;
            switch (message.type) {
                case "init-state": {
                    const boards = validList(payload.boards, isBoard);
                    const sections = validList(payload.sections, isSection);
                    const tasks = validList(payload.issues, isTask);
                    const users = validList(payload.users, isUser);
                    const repository = payload.repository === null || payload.repository === undefined
                        ? null
                        : isRepository(payload.repository) ? payload.repository : null;

                    updateState(current => ({
                        ...current,
                        user: isUser(payload.user) ? payload.user : undefined,
                        boardId: stringField(payload, "boardId") ?? "",
                        boards,
                        sections,
                        tasks,
                        users,
                        repository,
                        loading: false,
                        changingBoard: false,
                        deletingSections: {},
                        sectionDeleteErrors: {},
                        sectionCreateResult: null,
                        sectionCreateError: null,
                        error: null,
                    }));
                    break;
                }
                case "update-sections": {
                    const boardId = stringField(payload, "boardId");
                    const requestId = stringField(payload, "requestId");
                    if (requestId) pendingBoardChangesRef.current.delete(requestId);
                    pendingSectionCreateRef.current = null;
                    pendingSectionDeletesRef.current = {};
                    pendingTaskCreatesRef.current.clear();
                    pendingBoardChangesRef.current.clear();
                    updateState(current => ({
                        ...current,
                        boardId: boardId ?? current.boardId,
                        sections: validList(payload.sections, isSection),
                        tasks: validList(payload.issues, isTask),
                        repository: payload.repository === null || payload.repository === undefined
                            ? null
                            : isRepository(payload.repository) ? payload.repository : null,
                        users: validList(payload.users, isUser),
                        loading: false,
                        changingBoard: false,
                        deletingSections: {},
                        sectionDeleteErrors: {},
                        sectionCreateResult: null,
                        sectionCreateError: null,
                        error: null,
                    }));
                    break;
                }
                case "create-section":
                case "create-section-success": {
                    const section = payload.section;
                    if (!isSection(section)) break;
                    const eventBoardId = stringField(payload, "boardId");
                    if (eventBoardId && eventBoardId !== stateRef.current.boardId) break;
                    const requestId = stringField(payload, "requestId");
                    if (message.type === "create-section-success" && requestId) {
                        pendingSectionCreateRef.current = null;
                        updateState(current => ({
                            ...current,
                            sections: current.sections.some(item => item.id === section.id)
                                ? current.sections
                                : [...current.sections, section],
                            sectionCreateResult: { requestId, section },
                        }));
                    } else {
                        updateState(current => ({
                            ...current,
                            sections: current.sections.some(item => item.id === section.id)
                                ? current.sections
                                : [...current.sections, section],
                        }));
                    }
                    break;
                }
                case "create-task": {
                    const eventBoardId = stringField(payload, "boardId");
                    if (eventBoardId && eventBoardId !== stateRef.current.boardId) break;
                    const task = {
                        id: stringField(payload, "id"),
                        title: stringField(payload, "title"),
                        sectionId: stringField(payload, "sectionId"),
                    };
                    if (!task.id || !task.title || !task.sectionId) break;
                    const createdTask: Task = {
                        id: task.id,
                        title: task.title,
                        sectionId: task.sectionId,
                    };
                    updateState(current => ({
                        ...current,
                        tasks: current.tasks.some(item => item.id === task.id)
                            ? current.tasks
                            : [...current.tasks, createdTask],
                    }));
                    break;
                }
                case "create-task-success": {
                    const temporaryId = stringField(payload, "temporaryId");
                    const permanentId = stringField(payload, "permanentId");
                    const requestId = stringField(payload, "requestId") ?? temporaryId;
                    if (!temporaryId || !permanentId) break;
                    const eventBoardId = stringField(payload, "boardId");
                    if (eventBoardId && eventBoardId !== stateRef.current.boardId) break;
                    pendingTaskCreatesRef.current.delete(requestId ?? temporaryId);
                    updateState(current => ({
                        ...current,
                        tasks: current.tasks.map(task =>
                            task.id === temporaryId ? { ...task, id: permanentId } : task
                        ),
                    }));
                    break;
                }
                case "update-issue":
                case "move-task-success": {
                    const issueId = stringField(payload, "issueId");
                    const updatedSection = stringField(payload, "updatedSection");
                    const eventBoardId = stringField(payload, "boardId");
                    if (eventBoardId && eventBoardId !== stateRef.current.boardId) break;
                    if (!issueId || !updatedSection) break;
                    updateState(current => ({
                        ...current,
                        tasks: current.tasks.map(task =>
                            task.id === issueId ? { ...task, sectionId: updatedSection } : task
                        ),
                    }));
                    break;
                }
                case "delete-issue":
                case "delete-task-success": {
                    const issueId = stringField(payload, "issueId");
                    const eventBoardId = stringField(payload, "boardId");
                    if (eventBoardId && eventBoardId !== stateRef.current.boardId) break;
                    if (!issueId) break;
                    updateState(current => ({
                        ...current,
                        tasks: current.tasks.filter(task => task.id !== issueId),
                    }));
                    break;
                }
                case "delete-section":
                case "delete-section-success": {
                    const sectionId = stringField(payload, "sectionId");
                    const requestId = stringField(payload, "requestId");
                    const eventBoardId = stringField(payload, "boardId");
                    if (eventBoardId && eventBoardId !== stateRef.current.boardId) break;
                    if (!sectionId) break;
                    if (requestId) delete pendingSectionDeletesRef.current[sectionId];
                    updateState(current => {
                        const deletingSections = { ...current.deletingSections };
                        const sectionDeleteErrors = { ...current.sectionDeleteErrors };
                        delete deletingSections[sectionId];
                        delete sectionDeleteErrors[sectionId];
                        return {
                            ...current,
                            sections: current.sections.filter(section => section.id !== sectionId),
                            deletingSections,
                            sectionDeleteErrors,
                        };
                    });
                    break;
                }
                case "user-joined": {
                    if (!isUser(payload)) break;
                    updateState(current => ({
                        ...current,
                        users: current.users.some(user => user.id === payload.id)
                            ? current.users
                            : [...current.users, payload],
                    }));
                    break;
                }
                case "user-left": {
                    const userId = stringField(payload, "id");
                    if (!userId) break;
                    updateState(current => ({
                        ...current,
                        users: current.users.filter(user => user.id !== userId),
                    }));
                    break;
                }
                case "error": {
                    const requestId = stringField(payload, "requestId");
                    const messageText = stringField(payload, "message") ?? "Board request failed.";
                    if (requestId && pendingSectionCreateRef.current === requestId) {
                        pendingSectionCreateRef.current = null;
                        updateState(current => ({
                            ...current,
                            sectionCreateError: { requestId, message: messageText },
                        }));
                    } else if (requestId) {
                        const sectionId = Object.keys(pendingSectionDeletesRef.current)
                            .find(id => pendingSectionDeletesRef.current[id] === requestId);
                        if (sectionId) {
                            delete pendingSectionDeletesRef.current[sectionId];
                            updateState(current => {
                                const deletingSections = { ...current.deletingSections };
                                delete deletingSections[sectionId];
                                return {
                                    ...current,
                                    deletingSections,
                                    sectionDeleteErrors: {
                                        ...current.sectionDeleteErrors,
                                        [sectionId]: messageText,
                                    },
                                };
                            });
                            break;
                        }
                    }

                    if (requestId && pendingTaskCreatesRef.current.has(requestId)) {
                        pendingTaskCreatesRef.current.delete(requestId);
                        const temporaryId = requestId;
                        updateState(current => ({
                            ...current,
                            tasks: current.tasks.filter(task => task.id !== temporaryId),
                            error: messageText,
                        }));
                        break;
                    }
                    if (requestId) {
                        const boardChangeFailed = pendingBoardChangesRef.current.has(requestId);
                        pendingBoardChangesRef.current.delete(requestId);
                        updateState(current => ({
                            ...current,
                            loading: false,
                            changingBoard: boardChangeFailed ? false : current.changingBoard,
                            error: messageText,
                        }));
                    } else {
                        updateState(current => ({
                            ...current,
                            loading: false,
                            error: messageText,
                        }));
                    }
                    break;
                }
                default:
                    break;
            }
        };

        socket.onerror = () => {
            if (active) {
                updateState(current => ({
                    ...current,
                    loading: false,
                    changingBoard: false,
                    error: "Unable to connect to the board server.",
                }));
            }
        };
        socket.onclose = event => {
            if (socketRef.current === socket) socketRef.current = null;
            if (active) {
                updateState(current => ({
                    ...current,
                    loading: false,
                    changingBoard: false,
                    error: event.wasClean ? current.error : "Connection to the board server was closed.",
                }));
            }
        };

        return () => {
            active = false;
            socket.close();
            if (socketRef.current === socket) socketRef.current = null;
        };
    }, [organizationId, setError, updateState]);

    const addTask = useCallback((sectionId: string, title: string, description: string) => {
        if (!title.trim() || !description.trim()) {
            setError("Enter a task title and description.");
            return false;
        }
        const temporaryId = crypto.randomUUID();
        if (!send("create-task", {
            requestId: temporaryId,
            temporaryId,
            title: title.trim(),
            boardId: stateRef.current.boardId,
            createdBy: stateRef.current.user?.id,
            description: description.trim(),
            sectionId,
        })) {
            setError("The board connection is not ready. Try again.");
            return false;
        }

        pendingTaskCreatesRef.current.add(temporaryId);
        updateState(current => ({
            ...current,
            error: null,
            tasks: [...current.tasks, { id: temporaryId, title: title.trim(), sectionId }],
        }));
        return true;
    }, [send, setError, updateState]);

    const moveTask = useCallback((issueId: string, direction: -1 | 1) => {
        const current = stateRef.current;
        const task = current.tasks.find(item => item.id === issueId);
        if (!task) return;
        const currentIndex = current.sections.findIndex(section => section.id === task.sectionId);
        const destination = current.sections[currentIndex + direction];
        if (!destination) return;

        const requestId = crypto.randomUUID();
        if (!send("move-task", {
            requestId,
            issueId,
            boardId: current.boardId,
            updatedSection: destination.id,
        })) {
            setError("The board connection is not ready. Try again.");
            return;
        }
        setError(null);
    }, [send, setError]);

    const addSection = useCallback((title: string, requestId: string) => {
        if (!title.trim()) return false;
        if (!send("add-section", {
            requestId,
            title: title.trim(),
            boardId: stateRef.current.boardId,
        })) return false;
        pendingSectionCreateRef.current = requestId;
        updateState(current => ({ ...current, sectionCreateError: null, error: null }));
        return true;
    }, [send, updateState]);

    const deleteSection = useCallback((sectionId: string, requestId: string) => {
        if (!send("delete-section", {
            requestId,
            sectionId,
            boardId: stateRef.current.boardId,
            organizationId,
        })) {
            updateState(current => ({
                ...current,
                sectionDeleteErrors: {
                    ...current.sectionDeleteErrors,
                    [sectionId]: "The board connection is not ready. Try again.",
                },
            }));
            return false;
        }
        pendingSectionDeletesRef.current[sectionId] = requestId;
        updateState(current => {
            const sectionDeleteErrors = { ...current.sectionDeleteErrors };
            delete sectionDeleteErrors[sectionId];
            return {
                ...current,
                deletingSections: { ...current.deletingSections, [sectionId]: requestId },
                sectionDeleteErrors,
                error: null,
            };
        });
        return true;
    }, [organizationId, send, updateState]);

    const deleteTask = useCallback((issueId: string) => {
        const requestId = crypto.randomUUID();
        if (!send("delete-task", { requestId, issueId, boardId: stateRef.current.boardId })) {
            setError("The board connection is not ready. Try again.");
            return;
        }
        setError(null);
    }, [send, setError]);

    const changeBoard = useCallback((boardId: string) => {
        const currentBoardId = stateRef.current.boardId;
        if (boardId === currentBoardId || stateRef.current.changingBoard) return;
        const requestId = crypto.randomUUID();
        updateState(current => ({ ...current, changingBoard: true, error: null }));
        if (!send("change-board", { requestId, currentBoardId, newBoardId: boardId })) {
            updateState(current => ({
                ...current,
                changingBoard: false,
                error: "The board connection is not ready. Try again.",
            }));
            return;
        }
        pendingBoardChangesRef.current.add(requestId);
    }, [send, updateState]);

    const boardCreated = useCallback((board: Board) => {
        updateState(current => ({
            ...current,
            boards: current.boards.some(item => item.id === board.id)
                ? current.boards
                : [...current.boards, board],
        }));
        changeBoard(board.id);
    }, [changeBoard, updateState]);

    return {
        ...state,
        addTask,
        addSection,
        changeBoard,
        deleteSection,
        deleteTask,
        moveTask,
        boardCreated,
        clearError: () => setError(null),
    };
}
