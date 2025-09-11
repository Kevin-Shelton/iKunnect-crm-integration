'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export type AlertType = 'success' | 'error' | 'warning' | 'info';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  timestamp: Date;
  autoClose?: boolean;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'default' | 'destructive';
  }>;
  persistent?: boolean;
  source?: string;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id' | 'timestamp'>) => string;
  removeAlert: (id: string) => void;
  clearAllAlerts: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const addAlert = (alertData: Omit<Alert, 'id' | 'timestamp'>): string => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const alert: Alert = {
      ...alertData,
      id,
      timestamp: new Date(),
      autoClose: alertData.autoClose ?? true,
      duration: alertData.duration ?? 5000
    };

    setAlerts(prev => [alert, ...prev]);

    // Play sound notification if enabled
    if (soundEnabled && alert.priority !== 'low') {
      playNotificationSound(alert.type, alert.priority);
    }

    // Auto-remove alert if specified
    if (alert.autoClose && alert.duration) {
      setTimeout(() => {
        removeAlert(id);
      }, alert.duration);
    }

    return id;
  };

  const removeAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const playNotificationSound = (type: AlertType, priority: AlertPriority) => {
    if (typeof window === 'undefined') return;

    try {
      // Create audio context for different notification sounds
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      
      const playTone = (frequency: number, duration: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + duration);
      };

      // Different sounds for different alert types and priorities
      switch (priority) {
        case 'critical':
          // Urgent triple beep
          playTone(800, 0.2);
          setTimeout(() => playTone(800, 0.2), 300);
          setTimeout(() => playTone(800, 0.2), 600);
          break;
        case 'high':
          // Double beep
          playTone(600, 0.3);
          setTimeout(() => playTone(600, 0.3), 400);
          break;
        case 'medium':
          // Single beep
          playTone(type === 'error' ? 400 : 500, 0.4);
          break;
        default:
          // Soft notification
          playTone(300, 0.2);
      }
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  };

  const value: AlertContextType = {
    alerts,
    addAlert,
    removeAlert,
    clearAllAlerts,
    soundEnabled,
    setSoundEnabled
  };

  return (
    <AlertContext.Provider value={value}>
      {children}
      <AlertDisplay />
    </AlertContext.Provider>
  );
}

function AlertDisplay() {
  const { alerts, removeAlert, soundEnabled, setSoundEnabled } = useAlerts();

  if (alerts.length === 0) return null;

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getAlertStyles = (type: AlertType, priority: AlertPriority) => {
    const baseStyles = "border-l-4 ";
    
    const typeStyles = {
      success: "border-green-500 bg-green-50",
      error: "border-red-500 bg-red-50",
      warning: "border-yellow-500 bg-yellow-50",
      info: "border-blue-500 bg-blue-50"
    };

    const priorityStyles = {
      critical: "ring-2 ring-red-500 ring-opacity-50",
      high: "ring-1 ring-gray-300",
      medium: "",
      low: "opacity-90"
    };

    return `${baseStyles}${typeStyles[type]} ${priorityStyles[priority]}`;
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {/* Sound toggle */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="h-8 w-8 p-0"
        >
          {soundEnabled ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Alert list */}
      {alerts.slice(0, 5).map((alert) => (
        <Card key={alert.id} className={getAlertStyles(alert.type, alert.priority)}>
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">
                    {alert.title}
                  </h4>
                  <div className="flex items-center space-x-1">
                    {alert.priority === 'critical' && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Critical
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAlert(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">
                  {alert.message}
                </p>
                
                {alert.source && (
                  <p className="text-xs text-gray-500 mt-1">
                    Source: {alert.source}
                  </p>
                )}
                
                <p className="text-xs text-gray-400 mt-1">
                  {alert.timestamp.toLocaleTimeString()}
                </p>

                {alert.actions && alert.actions.length > 0 && (
                  <div className="flex space-x-2 mt-3">
                    {alert.actions.map((action, index) => (
                      <Button
                        key={index}
                        variant={action.variant || 'default'}
                        size="sm"
                        onClick={() => {
                          action.action();
                          if (!alert.persistent) {
                            removeAlert(alert.id);
                          }
                        }}
                        className="text-xs"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {alerts.length > 5 && (
        <Card className="bg-gray-50">
          <CardContent className="p-2 text-center">
            <p className="text-xs text-gray-600">
              +{alerts.length - 5} more alerts
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function useAlerts(): AlertContextType {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
}

// Convenience hooks for different alert types
export function useSuccessAlert() {
  const { addAlert } = useAlerts();
  return (title: string, message: string, options?: Partial<Alert>) =>
    addAlert({ type: 'success', priority: 'medium', title, message, ...options });
}

export function useErrorAlert() {
  const { addAlert } = useAlerts();
  return (title: string, message: string, options?: Partial<Alert>) =>
    addAlert({ type: 'error', priority: 'high', title, message, ...options });
}

export function useWarningAlert() {
  const { addAlert } = useAlerts();
  return (title: string, message: string, options?: Partial<Alert>) =>
    addAlert({ type: 'warning', priority: 'medium', title, message, ...options });
}

export function useInfoAlert() {
  const { addAlert } = useAlerts();
  return (title: string, message: string, options?: Partial<Alert>) =>
    addAlert({ type: 'info', priority: 'low', title, message, ...options });
}

