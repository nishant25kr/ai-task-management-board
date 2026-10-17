import type { User, Task, Section, Board } from "@/types";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { CreateBoard } from "./CreateBoard";
import { ConnectRepository } from "./ConnectRepository";
import { AgentRunButton } from "./AgentRunButton";
import { Navbar } from "./Navbar";
import { WS_URL } from "../config";
import { BoardInfo } from "./BoardInfo";
import { SectionInfo } from "./SectionsInfo";

export const Issue = () => {
  const params = useParams();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const [user, setUser] = useState<User>()
  const [boardId, setBoardId] = useState<string>('');
  const [task, setTask] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true);
  const [changingBoard, setChangingBoard] = useState<boolean>(false);
  // const [newtask, setNewtask] = useState<string>('')
  const [description, setDescription] = useState<string>();
  const [organizationId, setOrganizationId] = useState<string>(params.organizationId || '')
  const [repository, setRepository] = useState<any | null>(null);
  const [deleteSectionLoading, setDeleteSectionLoading] = useState<boolean>(false);

  function addtask(sectionId: string, newtask : string,description : string) {
    if (!newtask.trim() || !wsRef.current || !description?.trim()) {
      alert("validation failed")
      return;
    }
    const temporiryId = crypto.randomUUID();
    wsRef.current?.send(
      JSON.stringify({
        type: 'create-task',
        payload: {
          temporaryId: temporiryId,
          title: newtask,
          boardId: boardId,
          createdBy: user?.id,
          description: description,
          sectionId: sectionId
        }
      })
    )
    setTask(prev => [...prev, { id: temporiryId, title: newtask, sectionId: sectionId }])
  }

  function moveForward(id: string) {
    const currentTask = task.find(item => item.id === id);
    const currentSectionIndex = sections.findIndex(
      section => section.id === currentTask?.sectionId
    );
    const nextSection = sections[currentSectionIndex + 1];

    if (!nextSection) return;

    setTask(prev => prev.map(item =>
      item.id === id ? { ...item, sectionId: nextSection.id } : item
    ));
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current?.send(
      JSON.stringify({
        type: 'move-task',
        payload: {
          issueId: id,
          boardId: boardId,
          updatedSection: nextSection?.id
        }
      })
    )
  }

  function moveBackward(id: string) {
    const currentTask = task.find(item => item.id === id);
    const currentSectionIndex = sections.findIndex(
      section => section.id === currentTask?.sectionId
    );
    const previousSection = sections[currentSectionIndex - 1];

    if (!previousSection) return;

    setTask(prev => prev.map(item =>
      item.id === id ? { ...item, sectionId: previousSection.id } : item
    ));
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current?.send(
      JSON.stringify({
        type: 'move-task',
        payload: {
          issueId: id,
          boardId: boardId,
          updatedSection: previousSection?.id
        }
      })
    )
  }

  function addSection() {
    if (!title.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current?.send(
      JSON.stringify({
        type: "add-section",
        payload: {
          title: title.trim(),
          boardId: boardId
        }
      })
    )
    setSections(prev => [...prev, { id: crypto.randomUUID(), title: title.trim() }])
    setTitle('');
  }

  function deleteSection(id: string) {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(
      JSON.stringify({
        type: "delete-section",
        payload: {
          sectionId: id,
          boardId: boardId,
          organizationId: organizationId
        }
      })
    )
    setDeleteSectionLoading(true)
    // setSections(prev => prev.filter(section => section.id !== id))
  }

  function changeBoard(id: string) {
    setChangingBoard(true)
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(
      JSON.stringify({
        type: 'change-board',
        payload: {
          currentBoardId: boardId,
          newBoardId: id,
          user: user
        }
      })
    )
    setBoardId(id)
  }

  function handleBoardCreated(board: Board) {
    setBoards(prev => [...prev, board]);
    changeBoard(board.id);
  }

  function deleteIssue(id: string) {
    if (!id) return;
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "delete-task",
            payload: {
              issueId: id,
              boardId: boardId
            }
          })
        )
      }
      setTask(issue => issue.find(i => i.id === id) ? (issue.filter(i => i.id !== id)) : (issue))
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    if (!boardId && boards[0]) setBoardId(boards[0].id)
  }, [boards, boardId])

  useEffect(() => {
    setChangingBoard(true)
    if (!localStorage.getItem("token") || !params.organizationId) {
      navigate("/auth/login");
      return;
    }
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'join',
        payload: {
          token: localStorage.getItem("token"),
          organizationId: params.organizationId
        }
      }))
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string);
      switch (msg.type) {
        case "init-state":
          setUser(msg.payload.user ?? {});
          setTask(msg.payload.issues ?? []);
          setUsers(msg.payload.users ?? []);
          setSections(msg.payload.sections ?? []);
          setBoards(msg.payload.boards ?? []);
          setRepository(msg.payload.repository ?? {});
          setLoading(false);
          setChangingBoard(false);
          setBoardId(msg.payload.boardId ?? '');
          break;

        case 'update-sections':
          setTask(msg.payload.issues ?? [])
          setSections(msg.payload.sections ?? [])
          setLoading(false);
          setChangingBoard(false);
          setRepository(msg.payload.repository ?? null)
          break;

        case 'create-section':
          console.log('recieved create section message');
          const section = msg.payload?.section;
          console.log("section", section);
          if (!section) {
            console.warn("create-section: missing payload.section", msg);
            break;
          }
          setSections(prev => [...prev, section]);
          break;

        case 'create-task':
          console.log("inside create task", msg)
          const title = msg.payload.title;
          const sectionId = msg.payload.sectionId;
          const id = msg.payload.id;
          const task = {
            id: id,
            title: title,
            sectionId: sectionId
          }
          setTask(prev => [...prev, task]);
          break;

        case 'update-issue':
          console.log("message", msg)
          const issueId = msg.payload.issueId;
          const updatedSection = msg.payload.updatedSection;
          setTask(prev => prev.map(item =>
            item.id === issueId ? { ...item, sectionId: updatedSection } : item
          ));
          break;

        case 'delete-section':
          const sectionIdToDelete = msg.payload.sectionId;
          setSections(prev => prev.filter(section => section.id !== sectionIdToDelete));
          break;

        case 'user-joined':
          const newUser = msg.payload;
          setUsers(prev => [...prev, newUser]);
          break;

        case 'user-left':
          const userIdToRemove = msg.payload.id;
          setUsers(prev => prev.filter((user: any) => user.id !== userIdToRemove));
          break;

        case 'delete-section-success': {
          const sectionId = msg.payload.sectionId;
          setSections(prev => prev.filter(section => section.id !== sectionId));
          setDeleteSectionLoading(false)
          break;
        }

        case 'create-task-success':
          console.log("create-task-success", msg)
          const temporaryId = msg.payload.temporaryId;
          const permanentId = msg.payload.permanentId;
          setTask(prev => prev.map(item =>
            item.id === temporaryId ? { ...item, id: permanentId } : item
          ));
          break;

        case "error":
          alert(JSON.stringify(msg.payload.message));
          console.error("WebSocket error:", msg.payload);
          break;

        default:
          console.log(msg)
          break;
      }
    }

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [])

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6">

        <BoardInfo
          handleBoardCreated={handleBoardCreated}
          changeBoard={changeBoard}
          boardId={boardId}
          boards={boards}
          users = {users}
        />

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading board...</div>
        ) : (
          <div className="space-y-4">
            {boardId && <ConnectRepository boardId={boardId} repo={repository} />}

            {changingBoard ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Changing board...</div>
            ) : (
              <div className="flex gap-4 overflow-x-auto pb-2">
                //todo : make changes to make it work
                <SectionInfo 
                  sections = {sections} 
                  deleteSectionLoading = {deleteSectionLoading}
                  deleteSection = {deleteSection}
                  task = {task}
                  moveBackward = {moveBackward}
                  moveForward = {moveForward}
                  addtask={addtask}
                />  

                <div className="w-[310px] shrink-0 rounded-xl border border-dashed border-slate-300 bg-white p-3 shadow-sm">
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">Add section</h3>
                  <input
                    type="text"
                    value={title}
                    placeholder="Section name"
                    onChange={(e) => setTitle(e.target.value)}
                    className="mb-3 w-full rounded border border-slate-300 px-2 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <button
                    type="button"
                    className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
                    onClick={addSection}
                  >
                    Add Section
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}