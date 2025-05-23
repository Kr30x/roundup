import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; userId: string } }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if the requester is an admin
    const requesterMember = await prisma.squadMember.findFirst({
      where: {
        squadId: params.id,
        userId: session.user.id,
        role: 'ADMIN',
      },
    });

    if (!requesterMember) {
      return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
    }

    // Don't allow admins to remove themselves
    if (params.userId === session.user.id) {
      return NextResponse.json({ error: 'Admins cannot remove themselves' }, { status: 400 });
    }

    // Find the member first to ensure they exist
    const member = await prisma.squadMember.findFirst({
      where: {
        squadId: params.id,
        userId: params.userId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Remove the member
    await prisma.squadMember.delete({
      where: {
        id: member.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 });
  }
} 