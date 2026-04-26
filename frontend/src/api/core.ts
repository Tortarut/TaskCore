import { http } from './http'

export type Page<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type User = {
  id: number
  email: string
  first_name: string
  last_name: string
  role: 'admin' | 'manager' | 'member'
}

export type Project = {
  id: number
  name: string
  description: string
  owner: User
  created_at: string
  updated_at: string
}

export type Task = {
  id: number
  project: number
  title: string
  description: string
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  author: User | null
  assignee: User | null
  created_at: string
  updated_at: string
}

export type ProjectMember = {
  id: number
  project: number
  user: User
  role: 'member' | 'manager'
  joined_at: string
}

export type TaskComment = {
  id: number
  task: number
  author: User | null
  body: string
  created_at: string
  updated_at: string
}

export type TaskChangeLog = {
  id: number
  task: number
  actor: User | null
  field_name: string
  old_value: string
  new_value: string
  created_at: string
}

function qp(params: Record<string, string | number | boolean | null | undefined>) {
  const out = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue
    out.set(k, String(v))
  }
  const s = out.toString()
  return s ? `?${s}` : ''
}

export async function listProjects(params: { page?: number; search?: string } = {}) {
  const res = await http.get<Page<Project>>(`/projects/${qp(params)}`)
  return res.data
}

export async function createProject(payload: { name: string; description?: string }) {
  const res = await http.post<Project>('/projects/', payload)
  return res.data
}

export async function updateProject(id: number, payload: { name?: string; description?: string }) {
  const res = await http.patch<Project>(`/projects/${id}/`, payload)
  return res.data
}

export async function deleteProject(id: number) {
  await http.delete(`/projects/${id}/`)
}

export async function listProjectMembers(params: { project: number; page?: number }) {
  const res = await http.get<Page<ProjectMember>>(`/project-members/${qp(params)}`)
  return res.data
}

export async function addProjectMember(payload: { project: number; user_id: number; role: 'member' | 'manager' }) {
  const res = await http.post<ProjectMember>('/project-members/', payload)
  return res.data
}

export async function updateProjectMember(id: number, payload: { role: 'member' | 'manager' }) {
  const res = await http.patch<ProjectMember>(`/project-members/${id}/`, payload)
  return res.data
}

export async function deleteProjectMember(id: number) {
  await http.delete(`/project-members/${id}/`)
}

export async function listTasks(params: {
  page?: number
  search?: string
  project?: number
  status?: string
  assignee?: number
  priority?: string
  author?: number
  due_date_after?: string
  due_date_before?: string
  ordering?: string
} = {}) {
  const res = await http.get<Page<Task>>(`/tasks/${qp(params)}`)
  return res.data
}

export async function createTask(payload: {
  project: number
  title: string
  description?: string
  priority?: 'low' | 'medium' | 'high'
  due_date?: string | null
  assignee_id?: number | null
}) {
  const res = await http.post<Task>('/tasks/', payload)
  return res.data
}

export async function updateTask(
  id: number,
  payload: Partial<{
    title: string
    description: string
    status: Task['status']
    priority: Task['priority']
    due_date: string | null
    assignee_id: number | null
  }>,
) {
  const res = await http.patch<Task>(`/tasks/${id}/`, payload)
  return res.data
}

export async function deleteTask(id: number) {
  await http.delete(`/tasks/${id}/`)
}

export async function listTaskComments(params: { task: number; page?: number }) {
  const res = await http.get<Page<TaskComment>>(`/task-comments/${qp(params)}`)
  return res.data
}

export async function addTaskComment(payload: { task: number; body: string }) {
  const res = await http.post<TaskComment>('/task-comments/', payload)
  return res.data
}

export async function updateTaskComment(id: number, payload: { body: string }) {
  const res = await http.patch<TaskComment>(`/task-comments/${id}/`, payload)
  return res.data
}

export async function deleteTaskComment(id: number) {
  await http.delete(`/task-comments/${id}/`)
}

export async function listTaskChangeLogs(params: { task: number; page?: number; field_name?: string }) {
  const res = await http.get<Page<TaskChangeLog>>(`/task-change-logs/${qp(params)}`)
  return res.data
}

