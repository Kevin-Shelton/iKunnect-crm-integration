'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Globe } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/languages';

interface PreChatIdentityFormProps {
  onStartChat: (data: { fullName: string; email: string; phone: string; language: string }) => Promise<void>;
  isLoading: boolean;
}

export function PreChatIdentityForm({ onStartChat, isLoading }: PreChatIdentityFormProps) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState('en');
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

    onStartChat({ email: trimmedEmail, phone: trimmedPhone, fullName: trimmedFullName, language });
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
          <div>
            <Label htmlFor="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Preferred Language
            </Label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
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
