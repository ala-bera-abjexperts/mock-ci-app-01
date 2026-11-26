'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type FormEvent } from 'react'

import type { Task, TaskStatus } from '@/lib/tasks'

const STATUS_LABELS: Record<TaskStatus, string> = { todo: 'To do', doing: 'In progress', done: 'Done' }
const STATUS_CLASS: Record<TaskStatus, string> = { todo: '', doing: 'running', done: 'passed' }

interface Draft {
  title: string
  notes: string
}

const readError = async (response: Response) =>
  ((await response.json().catch(() => null)) as { error?: string } | null)?.error ?? 'Something went wrong'

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<TaskStatus | ''>('')
  const [draft, setDraft] = useState<Draft>({ title: '', notes: '' })
  const [editing, setEditing] = useState<{ id: string } & Draft | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ ...(query ? { q: query } : {}), ...(status ? { status } : {}) })
    const response = await fetch(`/api/tasks?${params}`, { cache: 'no-store' }).catch(() => null)

    if (response?.status === 401) return router.push('/login')
    if (!response?.ok) return setError('The tasks could not be loaded')

    setTasks((await response.json()) as Task[])
    setError('')
    setLoaded(true)
  }, [query, status, router])

  useEffect(() => {
    // A short pause so typing in the search box does not send a request per key.
    const timer = setTimeout(() => void load(), 250)

    return () => clearTimeout(timer)
  }, [load])

  // Every change goes through here, so the list always shows what the server saved.
  const send = async (url: string, method: string, body?: object) => {
    setBusy(true)
    setError('')

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {})
      })

      if (response.status === 401) {
        router.push('/login')

        return false
      }

      if (!response.ok) {
        setError(await readError(response))

        return false
      }

      await load()

      return true
    } catch {
      setError('The server could not be reached')

      return false
    } finally {
      setBusy(false)
    }
  }

  const add = async (event: FormEvent) => {
    event.preventDefault()
    if (await send('/api/tasks', 'POST', draft)) setDraft({ title: '', notes: '' })
  }

  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (editing && (await send(`/api/tasks/${editing.id}`, 'PATCH', { title: editing.title, notes: editing.notes }))) {
      setEditing(null)
    }
  }

  const remove = async (task: Task) => {
    if (window.confirm(`Delete "${task.title}"?`)) await send(`/api/tasks/${task.id}`, 'DELETE')
  }

  return (
    <main>
      <div className='row'>
        <h1>My tasks</h1>
        <Link href='/'>← Jobs</Link>
      </div>
      <p className='muted'>Your own list: add tasks, move them through To do, In progress and Done, and remove them.</p>

      <form className='card form' onSubmit={event => void add(event)}>
        <label>
          Title
          <input
            value={draft.title}
            maxLength={120}
            required
            placeholder='What needs doing?'
            onChange={event => setDraft({ ...draft, title: event.target.value })}
          />
        </label>
        <label>
          Notes
          <textarea
            value={draft.notes}
            maxLength={1000}
            rows={2}
            placeholder='Optional'
            onChange={event => setDraft({ ...draft, notes: event.target.value })}
          />
        </label>
        <div>
          <button className='button' type='submit' disabled={busy || !draft.title.trim()}>
            Add task
          </button>
        </div>
      </form>

      <div className='form tasks-toolbar'>
        <label>
          Search
          <input value={query} placeholder='Title or notes' onChange={event => setQuery(event.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={event => setStatus(event.target.value as TaskStatus | '')}>
            <option value=''>All</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p className='status failed' role='alert'>
          {error}
        </p>
      )}

      <h2>
        Tasks ({tasks.length})
      </h2>
      {loaded && tasks.length === 0 && (
        <p className='muted'>{query || status ? 'No task matches the search.' : 'No tasks yet. Add your first one above.'}</p>
      )}

      {tasks.map(task =>
        editing?.id === task.id ? (
          <form key={task.id} className='card form' onSubmit={event => void save(event)}>
            <label>
              Title
              <input
                value={editing.title}
                maxLength={120}
                required
                onChange={event => setEditing({ ...editing, title: event.target.value })}
              />
            </label>
            <label>
              Notes
              <textarea
                value={editing.notes}
                maxLength={1000}
                rows={2}
                onChange={event => setEditing({ ...editing, notes: event.target.value })}
              />
            </label>
            <div className='row'>
              <button className='button' type='submit' disabled={busy || !editing.title.trim()}>
                Save
              </button>
              <button className='button secondary' type='button' onClick={() => setEditing(null)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <section key={task.id} className='card'>
            <div className='row'>
              <strong>{task.title}</strong>
              <span className={`status ${STATUS_CLASS[task.status]}`}>{STATUS_LABELS[task.status]}</span>
            </div>
            {task.notes && <p>{task.notes}</p>}
            <div className='row'>
              <span className='muted'>Updated {new Date(task.updatedAt).toLocaleString()}</span>
              <div className='row'>
                <select
                  className='select'
                  aria-label={`Status of ${task.title}`}
                  value={task.status}
                  disabled={busy}
                  onChange={event =>
                    void send(`/api/tasks/${task.id}`, 'PATCH', { status: event.target.value as TaskStatus })
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  className='button secondary'
                  type='button'
                  disabled={busy}
                  onClick={() => setEditing({ id: task.id, title: task.title, notes: task.notes })}
                >
                  Edit
                </button>
                <button className='button secondary' type='button' disabled={busy} onClick={() => void remove(task)}>
                  Delete
                </button>
              </div>
            </div>
          </section>
        )
      )}
    </main>
  )
}
