'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  DollarSign,
  Tag,
  Plus,
  Edit,
  ExternalLink,
  AlertTriangle,
  X,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Contact {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  tags: string[];
  dateAdded: string;
  lastActivity?: string;
}

interface Opportunity {
  id: string;
  name: string;
  stage: string;
  value: number;
  pipeline: string;
  probability?: number;
  closeDate?: string;
}

interface Appointment {
  id: string;
  title: string;
  date: string;
  type: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface ContactSidebarProps {
  contact?: Contact;
  opportunities?: Opportunity[];
  appointments?: Appointment[];
  conversationId?: string;
  onTagContact?: (tags: string[]) => void;
  onCreateOpportunity?: () => void;
  onUpdateOpportunity?: (opportunityId: string) => void;
  onScheduleCallback?: () => void;
  onEscalate?: () => void;
  onCloseConversation?: () => void;
  isLoading?: boolean;
}

export function ContactSidebar({
  contact,
  opportunities = [],
  appointments = [],
  conversationId,
  onTagContact,
  onCreateOpportunity,
  onUpdateOpportunity,
  onScheduleCallback,
  onEscalate,
  onCloseConversation,
  isLoading = false
}: ContactSidebarProps) {
  const [isTagging, setIsTagging] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim() && contact) {
      const updatedTags = [...contact.tags, newTag.trim()];
      onTagContact?.(updatedTags);
      setNewTag('');
      setIsTagging(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (contact) {
      const updatedTags = contact.tags.filter(tag => tag !== tagToRemove);
      onTagContact?.(updatedTags);
    }
  };

  if (!contact) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 p-4">
        <div className="text-center text-gray-500">
          <User className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Select a conversation to view contact details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Contact Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                Contact Info
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Edit className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">{contact.name}</span>
              </div>
              
              {contact.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{contact.email}</span>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{contact.phone}</span>
                </div>
              )}
              
              {(contact.city || contact.state) && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {[contact.city, contact.state].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                <span>
                  Added {formatDistanceToNow(new Date(contact.dateAdded), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Tags
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={() => setIsTagging(true)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {contact.tags.map((tag) => (
                  <Badge 
                    key={tag} 
                    variant="secondary" 
                    className="text-xs flex items-center gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-2 w-2" />
                    </button>
                  </Badge>
                ))}
                
                {isTagging && (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder="Add tag..."
                      className="text-xs border rounded px-2 py-1 w-20"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddTag} className="h-6 px-2 text-xs">
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Opportunities ({opportunities.length})
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={onCreateOpportunity}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {opportunities.length === 0 ? (
                <p className="text-xs text-gray-500">No opportunities</p>
              ) : (
                <div className="space-y-2">
                  {opportunities.map((opp) => (
                    <div 
                      key={opp.id} 
                      className="p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => onUpdateOpportunity?.(opp.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{opp.name}</span>
                        <ExternalLink className="h-3 w-3 text-gray-400" />
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{opp.stage}</span>
                        <span className="font-medium">${opp.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                Appointments ({appointments.length})
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 w-6 p-0"
                  onClick={onScheduleCallback}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <p className="text-xs text-gray-500">No upcoming appointments</p>
              ) : (
                <div className="space-y-2">
                  {appointments.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="p-2 border rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium truncate">{apt.title}</span>
                        <Badge 
                          variant={apt.status === 'scheduled' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {apt.status}
                        </Badge>
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(apt.date), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* Action Buttons */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={onScheduleCallback}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Callback
        </Button>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={onEscalate}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Escalate to Supervisor
        </Button>
        
        <Separator />
        
        <Button 
          variant="destructive" 
          size="sm" 
          className="w-full"
          onClick={onCloseConversation}
        >
          Close Conversation
        </Button>
      </div>
    </div>
  );
}

