'use client'

import { useSession, signIn } from 'next-auth/react'
import { Button } from './ui/button'
import { UserMenu } from './user-menu'
import { ModeToggle } from './mode-toggle'
import { Logo } from './logo'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="border-b bg-card/50 backdrop-blur-sm">
      <div className="flex h-16 items-center px-4 md:px-6">
        <Logo className="mr-4" />
        
        <div className="ml-auto flex items-center space-x-4">
          <ModeToggle />
          {session?.user ? (
            <UserMenu />
          ) : (
            <Button 
              onClick={() => signIn('google')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Sign in
            </Button>
          )}
        </div>
      </div>
    </nav>
  )
} 