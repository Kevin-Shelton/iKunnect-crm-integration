'use client';

import React from 'react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Plus, 
  AlertTriangle, 
  Star,
  UserCheck,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ContactActionsProps {
  contactId: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  onAction: (action: string, data?: Record<string, string | number | boolean>) => void;
}

export function ContactActions({ 
  contactId: _contactId, 
  contactName: _contactName, 
  contactEmail, 
  contactPhone, 
  onAction 
}: ContactActionsProps) {

  const handleAction = (action: string, data?: Record<string, string | number | boolean>) => {
    onAction(action, data);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {/* Communication Actions */}
          {contactPhone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('call', { phone: contactPhone })}
              className="flex items-center justify-center space-x-1 text-green-700 border-green-300 hover:bg-green-50"
            >
              <Phone className="w-3 h-3" />
              <span className="text-xs">Call</span>
            </Button>
          )}

          {contactEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('email', { email: contactEmail })}
              className="flex items-center justify-center space-x-1 text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <Mail className="w-3 h-3" />
              <span className="text-xs">Email</span>
            </Button>
          )}

          {contactPhone && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('sms', { phone: contactPhone })}
              className="flex items-center justify-center space-x-1 text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              <MessageSquare className="w-3 h-3" />
              <span className="text-xs">SMS</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('schedule_appointment')}
            className="flex items-center justify-center space-x-1 text-orange-700 border-orange-300 hover:bg-orange-50"
          >
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Schedule</span>
          </Button>

          {/* CRM Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('create_opportunity')}
            className="flex items-center justify-center space-x-1 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
          >
            <Plus className="w-3 h-3" />
            <span className="text-xs">Opportunity</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('add_note')}
            className="flex items-center justify-center space-x-1 text-gray-700 border-gray-300 hover:bg-gray-50"
          >
            <FileText className="w-3 h-3" />
            <span className="text-xs">Add Note</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('mark_vip')}
            className="flex items-center justify-center space-x-1 text-indigo-700 border-indigo-300 hover:bg-indigo-50"
          >
            <Star className="w-3 h-3" />
            <span className="text-xs">Mark VIP</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAction('escalate')}
            className="flex items-center justify-center space-x-1 text-red-700 border-red-300 hover:bg-red-50"
          >
            <AlertTriangle className="w-3 h-3" />
            <span className="text-xs">Escalate</span>
          </Button>
        </div>

        {/* Additional Actions */}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-1 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('assign_agent')}
              className="flex items-center justify-center space-x-2 text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              <UserCheck className="w-3 h-3" />
              <span className="text-xs">Assign to Agent</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('transfer_conversation')}
              className="flex items-center justify-center space-x-2 text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              <MessageSquare className="w-3 h-3" />
              <span className="text-xs">Transfer Conversation</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

