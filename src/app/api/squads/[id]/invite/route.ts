import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-config'
import { getSquad } from '@/lib/firebase-utils'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get squad ID from params
    const { id: squadId } = await context.params

    // Get squad
    const squad = await getSquad(squadId)
    
    if (!squad) {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 })
    }

    // Check if user is member of squad
    const isMember = squad.members.some(m => m.email === session.user.email)
    if (!isMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate invite link using the request URL
    const baseUrl = new URL(request.url).origin
    const inviteLink = `${baseUrl}/invite/${squadId}`

    return NextResponse.json({ inviteLink })
  } catch (error) {
    console.error('Failed to get invite link:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 