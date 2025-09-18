'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';

interface NotificationSystemProps {
  enabled: boolean;
  onToggle: () => void;
}

export function NotificationSystem({ enabled, onToggle }: NotificationSystemProps) {
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        setHasPermission(true);
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setHasPermission(permission === 'granted');
        });
      }
    }
  }, []);

  const playNotificationSound = () => {
    if (enabled) {
      // Create audio context for notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  const showNotification = (title: string, message: string) => {
    if (enabled && hasPermission && 'Notification' in window) {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  const showVisualNotification = (message: string) => {
    if (enabled) {
      // Create temporary visual notification
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce';
      notification.textContent = `New message: ${message.substring(0, 50)}...`;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  };

  // Expose notification functions globally
  useEffect(() => {
    (window as any).notificationSystem = {
      playSound: playNotificationSound,
      showNotification,
      showVisual: showVisualNotification
    };
  }, [enabled, hasPermission]);

  return (
    <button
      onClick={onToggle}
      className={`p-2 rounded-md transition-colors ${
        enabled 
          ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
      }`}
      title={enabled ? 'Disable notifications' : 'Enable notifications'}
    >
      {enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
    </button>
  );
}

