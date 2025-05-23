'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface JoinSquadDialogProps {
  onSquadJoined: () => void;
}

export function JoinSquadDialog({ onSquadJoined }: JoinSquadDialogProps) {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const extractInviteCode = (input: string) => {
    try {
      // Try to parse as URL first
      const url = new URL(input);
      const pathSegments = url.pathname.split('/');
      return pathSegments[pathSegments.length - 1];
    } catch {
      // If not a valid URL, assume it's a direct code
      return input.trim();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const code = extractInviteCode(inviteCode);
      
      if (!code) {
        throw new Error('Invalid invite code or link');
      }

      const response = await fetch(`/api/invite/${code}`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to join squad');
      }

      onSquadJoined();
      setOpen(false);
      setInviteCode('');
    } catch (error) {
      console.error('Failed to join squad:', error);
      setError(error instanceof Error ? error.message : 'Failed to join squad');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">Join Squad</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a Squad</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="inviteCode">Invite Link or Code</Label>
            <Input
              id="inviteCode"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="Paste invite link or code..."
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              You can paste either the full invite link or just the invite code
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Joining...' : 'Join Squad'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}