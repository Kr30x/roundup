'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Plus, 
  Equal, 
  X, 
  Receipt,
  Clock
} from 'lucide-react';
import { addExpense, updateExpense } from '@/lib/firebase-utils';
import { cn } from '@/lib/utils';

interface Member {
  email: string;
  name: string;
  image: string | null;
  role: 'ADMIN' | 'MEMBER';
}

interface ExpenseItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  assignments: {
    userId: string;
    quantity: number;
  }[];
}

interface Split {
  userId: string;
  amount: number;
  type?: 'payment' | 'split';
}

interface ExpenseData {
  description: string;
  amount: number;
  paidById: string;
  splits: { userId: string; amount: number; }[];
  isRestaurantMode: boolean;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    assignments: {
      userId: string;
      quantity: number;
    }[];
  }[];
  imageUrl?: string;
}

interface ExpenseDialogProps {
  squadId: string;
  squadMembers: Member[];
  squadCurrency: string;
  onExpenseChange: () => void;
  existingExpense?: {
    id: string;
    description: string;
    amount: number;
    paidById: string;
    splits: Split[];
    imageUrl?: string;
    isRestaurantMode?: boolean;
    items?: ExpenseItem[];
  };
  trigger?: React.ReactNode;
}

export function ExpenseDialog({ 
  squadId,
  squadMembers, 
  squadCurrency, 
  onExpenseChange, 
  existingExpense,
  trigger 
}: ExpenseDialogProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState(existingExpense?.description || '');
  const [amount, setAmount] = useState(existingExpense?.amount?.toString() || '');
  const [payments, setPayments] = useState<Split[]>(() => {
    if (existingExpense) {
      const existingPayments = existingExpense.splits
        .filter(split => split.amount < 0)
        .map(split => ({
          userId: split.userId,
          amount: Math.abs(split.amount),
          type: 'payment' as const
        }));
      
      if (existingPayments.length === 0) {
        return [{
          userId: existingExpense.paidById,
          amount: existingExpense.amount,
          type: 'payment'
        }];
      }
      return existingPayments;
    }
    
    return squadMembers.map(member => ({
      userId: member.email,
      amount: 0,
      type: 'payment'
    }));
  });
  const [splits, setSplits] = useState<Split[]>(() => {
    if (existingExpense) {
      return existingExpense.splits
        .filter(split => split.amount >= 0)
        .map(split => ({
          userId: split.userId,
          amount: split.amount,
          type: 'split'
        }));
    }
    
    return squadMembers.map(member => ({
      userId: member.email,
      amount: 0,
      type: 'split'
    }));
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    existingExpense?.splits?.map(split => split.userId) || 
    squadMembers.map(member => member.email)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(existingExpense?.imageUrl || '');
  const [showItemizedExpense, setShowItemizedExpense] = useState(existingExpense?.isRestaurantMode === true);
  const [items, setItems] = useState<ExpenseItem[]>(() => {
    if (existingExpense?.isRestaurantMode && Array.isArray(existingExpense.items)) {
      return existingExpense.items.map(item => ({
        id: item.id || crypto.randomUUID(),
        name: item.name || 'Unnamed Item',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        assignments: Array.isArray(item.assignments) ? item.assignments.map(assignment => ({
          userId: assignment.userId,
          quantity: Number(assignment.quantity) || 0
        })) : []
      }));
    }
    return [];
  });

  useEffect(() => {
    if (existingExpense?.imageUrl) {
      console.log('Initial image URL:', existingExpense.imageUrl);
      fetch(existingExpense.imageUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          console.log('Image URL is valid and accessible');
          setImageUrl(existingExpense.imageUrl || '');
        })
        .catch(error => {
          console.error('Error validating image URL:', error);
          setImageUrl('');
        });
    }
  }, [existingExpense]);

  const totalPaidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  const remainingAmount = totalPaidAmount - totalSplitAmount;

  const handlePaymentChange = (userId: string, newAmount: string) => {
    const parsedAmount = Number(newAmount) || 0;
    setPayments(currentPayments => 
      currentPayments.map(payment => 
        payment.userId === userId 
          ? { ...payment, amount: parsedAmount }
          : payment
      )
    );
    const newTotalAmount = payments.reduce((sum, p) => 
      p.userId === userId ? sum + parsedAmount : sum + p.amount, 
      0
    );
    setAmount(newTotalAmount.toString());
  };

  const handleSplitAmountChange = (userId: string, newAmount: string) => {
    setSplits(currentSplits => 
      currentSplits.map(split => 
        split.userId === userId 
          ? { ...split, amount: Number(newAmount) || 0 }
          : split
      )
    );
  };

  const handleSplitEqually = () => {
    const selectedCount = selectedMembers.length;
    if (selectedCount === 0 || totalPaidAmount === 0) return;
    
    // Calculate split amount with 2 decimal places
    const splitAmount = Number((totalPaidAmount / selectedCount).toFixed(2));
    
    // Calculate any remaining cents due to rounding
    const totalSplitAmount = splitAmount * selectedCount;
    const remainder = Number((totalPaidAmount - totalSplitAmount).toFixed(2));
    
    if (showItemizedExpense) {
      // In restaurant mode, create a single item split equally
      const newItem = {
        id: crypto.randomUUID(),
        name: description || 'Split Equally',
        price: totalPaidAmount,
        quantity: 1,
        assignments: selectedMembers.map(userId => ({
          userId,
          quantity: 1
        }))
      };
      setItems([newItem]);
      calculateItemizedSplits();
    } else {
      // In quick mode, split directly with remainder handling
      const newSplits = squadMembers.map(member => {
        if (!selectedMembers.includes(member.email)) {
          return {
            userId: member.email,
            amount: 0,
            type: 'split' as const
          };
        }
        
        // Add the remainder to the first selected member's split
        const isFirstSelected = member.email === selectedMembers[0];
        const amount = isFirstSelected ? splitAmount + remainder : splitAmount;
        
        return {
          userId: member.email,
          amount,
          type: 'split' as const
        };
      });
      
      setSplits(newSplits);
    }
  };

  const handleMemberToggle = (email: string, checked: boolean) => {
    setSelectedMembers(current => {
      const newSelected = checked 
        ? [...current, email]
        : current.filter(id => id !== email);
      
      const selectedCount = newSelected.length;
      if (selectedCount > 0 && amount) {
        const splitAmount = Number(amount) / selectedCount;
        setSplits(squadMembers.map(member => ({
          userId: member.email,
          amount: newSelected.includes(member.email) ? Number(splitAmount.toFixed(2)) : 0
        })));
      }
      
      return newSelected;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Filter out any splits with amount 0
      const finalSplits = splits
        .filter(split => split.amount > 0)
        .map(split => ({
          userId: split.userId,
          amount: Number(split.amount)
        }));

      // Find the payer and add their negative split (what they paid)
      const paidById = payments.find(p => p.amount > 0)?.userId || session?.user?.email || '';
      const paidAmount = payments.find(p => p.userId === paidById)?.amount || 0;
      
      if (paidAmount > 0) {
        finalSplits.push({
          userId: paidById,
          amount: -paidAmount // Negative amount represents payment
        });
      }

      // Prepare items if in restaurant mode
      const preparedItems = showItemizedExpense ? items
        .filter(item => item.price > 0 && item.name.trim())
        .map(item => ({
          id: item.id,
          name: item.name.trim(),
          price: Number(item.price),
          quantity: Number(item.quantity) || 1,
          assignments: item.assignments
            .filter(assignment => assignment.quantity > 0)
            .map(assignment => ({
              userId: assignment.userId,
              quantity: Number(assignment.quantity)
            }))
        }))
        : [];

      // Create the expense data object with proper typing
      const expenseData: ExpenseData = {
        description: description.trim(),
        amount: Number(amount),
        paidById,
        splits: finalSplits,
        isRestaurantMode: showItemizedExpense,
        items: preparedItems
      };

      // Only include imageUrl if it exists and is not empty
      if (imageUrl) {
        expenseData.imageUrl = imageUrl;
      }

      if (existingExpense) {
        await updateExpense(squadId, existingExpense.id, expenseData);
      } else {
        await addExpense(squadId, {
          ...expenseData,
          date: new Date().toISOString(),
          paidBy: {
            name: squadMembers.find(m => m.email === paidById)?.name || ''
          }
        });
      }

      onExpenseChange();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to save expense:', error);
      setError('Failed to save expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeSwitch = (isRestaurant: boolean) => {
    if (isRestaurant) {
      // When switching to restaurant mode, reset everything
      setItems([]);
      setSplits(squadMembers.map(member => ({
        userId: member.email,
        amount: 0,
        type: 'split'
      })));
      setShowItemizedExpense(true);
    } else {
      // When switching to quick mode, convert items to total amount
      const totalAmount = items.reduce((sum, item) => sum + (item.price || 0), 0);
      if (totalAmount > 0) {
        const primaryPayer = session?.user?.email || squadMembers[0].email;
        setPayments(payments.map(p => ({
          ...p,
          amount: p.userId === primaryPayer ? totalAmount : 0
        })));
      }
      setShowItemizedExpense(false);
    }
  };

  const addItem = () => {
    setItems(current => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: '',
        price: 0,
        quantity: 1,
        assignments: []
      }
    ]);
  };

  const updateItem = (id: string, updates: Partial<ExpenseItem>) => {
    setItems(current =>
      current.map(item =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const removeItem = (id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  };

  const calculateItemizedSplits = useCallback(() => {
    // First reset all splits to 0
    const newSplits = squadMembers.map(member => ({
      userId: member.email,
      amount: 0,
      type: 'split' as const
    }));

    // Calculate each member's share based on their item assignments
    items.forEach(item => {
      const totalQuantity = item.assignments.reduce((sum, assignment) => sum + assignment.quantity, 0);
      if (totalQuantity > 0) {
        const pricePerUnit = item.price / totalQuantity;
        
        item.assignments.forEach(assignment => {
          const split = newSplits.find(s => s.userId === assignment.userId);
          if (split) {
            split.amount += pricePerUnit * assignment.quantity;
            // Ensure member is selected if they have any assignments
            if (assignment.quantity > 0 && !selectedMembers.includes(assignment.userId)) {
              setSelectedMembers(prev => [...prev, assignment.userId]);
            }
          }
        });
      }
    });

    setSplits(newSplits);
  }, [items, squadMembers, selectedMembers, setSelectedMembers]);

  useEffect(() => {
    if (showItemizedExpense) {
      calculateItemizedSplits();
    }
  }, [showItemizedExpense, calculateItemizedSplits]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </SheetTrigger>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[600px] p-0 flex flex-col shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex-1">
                  <SheetTitle className="sr-only">Add Expense</SheetTitle>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter expense description..."
                    className="text-lg font-medium bg-transparent border-none h-auto p-0 focus-visible:ring-0 max-w-[400px] placeholder:text-muted-foreground/50"
                  />
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="opacity-70 hover:opacity-100">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>

              {/* Type Selector */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={!showItemizedExpense ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 transition-all duration-200 font-medium",
                    !showItemizedExpense && "bg-primary/10 shadow-sm"
                  )}
                  onClick={() => {
                    if (showItemizedExpense) {
                      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                      if (totalAmount > 0) {
                        const primaryPayer = session?.user?.email || squadMembers[0].email;
                        setPayments(payments.map(p => ({
                          ...p,
                          amount: p.userId === primaryPayer ? totalAmount : 0
                        })));
                      }
                      setShowItemizedExpense(false);
                    }
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Quick Split
                </Button>

                <Button
                  type="button"
                  variant={showItemizedExpense ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "h-8 transition-all duration-200 font-medium",
                    showItemizedExpense && "bg-primary/10 shadow-sm"
                  )}
                  onClick={() => handleModeSwitch(!showItemizedExpense)}
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Restaurant Bill
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              {!showItemizedExpense ? (
                <div className="space-y-6 transition-all duration-300 transform">
                  <div className="bg-muted rounded-lg overflow-hidden shadow-sm">
                    <div className="grid gap-6">
                      <div className="bg-muted rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-muted-foreground/10">
                          <div className="text-sm font-medium">Members</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSplitEqually}
                            disabled={totalPaidAmount === 0}
                            className="flex items-center gap-2 shadow-sm hover:shadow transition-all duration-200 h-8 font-medium"
                          >
                            <Equal className="h-4 w-4" />
                            Split Equally
                          </Button>
                        </div>

                        <div className="grid grid-cols-[200px,100px,100px,100px] gap-2 p-3 bg-muted-foreground/5 text-sm font-medium">
                          <div>Member</div>
                          <div className="text-right">Paid</div>
                          <div className="text-right">Spent</div>
                          <div className="text-right">Balance</div>
                        </div>

                        <div className="divide-y divide-border">
                          {squadMembers.map((member) => {
                            const paidAmount = payments.find(p => p.userId === member.email)?.amount || 0;
                            const spentAmount = splits.find(s => s.userId === member.email)?.amount || 0;
                            const balance = paidAmount - spentAmount;
                            
                            return (
                              <div 
                                key={member.email} 
                                className="grid grid-cols-[200px,100px,100px,100px] gap-2 p-3 items-center hover:bg-muted-foreground/5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Checkbox
                                    id={`member-${member.email}`}
                                    checked={selectedMembers.includes(member.email)}
                                    onCheckedChange={(checked) => handleMemberToggle(member.email, checked === true)}
                                  />
                                  <Label
                                    htmlFor={`member-${member.email}`}
                                    className="text-sm font-medium cursor-pointer truncate"
                                  >
                                    {member.name} {member.email === session?.user?.email && '(You)'}
                                  </Label>
                                </div>

                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={paidAmount || ''}
                                    onChange={(e) => handlePaymentChange(member.email, e.target.value)}
                                    className="w-[90px] text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0.00"
                                  />
                                </div>

                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={spentAmount || ''}
                                    onChange={(e) => handleSplitAmountChange(member.email, e.target.value)}
                                    className="w-[90px] text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    disabled={!selectedMembers.includes(member.email) || showItemizedExpense}
                                    placeholder="0.00"
                                  />
                                </div>

                                <div className={cn(
                                  "text-right font-medium whitespace-nowrap",
                                  balance > 0 ? "text-green-500" : balance < 0 ? "text-red-500" : "text-muted-foreground"
                                )}>
                                  {balance > 0 ? '+' : ''}{balance.toFixed(2)} {squadCurrency}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-lg flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">Total Amount:</span> {totalPaidAmount.toFixed(2)} {squadCurrency}
                        </div>
                        {remainingAmount !== 0 && totalPaidAmount > 0 && (
                          <div className={cn(
                            "font-medium",
                            remainingAmount > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {remainingAmount > 0 
                              ? `${remainingAmount.toFixed(2)} ${squadCurrency} remaining to split`
                              : `${Math.abs(remainingAmount).toFixed(2)} ${squadCurrency} over split`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 transition-all duration-300 transform">
                  <div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-medium">Items</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addItem}
                          className="flex items-center gap-2 shadow-sm hover:shadow transition-all duration-200 font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Add Item
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {items.map((item) => (
                          <div 
                            key={item.id} 
                            className="rounded-lg border p-4 space-y-4"
                          >
                            <div className="flex items-center gap-4">
                              <div className="flex-1">
                                <Input
                                  value={item.name}
                                  onChange={(e) => updateItem(item.id, { name: e.target.value })}
                                  placeholder="Item name"
                                  className="h-9 font-medium"
                                />
                              </div>
                              <div className="w-[120px]">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price || ''}
                                  onChange={(e) => updateItem(item.id, { price: Number(e.target.value) || 0 })}
                                  className="h-9 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="Price"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(item.id)}
                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <div>
                              <Label className="text-sm text-muted-foreground mb-2 block">Who ordered this?</Label>
                              <div className="flex flex-wrap gap-2">
                                {squadMembers.map((member) => {
                                  const isAssigned = item.assignments.some(a => a.userId === member.email && a.quantity > 0);
                                  return (
                                    <Button
                                      key={member.email}
                                      type="button"
                                      variant={isAssigned ? "default" : "outline"}
                                      size="sm"
                                      className={cn(
                                        "h-8 transition-all duration-200",
                                        isAssigned ? "bg-primary text-primary-foreground shadow-sm font-medium" : "hover:bg-muted"
                                      )}
                                      onClick={() => {
                                        const currentAssignments = item.assignments.filter(a => a.userId !== member.email);
                                        updateItem(item.id, {
                                          assignments: [
                                            ...currentAssignments,
                                            { userId: member.email, quantity: isAssigned ? 0 : 1 }
                                          ]
                                        });
                                      }}
                                    >
                                      {member.name}
                                      {isAssigned && (
                                        <span className="ml-1 text-xs">✓</span>
                                      )}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                        {items.length > 0 && (
                          <div className="flex justify-end pt-2 text-sm">
                            <span className="font-medium">
                              Total: {squadCurrency} {items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Split Details */}
                  <div>
                    <div className="bg-muted rounded-lg overflow-hidden shadow-sm">
                      <div className="grid gap-4">
                        <div className="flex items-center justify-between p-3 bg-muted-foreground/10">
                          <Label className="text-lg font-medium">Split Details</Label>
                          {!showItemizedExpense && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleSplitEqually}
                              disabled={totalPaidAmount === 0}
                              className="flex items-center gap-2 shadow-sm hover:shadow transition-all duration-200 h-8 font-medium"
                            >
                              <Equal className="h-4 w-4" />
                              Split Equally
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-[200px,100px,100px,100px] gap-2 p-3 bg-muted-foreground/5 text-sm font-medium">
                          <div>Member</div>
                          <div className="text-right">Paid</div>
                          <div className="text-right">Spent</div>
                          <div className="text-right">Balance</div>
                        </div>

                        <div className="divide-y divide-border">
                          {squadMembers.map((member) => {
                            const paidAmount = payments.find(p => p.userId === member.email)?.amount || 0;
                            const spentAmount = splits.find(s => s.userId === member.email)?.amount || 0;
                            const balance = paidAmount - spentAmount;
                            
                            return (
                              <div 
                                key={member.email} 
                                className="grid grid-cols-[200px,100px,100px,100px] gap-2 p-3 items-center hover:bg-muted-foreground/5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Checkbox
                                    id={`member-${member.email}`}
                                    checked={selectedMembers.includes(member.email)}
                                    onCheckedChange={(checked) => handleMemberToggle(member.email, checked === true)}
                                  />
                                  <Label
                                    htmlFor={`member-${member.email}`}
                                    className="text-sm font-medium cursor-pointer truncate"
                                  >
                                    {member.name} {member.email === session?.user?.email && '(You)'}
                                  </Label>
                                </div>

                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={paidAmount || ''}
                                    onChange={(e) => handlePaymentChange(member.email, e.target.value)}
                                    className="w-[90px] text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    placeholder="0.00"
                                  />
                                </div>

                                <div>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={spentAmount || ''}
                                    onChange={(e) => handleSplitAmountChange(member.email, e.target.value)}
                                    className="w-[90px] text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    disabled={!selectedMembers.includes(member.email) || showItemizedExpense}
                                    placeholder="0.00"
                                  />
                                </div>

                                <div className={cn(
                                  "text-right font-medium whitespace-nowrap",
                                  balance > 0 ? "text-green-500" : balance < 0 ? "text-red-500" : "text-muted-foreground"
                                )}>
                                  {balance > 0 ? '+' : ''}{balance.toFixed(2)} {squadCurrency}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="bg-muted p-3 rounded-lg flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium">Total Amount:</span> {totalPaidAmount.toFixed(2)} {squadCurrency}
                        </div>
                        {remainingAmount !== 0 && totalPaidAmount > 0 && (
                          <div className={cn(
                            "font-medium",
                            remainingAmount > 0 ? "text-red-500" : "text-green-500"
                          )}>
                            {remainingAmount > 0 
                              ? `${remainingAmount.toFixed(2)} ${squadCurrency} remaining to split`
                              : `${Math.abs(remainingAmount).toFixed(2)} ${squadCurrency} over split`}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
            <div className="p-4 flex items-center justify-between gap-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="ml-auto">
                <Button
                  type="submit"
                  disabled={
                    isLoading || 
                    !description.trim() || 
                    totalPaidAmount <= 0 || 
                    Math.abs(remainingAmount) > 0.01 ||
                    (showItemizedExpense && items.length === 0)
                  }
                  className="shadow-sm hover:shadow transition-all duration-200 font-medium"
                >
                  {isLoading ? 'Saving...' : existingExpense ? 'Save Changes' : 'Add Expense'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
} 