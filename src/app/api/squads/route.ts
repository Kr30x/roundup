import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ squads: [] }, { status: 401 })
    }

    // Check if adminDb is properly initialized
    if (!adminDb || typeof adminDb.collection !== 'function') {
      console.error('Firebase Admin not properly initialized')
      return NextResponse.json({ squads: [] }, { status: 500 })
    }

    // Get squads where user is a member
    const squadsSnapshot = await adminDb.collection('squads')
      .where('members', 'array-contains', { 
        email: session.user.email,
        name: session.user.name,
        image: session.user.image
      })
      .get()
    
    const squads = squadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    return NextResponse.json({ squads })
  } catch (error) {
    console.error('Failed to fetch squads:', error)
    return NextResponse.json({ squads: [] }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create new squad
    const newSquad = await adminDb.collection('squads').add({
      name,
      currency: 'USD', // Default to USD if not specified
      members: [{
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: 'ADMIN'
      }],
      expenses: [],
      balances: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    return NextResponse.json({ 
      id: newSquad.id,
      name,
      currency: 'USD',
      members: [{
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: 'ADMIN'
      }],
      expenses: [],
      balances: []
    })
  } catch (error) {
    console.error('Failed to create squad:', error)
    return NextResponse.json({ error: 'Failed to create squad' }, { status: 500 })
  }
} 