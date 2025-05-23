import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getSquad, addMemberToSquad } from '@/lib/firebase-utils'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email || !session?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params

    // Check if squad exists
    const squad = await getSquad(params.id)
    if (!squad) {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 })
    }

    // Check if user is already a member
    if (squad.members.some(member => member.email === session.user.email)) {
      return NextResponse.json({ error: 'Already a member' }, { status: 400 })
    }

    // Add user to squad
    await addMemberToSquad(params.id, {
      email: session.user.email,
      name: session.user.name,
      image: session.user.image || null
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to join squad:', error)
    return NextResponse.json({ error: 'Failed to join squad' }, { status: 500 })
  }
} 