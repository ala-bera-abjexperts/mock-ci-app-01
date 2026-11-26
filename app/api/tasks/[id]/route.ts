import { NextResponse } from 'next/server'

import { getSessionUserId } from '@/lib/session'
import { deleteTask, isTaskStatus, updateTask, type TaskChanges } from '@/lib/tasks'
import { validateTaskNotes, validateTaskTitle } from '@/lib/validate'

interface Context {
  params: Promise<{ id: string }>
}

const notLoggedIn = () => NextResponse.json({ error: 'Log in first' }, { status: 401 })

// Someone else's task answers the same as a missing one, so ids never reveal other users' tasks.
const notFound = () => NextResponse.json({ error: 'Task not found' }, { status: 404 })

/** Only the fields that were sent and are strings; anything else in the body is ignored. */
async function readChanges(request: Request): Promise<TaskChanges | { error: string }> {
  let body: unknown = null

  try {
    body = await request.json()
  } catch {
    // A missing or broken body changes nothing.
  }

  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const changes: TaskChanges = {}

  if (typeof source.title === 'string') {
    const error = validateTaskTitle(source.title)

    if (error) return { error }
    changes.title = source.title
  }

  if (typeof source.notes === 'string') {
    const error = validateTaskNotes(source.notes)

    if (error) return { error }
    changes.notes = source.notes
  }

  if (source.status !== undefined) {
    if (typeof source.status !== 'string' || !isTaskStatus(source.status)) {
      return { error: 'Status must be todo, doing or done' }
    }

    changes.status = source.status
  }

  return Object.keys(changes).length > 0 ? changes : { error: 'Send a title, notes or status to change' }
}

export async function PATCH(request: Request, { params }: Context) {
  const userId = await getSessionUserId()

  if (!userId) return notLoggedIn()

  const changes = await readChanges(request)

  if ('error' in changes) return NextResponse.json({ error: changes.error }, { status: 400 })

  const task = updateTask(userId, (await params).id, changes)

  return task ? NextResponse.json(task) : notFound()
}

export async function DELETE(_request: Request, { params }: Context) {
  const userId = await getSessionUserId()

  if (!userId) return notLoggedIn()

  return deleteTask(userId, (await params).id) ? NextResponse.json({ ok: true }) : notFound()
}
