'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createSquad } from '@/lib/firebase-utils'

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

interface CreateSquadDialogProps {
  onSquadCreated: () => void
}

export function CreateSquadDialog({ onSquadCreated }: CreateSquadDialogProps) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.user?.email || !session?.user?.name) return
    
    try {
      setIsLoading(true)
      
      await createSquad(name, {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image || null
      })

      setName('')
      setCurrency('USD')
      setIsOpen(false)
      onSquadCreated()
    } catch (error) {
      console.error('Failed to create squad:', error)
      alert('Failed to create squad. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Create New Squad</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Squad</DialogTitle>
            <DialogDescription>
              Create a new squad to start splitting bills with your friends.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Squad Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter squad name..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Base Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map(curr => (
                    <SelectItem key={curr.code} value={curr.code}>
                      {curr.symbol} {curr.code} - {curr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Squad'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 