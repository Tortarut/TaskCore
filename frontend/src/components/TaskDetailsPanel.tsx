import { type FormEvent, useEffect, useState } from 'react'

import * as core from '../api/core'
import { parseDrfError } from '../ui/parseDrfError'

export function TaskDetailsPanel({
  taskId,
}: {
  taskId: number
}) {
  const [comments, setComments] = useState<core.TaskComment[]>([])
  const [logs, setLogs] = useState<core.TaskChangeLog[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newBody, setNewBody] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingBody, setEditingBody] = useState('')

  async function load() {
    setIsLoading(true)
    setError(null)
    try {
      const [c, l] = await Promise.all([
        core.listTaskComments({ task: taskId, page: 1 }),
        core.listTaskChangeLogs({ task: taskId, page: 1 }),
      ])
      setComments(c.results)
      setLogs(l.results)
    } catch (e) {
      setError('Не удалось загрузить комментарии/историю.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId])

  async function onAdd(e: FormEvent) {
    e.preventDefault()
    if (!newBody.trim()) return
    setIsSending(true)
    try {
      await core.addTaskComment({ task: taskId, body: newBody.trim() })
      setNewBody('')
      await load()
    } catch (e) {
      setError(parseDrfError(e))
    } finally {
      setIsSending(false)
    }
  }

  function beginEdit(c: core.TaskComment) {
    setEditingId(c.id)
    setEditingBody(c.body)
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault()
    if (!editingId) return
    try {
      await core.updateTaskComment(editingId, { body: editingBody })
      setEditingId(null)
      setEditingBody('')
      await load()
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  async function removeComment(id: number) {
    if (!confirm('Удалить комментарий?')) return
    try {
      await core.deleteTaskComment(id)
      await load()
    } catch (e) {
      setError(parseDrfError(e))
    }
  }

  return (
    <section className="card">
      <div className="table-head">
        <h3>Комментарии и история</h3>
        <button className="btn" onClick={() => void load()} disabled={isLoading}>
          Обновить
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {isLoading ? <div className="muted">Загрузка…</div> : null}

      <div className="details-grid">
        <div>
          <h4>Комментарии</h4>
          <form onSubmit={onAdd} className="form">
            <label className="field">
              <span>Текст</span>
              <input value={newBody} onChange={(e) => setNewBody(e.target.value)} />
            </label>
            <button className="btn" disabled={isSending}>
              {isSending ? 'Отправляю…' : 'Добавить'}
            </button>
          </form>

          <div className="list">
            {comments.map((c) => (
              <div key={c.id} className="item">
                <div className="item-head">
                  <div className="muted">
                    {c.author?.email ?? '—'} • {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div className="actions">
                    <button className="btn" onClick={() => beginEdit(c)}>
                      Edit
                    </button>
                    <button className="btn" onClick={() => void removeComment(c.id)}>
                      Delete
                    </button>
                  </div>
                </div>

                {editingId === c.id ? (
                  <form onSubmit={saveEdit} className="form">
                    <label className="field">
                      <span>Текст</span>
                      <input value={editingBody} onChange={(e) => setEditingBody(e.target.value)} />
                    </label>
                    <div className="actions">
                      <button className="btn primary">Сохранить</button>
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setEditingId(null)
                          setEditingBody('')
                        }}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>{c.body}</div>
                )}
              </div>
            ))}
            {!comments.length ? <div className="muted">Комментариев нет.</div> : null}
          </div>
        </div>

        <div>
          <h4>История изменений</h4>
          <div className="list">
            {logs.map((l) => (
              <div key={l.id} className="item">
                <div className="muted">
                  {new Date(l.created_at).toLocaleString()} • {l.actor?.email ?? '—'}
                </div>
                <div className="mono">{l.field_name}</div>
                <div>
                  <span className="muted">было:</span> {l.old_value || '—'}
                </div>
                <div>
                  <span className="muted">стало:</span> {l.new_value || '—'}
                </div>
              </div>
            ))}
            {!logs.length ? <div className="muted">История пустая.</div> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

