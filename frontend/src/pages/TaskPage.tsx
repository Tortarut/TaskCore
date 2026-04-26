import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import * as core from '../api/core'
import { TaskDetailsPanel } from '../components/TaskDetailsPanel'
import { useAuth } from '../auth/AuthContext'
import { parseDrfError } from '../ui/parseDrfError'

export function TaskPage() {
  const { id } = useParams()
  const taskId = Number(id)
  const { user } = useAuth()
  const navigate = useNavigate()

  const [task, setTask] = useState<core.Task | null>(null)
  const [project, setProject] = useState<core.Project | null>(null)
  const [members, setMembers] = useState<core.ProjectMember[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [assigneeId, setAssigneeId] = useState<number | ''>('')

  const canManage =
    Boolean(user && project && project.owner.id === user.id) ||
    Boolean(user && members.some((m) => m.user.id === user?.id && m.role === 'manager'))

  const assigneeOptions = useMemo(() => {
    const out: core.User[] = []
    if (project?.owner) out.push(project.owner)
    for (const m of members) out.push(m.user)
    const uniq = new Map<number, core.User>()
    for (const u of out) uniq.set(u.id, u)
    return Array.from(uniq.values()).sort((a, b) => a.email.localeCompare(b.email))
  }, [members, project?.owner])

  async function load() {
    if (!taskId) return
    setIsLoading(true)
    setError(null)
    try {
      const t = await core.getTask(taskId)
      setTask(t)
      setAssigneeId(t.assignee?.id ?? '')

      const p = await core.getProject(t.project)
      setProject(p)

      const ms = await core.listProjectMembers({ project: t.project, page: 1 })
      setMembers(ms.results)
    } catch (e: any) {
      setError(parseDrfError(e))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!task) return
    setError(null)
    try {
      await core.updateTask(task.id, {
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        due_date: task.due_date,
        assignee_id: assigneeId === '' ? null : Number(assigneeId),
      })
      await load()
    } catch (e: any) {
      setError(parseDrfError(e))
    }
  }

  async function onDelete() {
    if (!task) return
    if (!confirm('Удалить задачу?')) return
    setError(null)
    try {
      await core.deleteTask(task.id)
      navigate('/app/tasks', { replace: true })
    } catch (e: any) {
      setError(parseDrfError(e))
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h2>Задача</h2>
        <div className="muted">
          <Link to="/app/tasks">← к списку</Link>
          {project ? (
            <>
              {' '}
              • <Link to={`/app/projects/${project.id}`}>проект</Link>
            </>
          ) : null}
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {isLoading ? <div className="muted">Загрузка…</div> : null}

      {task ? (
        <section className="card">
          <div className="table-head">
            <h3>
              {task.title} <span className="mono">#{task.id}</span>
            </h3>
            <div className="actions">
              <button className="btn" onClick={() => void onDelete()} disabled={!canManage}>
                Delete
              </button>
            </div>
          </div>

          <form onSubmit={onSave} className="form" style={{ marginTop: 12 }}>
            <label className="field">
              <span>Название</span>
              <input value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} required />
            </label>
            <label className="field">
              <span>Описание</span>
              <input value={task.description} onChange={(e) => setTask({ ...task, description: e.target.value })} />
            </label>
            <div className="row">
              <label className="field">
                <span>Статус</span>
                <select value={task.status} onChange={(e) => setTask({ ...task, status: e.target.value as any })}>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="review">review</option>
                  <option value="done">done</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
              <label className="field">
                <span>Приоритет</span>
                <select value={task.priority} onChange={(e) => setTask({ ...task, priority: e.target.value as any })}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
            </div>
            <div className="row">
              <label className="field">
                <span>due_date</span>
                <input
                  type="date"
                  value={task.due_date ?? ''}
                  onChange={(e) => setTask({ ...task, due_date: e.target.value || null })}
                />
              </label>
              <label className="field">
                <span>Исполнитель</span>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">—</option>
                  {assigneeOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} #{u.id}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="actions">
              <button className="btn primary">Сохранить</button>
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              author: {task.author?.email ?? '—'} • assignee: {task.assignee?.email ?? '—'}
            </div>
          </form>
        </section>
      ) : null}

      {task ? <TaskDetailsPanel taskId={task.id} /> : null}
    </div>
  )
}

