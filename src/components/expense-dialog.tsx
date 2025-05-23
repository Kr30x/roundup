'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Equal, Image as ImageIcon, X, Upload } from 'lucide-react';
import { addExpense, updateExpense, uploadExpenseImage, deleteExpenseImage } from '@/lib/firebase-utils';

interface Member {
  email: string;
  name: string;
  image: string | null;
  role: 'ADMIN' | 'MEMBER';
}

interface Split {
  userId: string;
  amount: number;
}

interface ExpenseDialogProps {
  squadId: string;
  squadMembers: Member[];
  onExpenseChange: () => void;
  existingExpense?: {
    id: string;
    description: string;
    amount: number;
    paidById: string;
    splits: Split[];
    imageUrl?: string;
  };
  trigger?: React.ReactNode;
}

export function ExpenseDialog({ 
  squadId,
  squadMembers, 
  onExpenseChange, 
  existingExpense,
  trigger 
}: ExpenseDialogProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState(existingExpense?.description || '');
  const [amount, setAmount] = useState(existingExpense?.amount?.toString() || '');
  const [paidById, setPaidById] = useState(existingExpense?.paidById || session?.user?.email || '');
  const [splits, setSplits] = useState<Split[]>(
    existingExpense?.splits || 
    squadMembers.map(member => ({
      userId: member.email,
      amount: 0
    }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(existingExpense?.imageUrl || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState<string>('');

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
          setImageError('');
        })
        .catch(error => {
          console.error('Error validating image URL:', error);
          setImageError(`Failed to load image: ${error.message}`);
        });
    }
  }, [existingExpense]);

  const totalSplitAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  const remainingAmount = Number(amount) - totalSplitAmount;

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
    const splitAmount = Number(amount) / squadMembers.length;
    setSplits(squadMembers.map(member => ({
      userId: member.email,
      amount: Number(splitAmount.toFixed(2))
    })));
  };

  const handleImageUpload = async (file: File) => {
    if (!existingExpense?.id) return;
    
    try {
      setIsUploading(true);
      setImageError('');
      console.log('Starting image upload for file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });
      
      const url = await uploadExpenseImage(squadId, existingExpense.id, file);
      console.log('Received image URL from Firebase:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setImageUrl(url);
      await updateExpense(squadId, existingExpense.id, { imageUrl: url });
      console.log('Updated expense with image URL');
      onExpenseChange();
    } catch (error) {
      console.error('Failed to upload image:', error);
      setImageError(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setError('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageDelete = async () => {
    if (!existingExpense?.id || !imageUrl) return;
    
    try {
      setIsUploading(true);
      console.log('Deleting image with URL:', imageUrl);
      const fileName = imageUrl.split('/').pop()!;
      console.log('Extracted filename:', fileName);
      await deleteExpenseImage(squadId, existingExpense.id, fileName);
      setImageUrl('');
      await updateExpense(squadId, existingExpense.id, { imageUrl: '' });
      console.log('Image deleted and expense updated');
      onExpenseChange();
    } catch (error) {
      console.error('Failed to delete image:', error);
      setError('Failed to delete image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;

    const totalSplit = splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(totalSplit - Number(amount)) > 0.01) {
      setError('Split amounts must equal the total expense amount');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      
      if (existingExpense) {
        await updateExpense(squadId, existingExpense.id, {
          description,
          amount: Number(amount),
          paidById,
          splits,
          imageUrl
        });
      } else {
        const expenseData = {
          description,
          amount: Number(amount),
          date: new Date().toISOString(),
          paidById,
          paidBy: {
            name: squadMembers.find(m => m.email === paidById)?.name || ''
          },
          splits,
          imageUrl
        };
        await addExpense(squadId, expenseData);
      }

      setDescription('');
      setAmount('');
      setPaidById(session.user.email);
      setSplits(squadMembers.map(member => ({ userId: member.email, amount: 0 })));
      setImageUrl('');
      setIsOpen(false);
      onExpenseChange();
    } catch (error) {
      console.error('Failed to handle expense:', error);
      setError(`Failed to ${existingExpense ? 'update' : 'add'} expense. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageUrl) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!imageUrl) setIsDragging(true);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (!existingExpense?.id || imageUrl) return;

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await handleImageUpload(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{existingExpense ? 'Edit' : 'Add'} Expense</DialogTitle>
            <DialogDescription>
              {existingExpense ? 'Edit the' : 'Add a new'} expense to split with your squad.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-6 py-4">
            {/* Left Column - Expense Details */}
            <div className="flex-1 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter expense description..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="paidBy">Paid By</Label>
                <Select value={paidById} onValueChange={setPaidById}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {squadMembers.map((member) => (
                      <SelectItem key={member.email} value={member.email}>
                        {member.name} {member.email === session?.user?.email && '(You)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Split Amount</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSplitEqually}
                    disabled={!amount}
                    className="flex items-center gap-2"
                  >
                    <Equal className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {squadMembers.map((member) => (
                    <div key={member.email} className="flex items-center gap-2">
                      <span className="flex-1">
                        {member.name} {member.email === session?.user?.email && '(You)'}
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={splits.find(s => s.userId === member.email)?.amount || ''}
                        onChange={(e) => handleSplitAmountChange(member.email, e.target.value)}
                        className="w-24"
                      />
                    </div>
                  ))}
                </div>
                {remainingAmount !== 0 && amount && (
                  <p className={`text-sm ${remainingAmount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                    {remainingAmount > 0 
                      ? `${remainingAmount.toFixed(2)} remaining to split`
                      : `${Math.abs(remainingAmount).toFixed(2)} over split`}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Image Upload */}
            <div className="w-72 border-l pl-6">
              <div className="grid gap-2">
                <Label>Receipt Image</Label>
                {imageError && (
                  <p className="text-sm text-destructive mb-2">{imageError}</p>
                )}
                <div 
                  className={`
                    relative 
                    flex 
                    flex-col 
                    items-center 
                    justify-center 
                    w-full 
                    h-[400px] 
                    border-2 
                    border-dashed 
                    rounded-lg
                    transition-all
                    ${!imageUrl ? 'hover:bg-muted/50 cursor-pointer' : ''}
                    ${isDragging ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'}
                    ${imageError ? 'border-destructive' : ''}
                  `}
                  onClick={() => !imageUrl && fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  {imageUrl && !imageError ? (
                    <div className="relative w-full h-full">
                      <div className="relative w-full h-full">
                        <Image 
                          src={imageUrl} 
                          alt="Receipt" 
                          fill
                          className="object-contain rounded-lg"
                          sizes="(max-width: 768px) 100vw, 288px"
                          priority
                          onError={() => {
                            console.error('Failed to load image:', imageUrl);
                            setImageError('Failed to load image');
                          }}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleImageDelete();
                        }}
                        disabled={isUploading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {isUploading ? (
                        <>
                          <Upload className="h-10 w-10 animate-bounce" />
                          <p>Uploading...</p>
                        </>
                      ) : isDragging ? (
                        <>
                          <Upload className="h-10 w-10" />
                          <p className="text-sm font-medium">Drop to upload</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-10 w-10" />
                          <p className="text-sm font-medium">Drop receipt image here</p>
                          <p className="text-xs">or click to select</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              disabled={
                isLoading || 
                !description.trim() || 
                !amount || 
                !paidById || 
                Math.abs(remainingAmount) > 0.01 ||
                isUploading
              }
            >
              {isLoading ? 'Saving...' : existingExpense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 