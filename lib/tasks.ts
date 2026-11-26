import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const TASK_STATUSES = ['todo', 'doing', 'done'] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]

export interface Task {
  id: string
  userId: string
  title: string
  notes: string
  status: TaskStatus
  createdAt: string
  updatedAt: string
}

export interface TaskChanges {
  title?: string
  notes?: string
  status?: TaskStatus
}

export const isTaskStatus = (value: string): value is TaskStatus =>
  (TASK_STATUSES as readonly string[]).includes(value)

// Same data folder as the users, so MOCKCI_DATA_DIR moves both.
const dataDir = () => process.env.MOCKCI_DATA_DIR || join(process.cwd(), 'data')
const tasksFile = () => join(dataDir(), 'tasks.json')

// ponytail: whole-file read and write like users.json, fine for one dev server.
function readTasks(): Task[] {
  const file = tasksFile()

  return existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Task[]) : []
}

function writeTasks(tasks: Task[]): void {
  const file = tasksFile()
  const temp = `${file}.${process.pid}.tmp`

  mkdirSync(dataDir(), { recursive: true })

  // Rename is atomic, so a crash mid-write never leaves a half-written file.
  writeFileSync(temp, JSON.stringify(tasks, null, 2))
  renameSync(temp, file)
}

/** The user's own tasks, newest first, optionally narrowed by text and status. */
export function listTasks(userId: string, query = '', status?: TaskStatus): Task[] {
  const text = query.trim().toLowerCase()

  return readTasks()
    .filter(task => task.userId === userId)
    .filter(task => !status || task.status === status)
    .filter(task => !text || `${task.title} ${task.notes}`.toLowerCase().includes(text))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function createTask(userId: string, title: string, notes: string): Task {
  const tasks = readTasks()
  const now = new Date().toISOString()
  const task: Task = {
    id: randomUUID(),
    userId,
    title: title.trim(),
    notes: notes.trim(),
    status: 'todo',
    createdAt: now,
    updatedAt: now
  }

  tasks.push(task)
  writeTasks(tasks)

  return task
}

/** Null when the task does not exist or belongs to someone else. */
export function updateTask(userId: string, id: string, changes: TaskChanges): Task | null {
  const tasks = readTasks()
  const task = tasks.find(item => item.id === id && item.userId === userId)

  if (!task) return null

  if (changes.title !== undefined) task.title = changes.title.trim()
  if (changes.notes !== undefined) task.notes = changes.notes.trim()
  if (changes.status !== undefined) task.status = changes.status
  task.updatedAt = new Date().toISOString()
  writeTasks(tasks)

  return task
}

/** False when the task does not exist or belongs to someone else. */
export function deleteTask(userId: string, id: string): boolean {
  const tasks = readTasks()
  const kept = tasks.filter(item => !(item.id === id && item.userId === userId))

  if (kept.length === tasks.length) return false

  writeTasks(kept)

  return true
}
