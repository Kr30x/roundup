'use client'

import { Button } from "@/components/ui/button"
import { signIn } from "next-auth/react"
import { Logo } from "@/components/logo"

export default function SignIn() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mx-auto flex w-full flex-col justify-center items-center space-y-6 sm:w-[350px]">
        <Logo className="mb-4" showText={false} />
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-medium tracking-tight">
            Welcome to Roundup
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your Google account to join the posse
          </p>
        </div>
        <Button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Sign in with Google
        </Button>
      </div>
    </div>
  )
} 