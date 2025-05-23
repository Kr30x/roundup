interface Balance {
  userId: string;
  userName: string;
  amount: number;
}

export function calculateBalances(expenses: {
  id: string;
  amount: number;
  paidById: string;
  splits?: { userId: string; amount: number }[];
  paidBy: { name: string };
}[], currentUserId: string, members: { userId: string; user: { name: string } }[]): {
  youOwe: Balance | null;
  youAreOwed: Balance | null;
} {
  const balances = new Map<string, { amount: number; name: string }>();

  // Initialize balances for all members
  members.forEach(member => {
    if (member.userId !== currentUserId) {
      balances.set(member.userId, { amount: 0, name: member.user.name });
    }
  });

  // Calculate balances from expenses
  expenses.forEach(expense => {
    if (!expense.splits) return;
    
    const split = expense.splits.find(s => s.userId === currentUserId);
    
    if (expense.paidById === currentUserId) {
      // You paid, others owe you
      expense.splits.forEach(s => {
        if (s.userId !== currentUserId) {
          const current = balances.get(s.userId)!;
          balances.set(s.userId, {
            ...current,
            amount: current.amount - s.amount,
          });
        }
      });
    } else if (split) {
      // Someone else paid, you owe them
      const current = balances.get(expense.paidById)!;
      balances.set(expense.paidById, {
        ...current,
        amount: current.amount + split.amount,
      });
    }
  });

  // Find the largest debt and credit
  let maxDebt: Balance | null = null;
  let maxCredit: Balance | null = null;

  balances.forEach((value, userId) => {
    if (value.amount > 0 && (!maxDebt || value.amount > maxDebt.amount)) {
      maxDebt = { userId, userName: value.name, amount: value.amount };
    } else if (value.amount < 0 && (!maxCredit || value.amount < maxCredit.amount)) {
      maxCredit = { userId, userName: value.name, amount: -value.amount };
    }
  });

  return {
    youOwe: maxDebt,
    youAreOwed: maxCredit,
  };
} 