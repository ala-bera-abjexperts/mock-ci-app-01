import { NextResponse } from 'next/server'

import { getSessionUserId } from '@/lib/session'
import { createTask, isTaskStatus, listTasks } from '@/lib/tasks'
import { readFields, validateTaskNotes, validateTaskTitle } from '@/lib/validate'

const notLoggedIn = () => NextResponse.json({ error: 'Log in first' }, { status: 401 })

export async function GET(request: Request) {
  const userId = await getSessionUserId()

  if (!userId) return notLoggedIn()

  const params = new URL(request.url).searchParams
  const status = params.get('status') ?? ''

  return NextResponse.json(listTasks(userId, params.get('q') ?? '', isTaskStatus(status) ? status : undefined))
}

export async function POST(request: Request) {
  const userId = await getSessionUserId()

  if (!userId) return notLoggedIn()

  const { title, notes } = await readFields(request, ['title', 'notes'])
  const error = validateTaskTitle(title) ?? validateTaskNotes(notes)

  if (error) return NextResponse.json({ error }, { status: 400 })

  return NextResponse.json(createTask(userId, title, notes), { status: 201 })
}
