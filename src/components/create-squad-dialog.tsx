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
import { createSquad } from '@/lib/firebase-utils'

interface CreateSquadDialogProps {
  onSquadCreated: () => void
}

export function CreateSquadDialog({ onSquadCreated }: CreateSquadDialogProps) {
  const { data: session } = useSession()
  const [name, setName] = useState('')
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