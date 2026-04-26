import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import * as core from '../api/core'
import { TaskDetailsPanel } from '../components/TaskDetailsPanel'
import { parseDrfError } from '../ui/parseDrfError'

type EditingTask = (core.Task & { assignee_id?: number | null }) | null

export function TasksPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<core.Project[]>([])
  const [projectMembersById, setProjectMembersById] = useState<Map<number, core.ProjectMember[]>>(new Map())

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [project, setProject] = useState<number | ''>('')
  const [status, setStatus] = useState<string>('')
  const [priority, setPriority] = useState<string>('')
  const [ordering, setOrdering] = useState<string>('-created_at')
  const [assignee, setAssignee] = useState<string>('') // numeric id string
  const [dueAfter, setDueAfter] = useState<string>('')
  const [dueBefore, setDueBefore] = useState<string>('')

  const [data, setData] = useState<core.Page<core.Task> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newProject, setNewProject] = useState<number | ''>('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDue, setNewDue] = useState<string>('')
  const [newAssigneeId, setNewAssigneeId] = useState<number | ''>('')
  const [isCreating, setIsCreating] = useState(false)

  const [editing, setEditing] = useState<EditingTask>(null)
  const [detailsTaskId, setDetailsTaskId] = useState<number | null>(null)

  useEffect(() => {
    core
      .listProjects({ page: 1 })
      .then(async (p) => {
        setProjects(p.results)
        const map = new Map<number, core.ProjectMember[]>()
        await Promise.all(
          p.results.map(async (proj) => {
            try {
              const ms = await core.listProjectMembers({ project: proj.id, page: 1 })
              map.set(proj.id, ms.results)
            } catch {
              map.set(proj.id, [])
            }
          }),
        )
        setProjectMembersById(map)
      })
      .catch(() => setProjects([]))
  }, [])

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await core.listTasks({
        page,
        search: search.trim() || undefined,
        project: project === '' ? undefined : project,
        status: status || undefined,
        priority: priority || undefined,
        assignee: assignee ? Number(assignee) : undefined,
        due_date_after: dueAfter || undefined,
        due_date_before: dueBefore || undefined,
        ordering: ordering || undefined,
      })
      setData(res)
    } catch (e) {
      setError(parseDrfError(e))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  async function onFilterSubmit(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    await load()
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!newProject || !newTitle.trim()) return
    setIsCreating(true)
    setError(null)
    try {
      await core.createTask({
        project: Number(newProject),
        title: newTitle.trim(),
        description: newDesc,
        priority: newPriority,
        due_date: newDue ? newDue : null,
        assignee_id: newAssigneeId === '' ? null : Number(newAssigneeId),
      })
      setNewTitle('')
      setNewDesc('')
      setNewDue('')
      setNewAssigneeId('')
      setPage(1)
      await load()
    } catch (e: any) {
      setError(parseDrfError(e))
    } finally {
      setIsCreating(false)
    }
  }

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError(null)
    try {
      await core.updateTask(editing.id, {
        title: editing.title,
        description: editing.description,
        status: editing.status,
        priority: editing.priority,
        due_date: editing.due_date,
        assignee_id: editing.assignee_id ?? null,
      })
      setEditing(null)
      await load()
    } catch (e: any) {
      setError(parseDrfError(e))
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Удалить задачу?')) return
    setError(null)
    try {
      await core.deleteTask(id)
      await load()
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  const tasks = data?.results ?? []
  const canPrev = Boolean(data?.previous)
  const canNext = Boolean(data?.next)

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  const newAssigneeOptions = useMemo(() => {
    if (newProject === '') return []
    const p = projects.find((x) => x.id === Number(newProject))
    const members = projectMembersById.get(Number(newProject)) ?? []
    const users: core.User[] = []
    if (p?.owner) users.push(p.owner)
    for (const m of members) users.push(m.user)
    const uniq = new Map<number, core.User>()
    for (const u of users) uniq.set(u.id, u)
    return Array.from(uniq.values()).sort((a, b) => a.email.localeCompare(b.email))
  }, [newProject, projectMembersById, projects])

  return (
    <div className="stack">
      <div className="page-head">
        <h2>Задачи</h2>
      </div>

      <div className="grid2">
        <section className="card">
          <h3>Создать задачу</h3>
          <form onSubmit={onCreate} className="form">
            <label className="field">
              <span>Проект</span>
              <select value={newProject} onChange={(e) => setNewProject(e.target.value ? Number(e.target.value) : '')} required>
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} #{p.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Название</span>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
            </label>
            <label className="field">
              <span>Описание</span>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </label>
            <div className="row">
              <label className="field">
                <span>Приоритет</span>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as any)}>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              <label className="field">
                <span>Срок (due_date)</span>
                <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Исполнитель (опционально)</span>
              <select
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">—</option>
                {newAssigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} #{u.id}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary" disabled={isCreating}>
              {isCreating ? 'Создаю…' : 'Создать'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Фильтры</h3>
          <form onSubmit={onFilterSubmit} className="form">
            <label className="field">
              <span>Поиск</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <div className="row">
              <label className="field">
                <span>Проект</span>
                <select value={project} onChange={(e) => setProject(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">—</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} #{p.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Статус</span>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">—</option>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="review">review</option>
                  <option value="done">done</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
            </div>
            <div className="row">
              <label className="field">
                <span>Приоритет</span>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="">—</option>
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
              </label>
              <label className="field">
                <span>Сортировка</span>
                <select value={ordering} onChange={(e) => setOrdering(e.target.value)}>
                  <option value="-created_at">created_at desc</option>
                  <option value="created_at">created_at asc</option>
                  <option value="due_date">due_date asc</option>
                  <option value="-due_date">due_date desc</option>
                  <option value="priority">priority</option>
                  <option value="status">status</option>
                </select>
              </label>
            </div>
            <label className="field">
              <span>assignee (id)</span>
              <input value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="например 3" />
            </label>
            <div className="row">
              <label className="field">
                <span>due_date_after</span>
                <input type="date" value={dueAfter} onChange={(e) => setDueAfter(e.target.value)} />
              </label>
              <label className="field">
                <span>due_date_before</span>
                <input type="date" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)} />
              </label>
            </div>
            <button className="btn" disabled={isLoading}>
              Применить
            </button>
          </form>
        </section>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <section className="card">
        <div className="table-head">
          <h3>Список</h3>
          <div className="pager">
            <button className="btn" disabled={!canPrev || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              ←
            </button>
            <span className="muted">страница {page}</span>
            <button className="btn" disabled={!canNext || isLoading} onClick={() => setPage((p) => p + 1)}>
              →
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="muted">Загрузка…</div>
        ) : (
          <div className="table">
            <div className="tr th">
              <div>ID</div>
              <div>Задача</div>
              <div>Проект</div>
              <div>Статус</div>
              <div></div>
            </div>
            {tasks.map((t) => (
              <div key={t.id} className="tr">
                <div className="mono">{t.id}</div>
                <div>
                  <div className="strong">{t.title}</div>
                  <div className="muted">{t.description}</div>
                  <div className="muted">
                    prio: {t.priority} • due: {t.due_date ?? '—'} • assignee: {t.assignee?.email ?? '—'}
                  </div>
                </div>
                <div className="muted">{projectMap.get(t.project) ?? `#${t.project}`}</div>
                <div className="mono">{t.status}</div>
                <div className="actions">
                  <button
                    className="btn"
                    onClick={() =>
                      setEditing({
                        ...t,
                        assignee_id: t.assignee?.id ?? null,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button className="btn" onClick={() => setDetailsTaskId(t.id)}>
                    Details
                  </button>
                  <button className="btn" onClick={() => navigate(`/app/tasks/${t.id}`)}>
                    Open
                  </button>
                  <button className="btn" onClick={() => void onDelete(t.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!tasks.length ? <div className="muted">Нет задач.</div> : null}
          </div>
        )}
      </section>

      {editing ? (
        <section className="card">
          <h3>Редактировать задачу #{editing.id}</h3>
          <form onSubmit={onSaveEdit} className="form">
            <label className="field">
              <span>Название</span>
              <input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required />
            </label>
            <label className="field">
              <span>Описание</span>
              <input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </label>
            <div className="row">
              <label className="field">
                <span>Статус</span>
                <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as any })}>
                  <option value="todo">todo</option>
                  <option value="in_progress">in_progress</option>
                  <option value="review">review</option>
                  <option value="done">done</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </label>
              <label className="field">
                <span>Приоритет</span>
                <select value={editing.priority} onChange={(e) => setEditing({ ...editing, priority: e.target.value as any })}>
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
                  value={editing.due_date ?? ''}
                  onChange={(e) => setEditing({ ...editing, due_date: e.target.value || null })}
                />
              </label>
              <label className="field">
                <span>assignee_id</span>
                <input
                  value={editing.assignee_id === null || editing.assignee_id === undefined ? '' : String(editing.assignee_id)}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      assignee_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
            </div>
            <div className="actions">
              <button className="btn primary">Сохранить</button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {detailsTaskId ? (
        <div className="stack">
          <div className="table-head">
            <h3>Детали задачи #{detailsTaskId}</h3>
            <button className="btn" onClick={() => setDetailsTaskId(null)}>
              Закрыть
            </button>
          </div>
          <TaskDetailsPanel taskId={detailsTaskId} />
        </div>
      ) : null}
    </div>
  )
}

