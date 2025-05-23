import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { adminDb } from '@/lib/firebase-admin'
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase-admin/firestore'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ squads: [] }, { status: 401 })
    }

    // Get squads where user is a member
    const squadsRef = collection(adminDb, 'squads')
    const membershipQuery = query(squadsRef, where('members', 'array-contains', { 
      email: session.user.email,
      name: session.user.name,
      image: session.user.image
    }))
    
    const squadsSnapshot = await getDocs(membershipQuery)
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
    const squadRef = collection(adminDb, 'squads')
    const newSquad = await addDoc(squadRef, {
      name,
      members: [{
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        role: 'ADMIN'
      }],
      expenses: [],
      balances: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    })

    return NextResponse.json({ 
      id: newSquad.id,
      name,
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