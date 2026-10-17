import { CreateBoard } from "./CreateBoard"
import type { Board, User } from "@/types";

export const BoardInfo = (
    { handleBoardCreated, changeBoard, boardId, boards, users }:
        {
            handleBoardCreated: (board: Board) => void,
            changeBoard: (id: string) => void,
            boardId: string,
            boards: Board[],
            users: User[]
        }
) => {
    return (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3  md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">Workspace</p>
                    <h1 className="text-2xl font-semibold text-slate-900">Board</h1>
                </div>

                <div className="flex items-center gap-3">
                    <CreateBoard onBoardCreated={handleBoardCreated} />
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <label htmlFor="board" className="sr-only">Choose board</label>
                        <select
                            id="board"
                            name="board"
                            onChange={(e) => changeBoard(e.target.value)}
                            value={boardId}
                            className="bg-transparent text-sm font-medium text-slate-700 outline-none"
                        >
                            {boards.map((item) => (
                                <option key={item.id} value={item.id}>{item.title}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-slate-500">Current board</p>
                        <h2 className="text-xl font-semibold text-slate-900">
                            {boards.find((board) => board.id === boardId)?.title || "Board"}
                        </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        {(users as Array<{ id: string; username: string }>).map((member) => (
                            <span
                                key={member.id}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700"
                            >
                                {member.username}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>

    )
}