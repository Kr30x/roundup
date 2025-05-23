import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-config';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const params = await context.params;

  try {
    // Get all expenses and members for the squad
    const squad = await prisma.squad.findUnique({
      where: { id: params.id },
      include: {
        members: {
          include: { user: true }
        },
        expenses: {
          include: {
            splits: true
          }
        }
      }
    });

    if (!squad) {
      return new NextResponse('Squad not found', { status: 404 });
    }

    // Calculate net balances between all pairs of users
    const balances = new Map<string, Map<string, number>>();

    // Initialize balance map for each user
    squad.members.forEach(member1 => {
      balances.set(member1.userId, new Map());
      squad.members.forEach(member2 => {
        if (member1.userId !== member2.userId) {
          balances.get(member1.userId)!.set(member2.userId, 0);
        }
      });
    });

    // Calculate balances from expenses
    squad.expenses.forEach(expense => {
      if (!expense.splits) return;

      expense.splits.forEach(split => {
        if (split.userId === expense.paidById) return; // Skip payer's own split

        // Only record the balance from the recipient's perspective
        // Positive amount means they owe money to the payer
        const owedByBalance = balances.get(split.userId)!;
        const currentBalance = owedByBalance.get(expense.paidById) || 0;
        owedByBalance.set(expense.paidById, currentBalance + split.amount);
      });
    });

    // Store balances in database
    await prisma.$transaction([
      // First delete existing balances
      prisma.balance.deleteMany({
        where: { squadId: params.id }
      }),
      // Then create new ones
      ...Array.from(balances.entries()).flatMap(([fromUserId, userBalances]) =>
        Array.from(userBalances.entries())
          .filter(([, amount]) => amount !== 0)
          .map(([toUserId, amount]) =>
            prisma.balance.create({
              data: {
                squadId: params.id,
                fromUserId,
                toUserId,
                amount,
              }
            })
          )
      )
    ]);

    // Return the updated balances
    const updatedBalances = await prisma.balance.findMany({
      where: { squadId: params.id },
      include: {
        fromUser: { select: { name: true } },
        toUser: { select: { name: true } }
      }
    });

    return NextResponse.json(updatedBalances);
  } catch (error) {
    console.error('Failed to update balances:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 