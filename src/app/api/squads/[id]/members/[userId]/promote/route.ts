import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
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
      return NextResponse.json({ error: 'Only admins can promote members' }, { status: 403 });
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

    // Update member role to admin
    const updatedMember = await prisma.squadMember.update({
      where: {
        id: member.id,
      },
      data: {
        role: 'ADMIN',
      },
    });

    return NextResponse.json({ success: true, member: updatedMember });
  } catch (error) {
    console.error('Failed to promote member:', error);
    return NextResponse.json({ error: 'Failed to promote member' }, { status: 500 });
  }
} 