import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import * as core from '../api/core'
import * as usersApi from '../api/users'
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
  const [memberSearch, setMemberSearch] = useState('')
  const [memberCandidates, setMemberCandidates] = useState<usersApi.UserListItem[]>([])
  const [memberSelectedId, setMemberSelectedId] = useState<number | ''>('')
  const [memberRole, setMemberRole] = useState<'member' | 'manager'>('member')
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const [isUserSearchLoading, setIsUserSearchLoading] = useState(false)

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
    const userId = memberSelectedId === '' ? 0 : Number(memberSelectedId)
    if (!userId) return
    try {
      await core.addProjectMember({ project: membersProjectId, user_id: userId, role: memberRole })
      setMemberSelectedId('')
      await loadMembers(membersProjectId)
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  async function onSearchUsers(e: FormEvent) {
    e.preventDefault()
    setIsUserSearchLoading(true)
    try {
      const res = await usersApi.searchUsers(memberSearch.trim(), 1)
      setMemberCandidates(res.results)
    } catch (e) {
      setError(parseDrfError(e))
    } finally {
      setIsUserSearchLoading(false)
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

      <section className="card panel">
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
          <div className="list-rows">
            {projects.map((p) => (
              <div key={p.id} className="list-row">
                <div className="list-row__id">#{p.id}</div>
                <div className="list-row__main">
                  <div className="list-row__title">{p.name}</div>
                  {p.description ? <div className="list-row__desc">{p.description}</div> : null}
                  <div className="list-row__meta">
                    <span>Создано: {p.owner?.email ?? '—'}</span>
                  </div>
                </div>
                <div className="list-row__actions">
                  <button className="btn" onClick={() => setEditing({ id: p.id, name: p.name, description: p.description })}>
                    Редактировать
                  </button>
                  <Link className="btn" to={`/app/projects/${p.id}`}>
                    Открыть
                  </Link>
                  <button className="btn" onClick={() => void loadMembers(p.id)}>
                    Участники
                  </button>
                  <button className="btn" onClick={() => void onDelete(p.id)}>
                    Удалить
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
        <section className="card panel">
          <div className="table-head">
            <h3>Участники проекта #{membersProjectId}</h3>
            <button className="btn" onClick={() => setMembersProjectId(null)}>
              Закрыть
            </button>
          </div>

          <div className="muted">{currentProject ? currentProject.name : ''}</div>

          <form onSubmit={onSearchUsers} className="form" style={{ marginTop: 12 }}>
            <label className="field">
              <span>Поиск пользователя (email/имя/фамилия)</span>
              <input value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            </label>
            <button className="btn" disabled={isUserSearchLoading}>
              {isUserSearchLoading ? 'Ищу…' : 'Найти'}
            </button>
          </form>

          <form onSubmit={onAddMember} className="form" style={{ marginTop: 12 }}>
            <div className="row">
              <label className="field">
                <span>Пользователь</span>
                <select
                  value={memberSelectedId}
                  onChange={(e) => setMemberSelectedId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">—</option>
                  {memberCandidates.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} #{u.id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Роль</span>
                <select value={memberRole} onChange={(e) => setMemberRole(e.target.value as any)}>
                  <option value="member">Участник</option>
                  <option value="manager">Менеджер</option>
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
            <div className="list-rows">
              {(members?.results ?? []).map((m) => (
                <div key={m.id} className="list-row">
                  <div className="list-row__id">#{m.id}</div>
                  <div className="list-row__main">
                    <div className="list-row__title">{m.user?.email ?? '—'}</div>
                    <div className="list-row__meta">
                      <span>Пользователь #{m.user?.id}</span>
                      <span>
                        Роль:{' '}
                        <select value={m.role} onChange={(e) => void onChangeMemberRole(m, e.target.value as any)}>
                          <option value="member">Участник</option>
                          <option value="manager">Менеджер</option>
                        </select>
                      </span>
                    </div>
                  </div>
                  <div className="list-row__actions">
                    <button className="btn" onClick={() => void onDeleteMember(m)}>
                      Удалить
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

