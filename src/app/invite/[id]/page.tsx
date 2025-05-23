'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export default function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [squadId, setSquadId] = useState<string | null>(null)

  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params
      setSquadId(resolvedParams.id)
    }
    getParams()
  }, [params])

  useEffect(() => {
    const joinSquad = async () => {
      if (!session?.user?.email || !session?.user?.name || !squadId) {
        setLoading(false)
        return
      }

      try {
        // Join squad through API
        const response = await fetch(`/api/invite/${squadId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const data = await response.json()
          if (response.status === 400 && data.error === 'Already a member') {
            // If already a member, just redirect to home
            router.push('/')
            return
          }
          throw new Error(data.error || 'Failed to join squad')
        }

        // Redirect to home page on success
        router.push('/')
      } catch (error) {
        console.error('Failed to join squad:', error)
        setError(error instanceof Error ? error.message : 'Failed to join squad')
      } finally {
        setLoading(false)
      }
    }

    if (session?.user) {
      joinSquad()
    } else if (status === 'unauthenticated') {
      setLoading(false)
    }
  }, [session, status, squadId, router])

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Join Squad</h1>
        <p className="text-muted-foreground">Sign in to join this squad</p>
        <Button onClick={() => router.push('/api/auth/signin')}>
          Sign In
        </Button>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold text-destructive">{error}</h1>
        <Button onClick={() => router.push('/')}>
          Go Home
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="animate-pulse text-lg">Joining squad...</div>
    </div>
  )
} 