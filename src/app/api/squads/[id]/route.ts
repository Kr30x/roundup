import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const params = await context.params

  try {
    // Check if user is admin of the squad
    const member = await prisma.squadMember.findFirst({
      where: {
        squadId: params.id,
        userId: session.user.id,
        role: 'ADMIN',
      },
    })

    if (!member) {
      return new NextResponse('Unauthorized - Only admins can delete squads', { status: 403 })
    }

    // Delete all related data in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete balances first
      await tx.balance.deleteMany({
        where: { squadId: params.id },
      })

      // Delete splits before expenses
      await tx.split.deleteMany({
        where: {
          expense: {
            squadId: params.id,
          },
        },
      })

      // Delete expenses
      await tx.expense.deleteMany({
        where: { squadId: params.id },
      })

      // Delete invite codes
      await tx.inviteCode.deleteMany({
        where: { squadId: params.id },
      })

      // Delete squad members
      await tx.squadMember.deleteMany({
        where: { squadId: params.id },
      })

      // Finally, delete the squad
      await tx.squad.delete({
        where: { id: params.id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete squad:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Check if user is admin of the squad
    const member = await prisma.squadMember.findFirst({
      where: {
        squadId: params.id,
        userId: session.user.id,
        role: 'ADMIN',
      },
    })

    if (!member) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name } = await request.json()

    // Update squad name
    const squad = await prisma.squad.update({
      where: {
        id: params.id,
      },
      data: {
        name,
      },
    })

    return NextResponse.json(squad)
  } catch (error) {
    console.error('Failed to update squad:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 