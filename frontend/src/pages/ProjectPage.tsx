import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import * as core from '../api/core'
import { useAuth } from '../auth/AuthContext'
import { parseDrfError } from '../ui/parseDrfError'

export function ProjectPage() {
  const { id } = useParams()
  const projectId = Number(id)
  const { user } = useAuth()

  const [project, setProject] = useState<core.Project | null>(null)
  const [members, setMembers] = useState<core.ProjectMember[]>([])
  const [tasks, setTasks] = useState<core.Task[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState<'member' | 'manager'>('member')

  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newDue, setNewDue] = useState('')
  const [newAssigneeId, setNewAssigneeId] = useState<number | ''>('')

  const assigneeOptions = useMemo(() => {
    const out: core.User[] = []
    if (project?.owner) out.push(project.owner)
    for (const m of members) out.push(m.user)
    const uniq = new Map<number, core.User>()
    for (const u of out) uniq.set(u.id, u)
    return Array.from(uniq.values()).sort((a, b) => a.email.localeCompare(b.email))
  }, [members, project?.owner])

  const canManage =
    Boolean(user && project && (project.owner.id === user.id)) ||
    Boolean(user && members.some((m) => m.user.id === user.id && m.role === 'manager'))

  async function load() {
    if (!projectId) return
    setIsLoading(true)
    setError(null)
    try {
      const [p, ms, ts] = await Promise.all([
        core.getProject(projectId),
        core.listProjectMembers({ project: projectId, page: 1 }),
        core.listTasks({ project: projectId, page: 1, ordering: '-created_at' }),
      ])
      setProject(p)
      setMembers(ms.results)
      setTasks(ts.results)
    } catch (e: any) {
      setError(parseDrfError(e))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function onAddMember(e: FormEvent) {
    e.preventDefault()
    const uid = Number(memberUserId)
    if (!uid) return
    try {
      await core.addProjectMember({ project: projectId, user_id: uid, role: memberRole })
      setMemberUserId('')
      await load()
    } catch (e: any) {
      setError(parseDrfError(e))
    }
  }

  async function onRemoveMember(memberId: number) {
    if (!confirm('Удалить участника из проекта?')) return
    try {
      await core.deleteProjectMember(memberId)
      await load()
    } catch (e: any) {
      setError(parseDrfError(e))
    }
  }

  async function onCreateTask(e: FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    try {
      await core.createTask({
        project: projectId,
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
      await load()
    } catch (e: any) {
      setError(parseDrfError(e))
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h2>Проект</h2>
        <div className="muted">
          <Link to="/app/projects">← к списку</Link>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {isLoading ? <div className="muted">Загрузка…</div> : null}

      {project ? (
        <section className="card">
          <h3>
            {project.name} <span className="mono">#{project.id}</span>
          </h3>
          <div className="muted">owner: {project.owner?.email}</div>
          <div style={{ marginTop: 8 }}>{project.description}</div>
        </section>
      ) : null}

      <div className="grid2">
        <section className="card">
          <div className="table-head">
            <h3>Участники</h3>
            <div className="muted">{canManage ? 'можно управлять' : 'только просмотр'}</div>
          </div>

          <div className="table" style={{ marginTop: 12 }}>
            <div className="tr th" style={{ gridTemplateColumns: '1fr 140px 220px' }}>
              <div>Пользователь</div>
              <div>Роль</div>
              <div></div>
            </div>
            {members.map((m) => (
              <div key={m.id} className="tr" style={{ gridTemplateColumns: '1fr 140px 220px' }}>
                <div className="muted">
                  {m.user.email} <span className="mono">#{m.user.id}</span>
                </div>
                <div className="mono">{m.role}</div>
                <div className="actions">
                  <button className="btn" disabled={!canManage} onClick={() => void onRemoveMember(m.id)}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
            {!members.length ? <div className="muted">Нет участников (кроме владельца).</div> : null}
          </div>

          <form onSubmit={onAddMember} className="form" style={{ marginTop: 12 }}>
            <div className="row">
              <label className="field">
                <span>user_id</span>
                <input value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} />
              </label>
              <label className="field">
                <span>роль</span>
                <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as any)}>
                  <option value="member">member</option>
                  <option value="manager">manager</option>
                </select>
              </label>
            </div>
            <button className="btn" disabled={!canManage}>
              Добавить участника
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Создать задачу в проекте</h3>
          <form onSubmit={onCreateTask} className="form">
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
                <span>due_date</span>
                <input type="date" value={newDue} onChange={(e) => setNewDue(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>Исполнитель</span>
              <select
                value={newAssigneeId}
                onChange={(e) => setNewAssigneeId(e.target.value ? Number(e.target.value) : '')}
              >
                <option value="">—</option>
                {assigneeOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} #{u.id}
                  </option>
                ))}
              </select>
            </label>
            <button className="btn primary">Создать</button>
          </form>
        </section>
      </div>

      <section className="card">
        <div className="table-head">
          <h3>Задачи проекта</h3>
        </div>
        <div className="table">
          <div className="tr th" style={{ gridTemplateColumns: '80px 1fr 140px 140px' }}>
            <div>ID</div>
            <div>Название</div>
            <div>Статус</div>
            <div></div>
          </div>
          {tasks.map((t) => (
            <div key={t.id} className="tr" style={{ gridTemplateColumns: '80px 1fr 140px 140px' }}>
              <div className="mono">{t.id}</div>
              <div>
                <div className="strong">{t.title}</div>
                <div className="muted">assignee: {t.assignee?.email ?? '—'}</div>
              </div>
              <div className="mono">{t.status}</div>
              <div className="actions">
                <Link className="btn" to={`/app/tasks/${t.id}`}>
                  Open
                </Link>
              </div>
            </div>
          ))}
          {!tasks.length ? <div className="muted">Нет задач.</div> : null}
        </div>
      </section>
    </div>
  )
}

