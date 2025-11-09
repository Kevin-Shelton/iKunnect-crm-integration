'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface PreChatIdentityFormProps {
  onSubmit: (data: { email: string; phone: string; fullName: string }) => void;
  isLoading: boolean;
}

export function PreChatIdentityForm({ onSubmit, isLoading }: PreChatIdentityFormProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const trimmedFullName = fullName.trim();

    if (!trimmedEmail && !trimmedPhone) {
      setError('Please provide either an Email or a Phone number to start the chat.');
      return;
    }

    onSubmit({ email: trimmedEmail, phone: trimmedPhone, fullName: trimmedFullName });
  };

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl border border-gray-200">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">
          Start a New Conversation
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name (Optional)</Label>
            <Input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="email">Email (Required if Phone is empty)</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john.doe@example.com"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone (Required if Email is empty)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 555-5555"
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Looking up conversation...
              </>
            ) : (
              'Start Chat'
            )}
          </Button>
        </form>
        <p className="mt-4 text-xs text-gray-500 text-center">
          We need your contact information to look up any previous conversations.
        </p>
      </div>
    </div>
  );
}
