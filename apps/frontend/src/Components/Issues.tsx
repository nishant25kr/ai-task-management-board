import type { User, Task, Section, Board, Repository } from "@/types";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom"
import { ConnectRepository } from "./ConnectRepository";
import { Navbar } from "./Navbar";
import { WS_URL } from "../config";
import { BoardInfo } from "./BoardInfo";
import { SectionInfo } from "./SectionsInfo";

export const Issue = () => {
  const params = useParams();
  const navigate = useNavigate();
  const wsRef = useRef<WebSocket | null>(null);
  const pendingSectionDeletesRef = useRef<Record<string, string>>({});
  const pendingSectionCreateRequestRef = useRef<string | null>(null);
  const [user, setUser] = useState<User>()
  const [boardId, setBoardId] = useState<string>('');
  const [task, setTask] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [changingBoard, setChangingBoard] = useState<boolean>(false);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [deletingSections, setDeletingSections] = useState<Record<string, string>>({});
  const [sectionDeleteErrors, setSectionDeleteErrors] = useState<Record<string, string>>({});
  const [sectionCreateResult, setSectionCreateResult] = useState<{
    requestId: string;
    section: Section;
  } | null>(null);
  const [sectionCreateError, setSectionCreateError] = useState<{
    requestId: string;
    message: string;
  } | null>(null);

  function addtask(sectionId: string, newtask: string, description: string): boolean {
    if (!newtask.trim() || !description.trim()) {
      alert("validation failed")
      return false;
    }
    const token = localStorage.getItem("token");
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;
    const temporiryId = crypto.randomUUID();
    wsRef.current.send(
      JSON.stringify({
        type: 'create-task',
        payload: {
          temporaryId: temporiryId,
          title: newtask,
          boardId: boardId,
          createdBy: user?.id,
          description: description,
          sectionId: sectionId,
          token: token
        }
      })
    )
    setTask(prev => [...prev, { id: temporiryId, title: newtask, sectionId: sectionId }])
    return true;
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

  function addSection(title: string, requestId: string): boolean {
    if (!title.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;
    pendingSectionCreateRequestRef.current = requestId;
    setSectionCreateError(null);
    wsRef.current?.send(
      JSON.stringify({
        type: "add-section",
        payload: {
          requestId,
          title: title.trim(),
          boardId: boardId
        }
      })
    )
    return true;
  }

  function deleteSection(sectionId: string, requestId: string): boolean {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setSectionDeleteErrors(prev => ({
        ...prev,
        [sectionId]: "The board connection is not ready. Try again."
      }));
      return false;
    }
    setSectionDeleteErrors(prev => {
      const errors = { ...prev };
      delete errors[sectionId];
      return errors;
    });
    setDeletingSections(prev => ({ ...prev, [sectionId]: requestId }));
    pendingSectionDeletesRef.current[sectionId] = requestId;
    wsRef.current.send(
      JSON.stringify({
        type: "delete-section",
        payload: {
          requestId,
          sectionId,
          boardId: boardId,
          organizationId: params.organizationId
        }
      })
    )
    return true;
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
          setRepository(msg.payload.repository ?? null);
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
          const section = msg.payload?.section;
          if (!section) {
            console.warn("create-section: missing payload.section", msg);
            break;
          }
          setSections(prev => prev.some(item => item.id === section.id) ? prev : [...prev, section]);
          break;

        case 'create-section-success': {
          const section = msg.payload?.section as Section | undefined;
          const requestId = msg.payload?.requestId as string | undefined;
          if (!section || !requestId) {
            console.warn("create-section-success: missing section or requestId", msg);
            break;
          }
          pendingSectionCreateRequestRef.current = null;
          setSections(prev => prev.some(item => item.id === section.id) ? prev : [...prev, section]);
          setSectionCreateResult({ requestId, section });
          break;
        }

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
          setUsers(prev => prev.filter(user => user.id !== userIdToRemove));
          break;

        case 'delete-section-success': {
          const sectionId = msg.payload.sectionId;
          delete pendingSectionDeletesRef.current[sectionId];
          setSections(prev => prev.filter(section => section.id !== sectionId));
          setDeletingSections(prev => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
          });
          setSectionDeleteErrors(prev => {
            const next = { ...prev };
            delete next[sectionId];
            return next;
          });
          break;
        }

        case 'delete-section': {
          const sectionId = msg.payload.sectionId;
          setSections(prev => prev.filter(section => section.id !== sectionId));
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

        case "error": {
          const requestId = msg.payload?.requestId as string | undefined;
          const message = String(msg.payload?.message ?? "WebSocket request failed");
          if (requestId && pendingSectionCreateRequestRef.current === requestId) {
            pendingSectionCreateRequestRef.current = null;
            setSectionCreateError({ requestId, message });
          } else if (requestId && Object.entries(pendingSectionDeletesRef.current).some(([, id]) => id === requestId)) {
            const sectionId = Object.entries(pendingSectionDeletesRef.current).find(([, id]) => id === requestId)?.[0];
            if (sectionId) {
              delete pendingSectionDeletesRef.current[sectionId];
              setDeletingSections(prev => {
                const next = { ...prev };
                delete next[sectionId];
                return next;
              });
              setSectionDeleteErrors(prev => ({ ...prev, [sectionId]: message }));
            }
          } else {
            alert(message);
          }
          console.error("WebSocket error:", msg.payload);
          break;
        }

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
          users={users}
        />

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Loading board...</div>
        ) : (
          <div className="space-y-4">
            {boardId && <ConnectRepository boardId={boardId} repo={repository} />}

            {changingBoard ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">Changing board...</div>
            ) : (
              <SectionInfo
                sections={sections}
                tasks={task}
                deletingSections={deletingSections}
                sectionDeleteErrors={sectionDeleteErrors}
                sectionCreateResult={sectionCreateResult}
                sectionCreateError={sectionCreateError}
                onDeleteSection={deleteSection}
                onDeleteTask={deleteIssue}
                onMoveBackward={moveBackward}
                onMoveForward={moveForward}
                onAddTask={addtask}
                onAddSection={addSection}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}