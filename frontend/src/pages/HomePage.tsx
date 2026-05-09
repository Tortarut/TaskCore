import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import * as core from '../api/core'
import { useAuth } from '../auth/AuthContext'
import { taskPriorityLabel, taskStatusLabel } from '../ui/labels'
import { parseDrfError } from '../ui/parseDrfError'

function mergeUserTasks(a: core.Task[], b: core.Task[]): core.Task[] {
  const byId = new Map<number, core.Task>()
  for (const t of [...a, ...b]) {
    if (!byId.has(t.id)) byId.set(t.id, t)
  }
  return Array.from(byId.values()).sort(
    (x, y) => new Date(y.updated_at).getTime() - new Date(x.updated_at).getTime(),
  )
}

function taskRelation(t: core.Task, userId: number): string {
  const asAssignee = t.assignee?.id === userId
  const asAuthor = t.author?.id === userId
  if (asAssignee && asAuthor) return 'Назначена вам · вы автор'
  if (asAssignee) return 'Назначена вам'
  return 'Создана вами'
}

export function HomePage() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<core.Project[]>([])
  const [tasks, setTasks] = useState<core.Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const projectNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  useEffect(() => {
    if (!user) {
      setIsLoading(false)
      return
    }
    const uid = user.id
    let cancelled = false
    setIsLoading(true)
    setError(null)
    Promise.all([
      core.listProjects({ page: 1 }),
      core.listTasks({ assignee: uid, page: 1, ordering: '-updated_at' }),
      core.listTasks({ author: uid, page: 1, ordering: '-updated_at' }),
    ])
      .then(([projPage, assigneeTasks, authorTasks]) => {
        if (cancelled) return
        setProjects(projPage.results)
        setTasks(mergeUserTasks(assigneeTasks.results, authorTasks.results))
      })
      .catch((e) => {
        if (!cancelled) setError(parseDrfError(e))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  return (
    <div className="stack">
      <div className="page-head">
        <h2>Главная</h2>
      </div>

      <section className="card panel">
        <h3>О TaskCore</h3>
        <p style={{ margin: '8px 0 0', lineHeight: 1.55 }}>
          TaskCore — это веб-приложение для командной работы: проекты с участниками и ролями, задачи со статусами,
          приоритетами и сроками, назначение исполнителей, комментарии и история изменений. На этой странице собраны задачи,
          которые к вам относятся: назначенные вам и созданные вами.
        </p>
        <p className="muted" style={{ margin: '12px 0 0', fontSize: 14 }}>
          Разделы: <Link to="/app/projects">проекты</Link> · <Link to="/app/tasks">все задачи</Link>
        </p>
      </section>

      <section className="card panel">
        <div className="table-head">
          <h3>Ваши задачи</h3>
          {!isLoading && user ? (
            <span className="muted" style={{ fontSize: 14 }}>
              {tasks.length ? `${tasks.length} шт.` : 'пока пусто'}
            </span>
          ) : null}
        </div>

        {error ? <div className="error">{error}</div> : null}
        {isLoading ? <div className="muted">Загрузка…</div> : null}

        {!isLoading && user ? (
          <div className="list-rows">
            {tasks.map((t) => (
              <div key={t.id} className="list-row">
                <div className="list-row__id">#{t.id}</div>
                <div className="list-row__main">
                  <div className="list-row__title">{t.title}</div>
                  {t.description ? <div className="list-row__desc">{t.description}</div> : null}
                  <div className="list-row__meta">
                    <span className="task-status-pill">{taskStatusLabel(t.status)}</span>
                    <span>Приоритет: {taskPriorityLabel(t.priority)}</span>
                    <span>Срок: {t.due_date ?? '—'}</span>
                    <span>{taskRelation(t, user.id)}</span>
                  </div>
                </div>
                <div className="list-row__side">
                  <span className="muted" style={{ fontSize: 13 }}>
                    Проект
                  </span>
                  <Link className="strong" to={`/app/projects/${t.project}`}>
                    {projectNames.get(t.project) ?? `#${t.project}`}
                  </Link>
                </div>
                <div className="list-row__actions">
                  <Link className="btn primary" to={`/app/tasks/${t.id}`}>
                    Открыть
                  </Link>
                </div>
              </div>
            ))}
            {!tasks.length ? (
              <div className="muted">
                Нет задач, где вы автор или исполнитель. Создайте задачу в разделе{' '}
                <Link to="/app/tasks">Задачи</Link> или дождитесь назначения.
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  )
}
