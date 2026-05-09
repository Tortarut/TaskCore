import { type FormEvent, useEffect, useState } from 'react'

import * as core from '../api/core'
import { formatChangeLogValue, taskChangeFieldLabel } from '../ui/labels'
import { parseDrfError } from '../ui/parseDrfError'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

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
    <section className="card panel">
      <div className="table-head">
        <h3>Комментарии и история</h3>
        <button type="button" className="btn" onClick={() => void load()} disabled={isLoading}>
          Обновить
        </button>
      </div>

      {error ? <div className="error">{error}</div> : null}
      {isLoading ? <div className="muted">Загрузка…</div> : null}

      <div className="task-details-columns">
        <div className="task-details-column">
          <h4>Комментарии</h4>

          <div className="comment-compose">
            <form onSubmit={onAdd} className="form" style={{ marginTop: 0 }}>
              <label className="field">
                <span>Новый комментарий</span>
                <textarea
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="Напишите текст…"
                  rows={4}
                />
              </label>
              <button type="submit" className="btn primary" disabled={isSending}>
                {isSending ? 'Отправляю…' : 'Отправить'}
              </button>
            </form>
          </div>

          <div className="thread-list">
            {comments.map((c) => (
              <article key={c.id} className="thread-card">
                <div className="thread-card__top">
                  <span className="thread-card__id">#{c.id}</span>
                  <div className="thread-card__meta">
                    <strong>{c.author?.email ?? 'Неизвестный автор'}</strong>
                    <time dateTime={c.created_at}>{formatWhen(c.created_at)}</time>
                  </div>
                  <div className="thread-card__actions">
                    <button type="button" className="btn" onClick={() => beginEdit(c)}>
                      Редактировать
                    </button>
                    <button type="button" className="btn" onClick={() => void removeComment(c.id)}>
                      Удалить
                    </button>
                  </div>
                </div>

                {editingId === c.id ? (
                  <div className="thread-card__edit">
                    <form onSubmit={saveEdit} className="form" style={{ marginTop: 0 }}>
                      <label className="field">
                        <span>Текст комментария</span>
                        <textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={5} />
                      </label>
                      <div className="actions" style={{ justifyContent: 'flex-start' }}>
                        <button type="submit" className="btn primary">
                          Сохранить
                        </button>
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
                  </div>
                ) : (
                  <div className="thread-card__body">{c.body}</div>
                )}
              </article>
            ))}
            {!comments.length ? <div className="muted">Пока нет комментариев — будьте первым.</div> : null}
          </div>
        </div>

        <div className="task-details-column">
          <h4>История изменений</h4>

          <div className="history-list">
            {logs.map((l) => (
              <article key={l.id} className="history-card">
                <div className="history-card__head">
                  <span className="history-card__time">{formatWhen(l.created_at)}</span>
                  <span className="field-pill">{taskChangeFieldLabel(l.field_name)}</span>
                </div>
                <div className="history-card__actor">
                  <span>Кто изменил: </span>
                  {l.actor?.email ?? '—'}
                </div>
                <div className="history-diff">
                  <div className="history-diff__box history-diff__box--old">
                    <div className="history-diff__label">Было</div>
                    <div className="history-diff__value">{formatChangeLogValue(l.field_name, l.old_value)}</div>
                  </div>
                  <div className="history-diff__box history-diff__box--new">
                    <div className="history-diff__label">Стало</div>
                    <div className="history-diff__value">{formatChangeLogValue(l.field_name, l.new_value)}</div>
                  </div>
                </div>
              </article>
            ))}
            {!logs.length ? <div className="muted">Записей пока нет — изменения по задаче появятся здесь.</div> : null}
          </div>
        </div>
      </div>
    </section>
  )
}
