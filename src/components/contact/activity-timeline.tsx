'use client';

import React from 'react';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  FileText, 
  DollarSign, 
  UserPlus, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ActivityItem {
  id: string;
  type: 'call' | 'email' | 'sms' | 'meeting' | 'note' | 'opportunity' | 'contact_created' | 'status_change';
  title: string;
  description: string;
  timestamp: string;
  agent?: string;
  status?: 'completed' | 'pending' | 'failed';
  metadata?: Record<string, string | number | boolean>;
}

interface ActivityTimelineProps {
  contactId: string;
  activities: ActivityItem[];
  isLoading?: boolean;
}

const activityConfig = {
  call: { icon: Phone, color: 'text-green-600', bgColor: 'bg-green-100' },
  email: { icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  sms: { icon: MessageSquare, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  meeting: { icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  note: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  opportunity: { icon: DollarSign, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  contact_created: { icon: UserPlus, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  status_change: { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100' }
};

const statusConfig = {
  completed: { icon: CheckCircle, color: 'text-green-600' },
  pending: { icon: Clock, color: 'text-yellow-600' },
  failed: { icon: AlertCircle, color: 'text-red-600' }
};

export function ActivityTimeline({ contactId: _contactId, activities, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-900">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-3 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-900">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6">
            <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No activity recorded yet</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              const StatusIcon = activity.status ? statusConfig[activity.status].icon : null;
              
              return (
                <div key={activity.id} className="relative">
                  {/* Timeline line */}
                  {index < activities.length - 1 && (
                    <div className="absolute left-4 top-8 w-0.5 h-6 bg-gray-200"></div>
                  )}
                  
                  <div className="flex space-x-3">
                    {/* Activity icon */}
                    <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    
                    {/* Activity content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                        {activity.status && StatusIcon && (
                          <StatusIcon className={`w-3 h-3 ${statusConfig[activity.status].color}`} />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{activity.description}</p>
                      
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{activity.timestamp}</span>
                        {activity.agent && (
                          <>
                            <span>•</span>
                            <span>{activity.agent}</span>
                          </>
                        )}
                        {activity.status && (
                          <>
                            <span>•</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                activity.status === 'completed' ? 'text-green-700 border-green-300' :
                                activity.status === 'pending' ? 'text-yellow-700 border-yellow-300' :
                                'text-red-700 border-red-300'
                              }`}
                            >
                              {activity.status}
                            </Badge>
                          </>
                        )}
                      </div>
                      
                      {/* Metadata */}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <div key={key} className="flex justify-between">
                              <span className="capitalize">{key.replace('_', ' ')}:</span>
                              <span>{String(value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

