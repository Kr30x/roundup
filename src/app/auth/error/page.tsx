'use client'

import { Button } from "@/components/ui/button"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Logo } from "@/components/logo"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="mx-auto flex w-full flex-col justify-center items-center space-y-6 sm:w-[350px]">
        <Logo className="mb-4" showText={false} />
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight font-georgia text-destructive">
            Whoa there, partner!
          </h1>
          <p className="text-sm text-muted-foreground">
            {error === "AccessDenied"
              ? "Looks like you don't have the right badge to enter."
              : "There was a tussle signing in with Google."}
          </p>
        </div>
        <Link href="/" className="w-full">
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            Head Back to the Ranch
          </Button>
        </Link>
      </div>
    </div>
  )
} 