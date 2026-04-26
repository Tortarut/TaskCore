import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import * as core from '../api/core'
import { parseDrfError } from '../ui/parseDrfError'

type Editing = { id: number; name: string; description: string } | null

export function ProjectsPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [data, setData] = useState<core.Page<core.Project> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [editing, setEditing] = useState<Editing>(null)

  const [membersProjectId, setMembersProjectId] = useState<number | null>(null)
  const [members, setMembers] = useState<core.Page<core.ProjectMember> | null>(null)
  const [memberUserId, setMemberUserId] = useState('')
  const [memberRole, setMemberRole] = useState<'member' | 'manager'>('member')
  const [isMembersLoading, setIsMembersLoading] = useState(false)

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const res = await core.listProjects({ page, search: search.trim() || undefined })
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

  async function onSearchSubmit(e: FormEvent) {
    e.preventDefault()
    setPage(1)
    await load()
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setIsCreating(true)
    setError(null)
    try {
      await core.createProject({ name: newName.trim(), description: newDesc.trim() || '' })
      setNewName('')
      setNewDesc('')
      setPage(1)
      await load()
    } catch (e: any) {
      setError(parseDrfError(e))
    } finally {
      setIsCreating(false)
    }
  }

  async function onEditSave(e: FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError(null)
    try {
      await core.updateProject(editing.id, { name: editing.name.trim(), description: editing.description })
      setEditing(null)
      await load()
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Удалить проект?')) return
    setError(null)
    try {
      await core.deleteProject(id)
      await load()
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  const projects = data?.results ?? []
  const canPrev = Boolean(data?.previous)
  const canNext = Boolean(data?.next)

  const currentProject = useMemo(
    () => (membersProjectId ? projects.find((p) => p.id === membersProjectId) ?? null : null),
    [membersProjectId, projects],
  )

  async function loadMembers(projectId: number) {
    setMembersProjectId(projectId)
    setIsMembersLoading(true)
    try {
      const res = await core.listProjectMembers({ project: projectId, page: 1 })
      setMembers(res)
    } catch (e) {
      setMembers(null)
    } finally {
      setIsMembersLoading(false)
    }
  }

  async function onAddMember(e: FormEvent) {
    e.preventDefault()
    if (!membersProjectId) return
    const userId = Number(memberUserId)
    if (!userId) return
    try {
      await core.addProjectMember({ project: membersProjectId, user_id: userId, role: memberRole })
      setMemberUserId('')
      await loadMembers(membersProjectId)
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  async function onChangeMemberRole(member: core.ProjectMember, role: 'member' | 'manager') {
    try {
      await core.updateProjectMember(member.id, { role })
      if (membersProjectId) await loadMembers(membersProjectId)
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  async function onDeleteMember(member: core.ProjectMember) {
    if (!confirm('Удалить участника из проекта?')) return
    try {
      await core.deleteProjectMember(member.id)
      if (membersProjectId) await loadMembers(membersProjectId)
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <h2>Проекты</h2>
      </div>

      <div className="grid2">
        <section className="card">
          <h3>Создать проект</h3>
          <form onSubmit={onCreate} className="form">
            <label className="field">
              <span>Название</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </label>
            <label className="field">
              <span>Описание</span>
              <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            </label>
            <button className="btn primary" disabled={isCreating}>
              {isCreating ? 'Создаю…' : 'Создать'}
            </button>
          </form>
        </section>

        <section className="card">
          <h3>Поиск</h3>
          <form onSubmit={onSearchSubmit} className="form">
            <label className="field">
              <span>Название/описание</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button className="btn" disabled={isLoading}>
              Найти
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
              <div>Название</div>
              <div>Владелец</div>
              <div></div>
            </div>
            {projects.map((p) => (
              <div key={p.id} className="tr">
                <div className="mono">{p.id}</div>
                <div>
                  <div className="strong">{p.name}</div>
                  <div className="muted">{p.description}</div>
                </div>
                <div className="muted">{p.owner?.email}</div>
                <div className="actions">
                  <button className="btn" onClick={() => setEditing({ id: p.id, name: p.name, description: p.description })}>
                    Edit
                  </button>
                  <Link className="btn" to={`/app/projects/${p.id}`}>
                    Open
                  </Link>
                  <button className="btn" onClick={() => void loadMembers(p.id)}>
                    Members
                  </button>
                  <button className="btn" onClick={() => void onDelete(p.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {!projects.length ? <div className="muted">Нет проектов.</div> : null}
          </div>
        )}
      </section>

      {editing ? (
        <section className="card">
          <h3>Редактировать проект #{editing.id}</h3>
          <form onSubmit={onEditSave} className="form">
            <label className="field">
              <span>Название</span>
              <input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required />
            </label>
            <label className="field">
              <span>Описание</span>
              <input
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>
            <div className="actions">
              <button className="btn primary">Сохранить</button>
              <button className="btn" type="button" onClick={() => setEditing(null)}>
                Отмена
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {membersProjectId ? (
        <section className="card">
          <div className="table-head">
            <h3>Участники проекта #{membersProjectId}</h3>
            <button className="btn" onClick={() => setMembersProjectId(null)}>
              Закрыть
            </button>
          </div>

          <div className="muted">{currentProject ? currentProject.name : ''}</div>

          <form onSubmit={onAddMember} className="form" style={{ marginTop: 12 }}>
            <div className="row">
              <label className="field">
                <span>user_id</span>
                <input value={memberUserId} onChange={(e) => setMemberUserId(e.target.value)} placeholder="например 2" />
              </label>
              <label className="field">
                <span>Роль</span>
                <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as any)}>
                  <option value="member">member</option>
                  <option value="manager">manager</option>
                </select>
              </label>
            </div>
            <button className="btn" disabled={!membersProjectId}>
              Добавить участника
            </button>
          </form>

          {isMembersLoading ? (
            <div className="muted">Загрузка участников…</div>
          ) : (
            <div className="table" style={{ marginTop: 12 }}>
              <div className="tr th">
                <div>ID</div>
                <div>Пользователь</div>
                <div>Роль</div>
                <div></div>
              </div>
              {(members?.results ?? []).map((m) => (
                <div key={m.id} className="tr">
                  <div className="mono">{m.id}</div>
                  <div className="muted">
                    {m.user?.email} <span className="mono">#{m.user?.id}</span>
                  </div>
                  <div>
                    <select value={m.role} onChange={(e) => void onChangeMemberRole(m, e.target.value as any)}>
                      <option value="member">member</option>
                      <option value="manager">manager</option>
                    </select>
                  </div>
                  <div className="actions">
                    <button className="btn" onClick={() => void onDeleteMember(m)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {!members?.results?.length ? <div className="muted">Нет участников (кроме владельца).</div> : null}
            </div>
          )}
        </section>
      ) : null}
    </div>
  )
}

