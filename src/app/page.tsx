'use client'

import { useSession } from 'next-auth/react'
import { signIn } from 'next-auth/react'
import { CreateSquadDialog } from '@/components/create-squad-dialog'
import { JoinSquadDialog } from '@/components/join-squad-dialog'
import { useEffect, useState } from 'react'
import { Users, DollarSign, Crown, Trash2, UserPlus, Pencil, UserMinus, Link, Check, HomeIcon, ArrowLeftRight, RefreshCw, Utensils } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { ExpenseDialog } from '@/components/expense-dialog'
import { getSquads, deleteSquad, updateSquadName, removeMemberFromSquad, promoteMemberToAdmin, deleteExpense, settleUp, updateSquadCurrency } from '@/lib/firebase-utils'
import { motion, AnimatePresence } from 'framer-motion'

import { Logo } from '@/components/logo'
import { InviteDialog } from '@/components/invite-dialog'

interface Squad {
  id: string;
  name: string;
  currency: string;
  members: {
    email: string;
    name: string;
    image: string | null;
    role: 'ADMIN' | 'MEMBER';
  }[];
  expenses: {
    id: string;
    amount: number;
    description: string;
    date: string;
    paidById: string;
    paidBy: {
      name: string;
    };
    splits: {
      userId: string;
      amount: number;
    }[];
    isRestaurantMode?: boolean;
    items?: {
      id: string;
      name: string;
      price: number;
      quantity: number;
      assignments: {
        userId: string;
        quantity: number;
      }[];
    }[];
  }[];
  balances: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    fromUser: {
      name: string;
    };
    toUser: {
      name: string;
    };
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram' },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat' },
  { code: 'KGS', symbol: 'с', name: 'Kyrgyzstani Som' },
  { code: 'TJS', symbol: 'ЅM', name: 'Tajikistani Somoni' },
  { code: 'TMT', symbol: 'm', name: 'Turkmenistani Manat' },
  { code: 'UZS', symbol: 'soʻm', name: 'Uzbekistani Som' },
  { code: 'MDL', symbol: 'L', name: 'Moldovan Leu' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
] as const;

// Helper function to format currency
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

// Loading skeleton for expenses
const ExpenseSkeleton = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center justify-between rounded-lg border p-4"
  >
    <div className="flex items-center gap-3">
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
      </div>
    </div>
    <div className="text-right">
      <div className="h-4 w-16 rounded bg-muted animate-pulse" />
      <div className="mt-1 h-3 w-20 rounded bg-muted animate-pulse" />
    </div>
  </motion.div>
);

// Loading skeleton for squads
const SquadSkeleton = () => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="rounded-md border p-3"
  >
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-4 w-24 rounded bg-muted animate-pulse" />
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-4 rounded bg-muted animate-pulse" />
    </div>
  </motion.div>
);

export default function Home() {
  const { data: session, status } = useSession()
  const [squads, setSquads] = useState<Squad[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSquad, setSelectedSquad] = useState<Squad | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [mobileView, setMobileView] = useState<'squads' | 'details'>('squads')
  const [deletingExpenses, setDeletingExpenses] = useState<Set<string>>(new Set())
  const [settlingBalances, setSettlingBalances] = useState<Set<string>>(new Set())

  // Calculate total balance from Firebase balances
  const userBalances = selectedSquad && session?.user?.email ? {
    total: selectedSquad.balances.reduce((total, balance) => {
      if (balance.fromUserId === session.user.email) {
        // You owe money to someone
        return total - balance.amount;
      }
      if (balance.toUserId === session.user.email) {
        // Someone owes you money
        return total + balance.amount;
      }
      return total;
    }, 0)
  } : { total: 0 };

  const fetchSquads = async () => {
    if (isRefreshing || !session?.user?.email) {
      console.log('Skipping fetch - isRefreshing:', isRefreshing, 'session:', session);
      return;
    }
    
    try {
      setIsRefreshing(true);
      console.log('Fetching squads for user:', session.user.email);
      
      const fetchedSquads = await getSquads(session.user.email);
      console.log('Fetched squads:', fetchedSquads);
      
      if (!Array.isArray(fetchedSquads)) {
        console.error('Expected squads to be an array but got:', fetchedSquads);
        throw new Error('Invalid squads data');
      }

      // Transform the data to ensure all required fields are present
      const transformedSquads: Squad[] = fetchedSquads.map(squad => ({
        ...squad,
        expenses: squad.expenses.map(expense => ({
          ...expense,
          isRestaurantMode: expense.isRestaurantMode || false,
          items: expense.items || []
        }))
      }));
      
      setSquads(transformedSquads);
      
      if (selectedSquad) {
        console.log('Updating selected squad');
        const updatedSelectedSquad = transformedSquads.find(s => s.id === selectedSquad.id);
        setSelectedSquad(updatedSelectedSquad || null);
      } else if (transformedSquads.length > 0) {
        console.log('Setting initial selected squad');
        setSelectedSquad(transformedSquads[0]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch squads:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      setSquads([]);
      setSelectedSquad(null);
      setLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Add immediate fetch option
  const refreshData = () => {
    setIsRefreshing(true);
    fetchSquads().finally(() => setIsRefreshing(false));
  };

  useEffect(() => {
    if (session?.user) {
      fetchSquads()
    }
  }, [session]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDeleteSquad = async (squadId: string) => {
    if (!confirm('Are you sure you want to delete this squad?')) return;

    try {
      await deleteSquad(squadId);
      refreshData();
      setSelectedSquad(null);
    } catch (error) {
      console.error('Failed to delete squad:', error);
      alert('Failed to delete squad');
    }
  };

  const handleUpdateName = async (squadId: string) => {
    try {
      await updateSquadName(squadId, editedName);
      refreshData();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update squad name:', error);
      alert('Failed to update name');
    }
  };

  const handlePromoteMember = async (squadId: string, memberEmail: string) => {
    try {
      await promoteMemberToAdmin(squadId, memberEmail);
      refreshData();
    } catch (error) {
      console.error('Failed to promote member:', error);
      alert('Failed to promote member');
    }
  };

  const handleRemoveMember = async (squadId: string, memberEmail: string, memberName: string) => {
    const isSelfRemoval = memberEmail === session?.user?.email;
    if (!confirm(isSelfRemoval ? 'Do you want to leave this squad?' : `Are you sure you want to remove ${memberName} from the squad?`)) return;
    
    try {
      await removeMemberFromSquad(squadId, memberEmail);
      refreshData();
      if (isSelfRemoval) {
        setSelectedSquad(null);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    }
  };

  const handleSettleUp = async (squadId: string, otherUserId: string) => {
    try {
      setSettlingBalances(prev => new Set([...prev, otherUserId]));
      await settleUp(squadId, otherUserId);
      refreshData();
    } catch (error) {
      console.error('Failed to settle up:', error);
      alert('Failed to settle up');
    } finally {
      setSettlingBalances(prev => {
        const newSet = new Set(prev);
        newSet.delete(otherUserId);
        return newSet;
      });
    }
  };

  const handleCopyInvite = async (squadId: string) => {
    try {
      const response = await fetch(`/api/squads/${squadId}/invite`)
      const data = await response.json()
      await navigator.clipboard.writeText(data.inviteLink)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to get invite link:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    )
  }

  if (session?.user) {
  return (
      <div className="flex h-[calc(100vh-4rem)] fixed inset-x-0 bottom-0">
        {/* Squads Sidebar - Hidden on mobile when viewing details */}
        <div className={`w-80 border-r bg-muted/10 flex flex-col ${mobileView === 'details' ? 'hidden md:flex' : 'w-full md:w-80'}`}>
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6"
          >
            <h2 className="mb-4 text-xl font-medium">Your Squads</h2>
            <p className="mb-6 text-sm text-muted-foreground">Create or join squads to start splitting bills.</p>
            <div className="space-y-4">
              <CreateSquadDialog onSquadCreated={fetchSquads} />
              <JoinSquadDialog onSquadJoined={fetchSquads} />
            </div>
          </motion.div>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {loading ? (
              <div className="space-y-3">
                <SquadSkeleton />
                <SquadSkeleton />
                <SquadSkeleton />
              </div>
            ) : squads.length > 0 ? (
              <div className="space-y-2">
                {squads.map(squad => (
                  <motion.button
                    key={squad.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted ${selectedSquad?.id === squad.id ? 'bg-muted' : ''}`}
                    onClick={() => {
                      setSelectedSquad(squad);
                      setMobileView('details');
                    }}
                  >
                    <div>
                      <div className="font-medium">{squad.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {squad.members.length} {squad.members.length === 1 ? 'member' : 'members'} · {squad.currency}
                      </div>
                    </div>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </motion.button>
                ))}
              </div>
            ) : (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-muted-foreground"
              >
                No squads yet
              </motion.p>
            )}
          </div>
        </div>
        
        {/* Main Content Area - Hidden on mobile when viewing squads list */}
        <div className={`flex-1 flex flex-col ${mobileView === 'squads' ? 'hidden md:flex' : 'flex'}`}>
          <div className="flex-1 overflow-y-auto p-6">
            {selectedSquad ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isEditing ? (
                      <form onSubmit={(e) => {
                        e.preventDefault()
                        handleUpdateName(selectedSquad.id)
                      }} className="flex items-center gap-2">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="h-9"
                        />
                        <Button type="submit" size="sm">Save</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                          Cancel
                        </Button>
                      </form>
                    ) : (
                      <>
                      <h2 className="text-2xl font-medium">{selectedSquad.name}</h2>
                        {selectedSquad.members.find(m => m.email === session.user.email && m.role === 'ADMIN') && (
                          <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditedName(selectedSquad.name)
                          setIsEditing(true)
                        }}
                        className="rounded-full p-1 hover:bg-muted"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                            <Select 
                              defaultValue={selectedSquad.currency}
                              onValueChange={async (value) => {
                                try {
                                  await updateSquadCurrency(selectedSquad.id, value);
                                  refreshData();
                                } catch (error) {
                                  console.error('Failed to update currency:', error);
                                  alert('Failed to update currency');
                                }
                              }}
                            >
                              <SelectTrigger className="w-[140px] h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {CURRENCIES.map(curr => (
                                  <SelectItem key={curr.code} value={curr.code}>
                                    {curr.symbol} {curr.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopyInvite(selectedSquad.id)}
                      className="transition-all duration-200"
                    >
                      {isCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Link className="h-4 w-4" />
                      )}
                    </Button>
                    {selectedSquad.members.find(m => m.email === session.user.email && m.role === 'ADMIN') ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSquad(selectedSquad.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveMember(selectedSquad.id, session.user.email, session.user.name)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Members */}
                <div>
                  <h3 className="mb-4 text-lg font-medium">Members</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedSquad.members.map((member, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {selectedSquad.members.find(m => m.email === session.user.email && m.role === 'ADMIN') && 
                         member.email !== session.user.email ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div className="flex items-center gap-2.5 cursor-pointer rounded-full px-3 py-1.5 hover:bg-muted transition-colors">
                                <Avatar className="border-2 border-background">
                                  <AvatarImage src={member.image || undefined} />
                                  <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex items-center gap-1.5">
                                  <span>{member.name}</span>
                                  {member.role === 'ADMIN' && (
                                    <Crown className="h-4 w-4 text-yellow-500" />
                                  )}
                                </div>
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handlePromoteMember(selectedSquad.id, member.email)}
                              >
                                <Crown className="mr-2 h-4 w-4" />
                                <span>Promote to Admin</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleRemoveMember(selectedSquad.id, member.email, member.name)}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                <span>Remove from Squad</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Avatar className="border-2 border-background">
                              <AvatarImage src={member.image || undefined} />
                              <AvatarFallback>{member.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-1">
                              <span>{member.name}</span>
                              {member.role === 'ADMIN' && (
                                <Crown className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <InviteDialog
                      squadId={selectedSquad.id}
                      trigger={
                        <button className="flex items-center gap-2.5 cursor-pointer rounded-full px-3 py-1.5 hover:bg-muted transition-colors">
                          <Avatar className="border-2 border-background border-dashed">
                            <AvatarFallback className="bg-muted">
                              <UserPlus className="h-4 w-4 text-muted-foreground" />
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-muted-foreground">Invite</span>
                        </button>
                      }
                    />
                  </div>
                </div>

                {/* Balances */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-lg font-medium">Total Balance</h3>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (!isRefreshing) {
                          refreshData();
                        }
                      }}
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  {selectedSquad && (
                    <div className="mb-6">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm text-muted-foreground">Your Balance</div>
                        <div className={`mt-1 text-2xl font-semibold ${
                          userBalances.total === 0 ? 'text-gray-500' :
                          userBalances.total > 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {formatCurrency(Math.abs(userBalances.total), selectedSquad.currency)}
                        </div>
                      </div>
                      {/* Show net balance */}
                      {selectedSquad.balances
                        .filter(balance => 
                          balance.fromUserId === session?.user?.email || 
                          balance.toUserId === session?.user?.email
                        )
                        .map(balance => {
                          const isOwing = balance.fromUserId === session?.user?.email;
                          const otherUser = isOwing ? balance.toUser : balance.fromUser;
                          const otherUserId = isOwing ? balance.toUserId : balance.fromUserId;
                          const isSettling = settlingBalances.has(otherUserId);
                          
                          return (
                            <motion.div
                              key={`${balance.fromUserId}-${balance.toUserId}`}
                              initial={{ opacity: 1 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className={`mt-4 rounded-lg border p-4 transition-all duration-300 ${
                                isSettling ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback>{otherUser.name[0]}</AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{otherUser.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className={`text-lg font-semibold ${isOwing ? 'text-red-500' : 'text-green-500'}`}>
                                    {isOwing ? 'You owe' : 'Owes you'} {formatCurrency(balance.amount, selectedSquad.currency)}
                                  </div>
                                  {isOwing && (
                                    <Button 
                                      variant="outline"
                                      onClick={() => handleSettleUp(selectedSquad.id, otherUserId)}
                                      disabled={isSettling}
                                      className={`relative ${
                                        isSettling 
                                          ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700' 
                                          : ''
                                      }`}
                                    >
                                      {isSettling ? 'Settling...' : 'Settle Up'}
                                      {isSettling && (
                                        <motion.div
                                          className="absolute inset-0 rounded-md"
                                          animate={{
                                            boxShadow: [
                                              '0 0 0 0 rgba(34, 197, 94, 0)',
                                              '0 0 0 4px rgba(34, 197, 94, 0.3)',
                                              '0 0 0 0 rgba(34, 197, 94, 0)'
                                            ]
                                          }}
                                          transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                          }}
                                        />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Recent Transactions */}
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <h3 className="text-lg font-medium">Recent Transactions</h3>
                    <ExpenseDialog
                      squadId={selectedSquad.id}
                      squadMembers={selectedSquad.members}
                      squadCurrency={selectedSquad.currency}
                      onExpenseChange={refreshData}
                    />
                  </div>
                  <AnimatePresence>
                    <div className="space-y-3">
                      {isRefreshing ? (
                        <>
                          <ExpenseSkeleton />
                          <ExpenseSkeleton />
                          <ExpenseSkeleton />
                        </>
                      ) : (
                        [...selectedSquad.expenses]
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((expense, index) => {
                            const userSplit = expense.splits.find(s => s.userId === session?.user?.email);
                            const isPayerMe = expense.paidById === session?.user?.email;
                            const myShare = userSplit ? userSplit.amount : 0;
                            const balanceImpact = isPayerMe ? expense.amount - myShare : -myShare;
                            const isSettlement = expense.description === 'Settlement';
                            
                            return (
                              <ExpenseDialog
                                key={expense.id}
                                squadId={selectedSquad.id}
                                squadMembers={selectedSquad.members}
                                squadCurrency={selectedSquad.currency}
                                onExpenseChange={refreshData}
                                existingExpense={{
                                  id: expense.id,
                                  description: expense.description,
                                  amount: expense.amount,
                                  paidById: expense.paidById,
                                  splits: expense.splits,
                                  isRestaurantMode: expense.isRestaurantMode,
                                  items: expense.items
                                }}
                                trigger={
                                  <motion.button
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 20 }}
                                    transition={{ duration: 0.2, delay: index * 0.05 }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="group w-full text-left"
                                  >
                                    <div className={`relative flex items-center justify-between rounded-lg border p-4 ${
                                      deletingExpenses.has(expense.id) ? 'animate-pulse border-destructive shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''
                                    }`}>
                                      <div className="flex items-center gap-3">
                                        <div className={`rounded-full ${isSettlement ? 'bg-green-100' : 'bg-primary/10'} p-2`}>
                                          {isSettlement ? (
                                            <ArrowLeftRight className="h-4 w-4 text-green-600" />
                                          ) : expense.isRestaurantMode ? (
                                            <Utensils className="h-4 w-4 text-primary" />
                                          ) : (
                                            <DollarSign className="h-4 w-4 text-primary" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-medium">{expense.description}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {isPayerMe ? (
                                              <>You paid</>
                                            ) : (
                                              <>Paid by {expense.paidBy.name}</>
                                            )}
                                          </div>
                                          <div className="mt-1 text-sm">
                                            {balanceImpact > 0 ? (
                                              <span className="text-green-500">
                                                You lent {formatCurrency(balanceImpact, selectedSquad.currency)}
                                              </span>
                                            ) : balanceImpact < 0 ? (
                                              <span className="text-red-500">
                                                You borrowed {formatCurrency(Math.abs(balanceImpact), selectedSquad.currency)}
                                              </span>
                                            ) : (
                                              <span className="text-gray-500">
                                                Settled
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center">
                                        <div className="text-right absolute right-4 transition-transform duration-300 ease-out delay-75 group-hover:translate-x-[-4.5rem] group-hover:delay-0">
                                          <div className="font-medium">{formatCurrency(expense.amount, selectedSquad.currency)}</div>
                                          <div className="text-sm text-muted-foreground">
                                            {new Date(expense.date).toLocaleDateString()}
                                          </div>
                                        </div>
                                        <div
                                          role="button"
                                          className="absolute right-0 top-0 bottom-0 w-20 opacity-0 transition-[opacity] duration-300 delay-75 group-hover:opacity-100 group-hover:delay-75 group-hover:duration-300 duration-100 bg-destructive text-white flex items-center justify-center rounded-r-lg cursor-pointer"
                                          onClick={async (e) => {
                                            e.stopPropagation();
                                            if (!confirm('Are you sure you want to delete this expense?')) return;
                                            try {
                                              setDeletingExpenses(prev => new Set([...prev, expense.id]));
                                              await deleteExpense(selectedSquad.id, expense.id);
                                              refreshData();
                                            } catch (error) {
                                              console.error('Failed to delete expense:', error);
                                              setDeletingExpenses(prev => {
                                                const newSet = new Set(prev);
                                                newSet.delete(expense.id);
                                                return newSet;
                                              });
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </div>
                                      </div>
                                    </div>
                                  </motion.button>
                                }
                              />
                            );
                          })
                      )}
                    </div>
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-muted-foreground"
              >
                Select a squad to view expenses and settlements
              </motion.div>
            )}
          </div>
        </div>

        {/* Mobile Bottom Navigation */}
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 md:hidden"
        >
          <div className="flex justify-around">
            <button
              onClick={() => setMobileView('squads')}
              className={`flex flex-col items-center p-2 ${mobileView === 'squads' ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Users className="h-6 w-6" />
              <span className="text-xs">Squads</span>
            </button>
            <button
              onClick={() => setMobileView('details')}
              className={`flex flex-col items-center p-2 ${mobileView === 'details' ? 'text-primary' : 'text-muted-foreground'}`}
              disabled={!selectedSquad}
            >
              <HomeIcon className="h-6 w-6" />
              <span className="text-xs">Details</span>
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center px-4">
      <Logo className="mb-12 scale-[2.5]" showText={false} />
      <h1 className="text-4xl font-medium mb-2">Welcome to Roundup</h1>
      <p className="text-xl text-muted-foreground mb-2">
        The Sheriff of Bill Splitting
      </p>
      <p className="mb-8 text-lg text-muted-foreground max-w-md">
        Round up your posse and start splitting bills with friends, partner!
      </p>
      <Button
        className="bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8 font-semibold"
        onClick={() => signIn('google', { callbackUrl: '/' })}
      >
        Sign in with Google
      </Button>
    </div>
  )
}
