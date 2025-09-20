'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';

interface NotificationSystemProps {
  enabled: boolean;
  onToggle: () => void;
}

export function NotificationSystem({ enabled, onToggle }: NotificationSystemProps) {
  const [hasPermission, setHasPermission] = useState(false);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

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

    // Initialize audio context
    if (typeof window !== 'undefined') {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioContext(ctx);
    }
  }, []);

  // Play incoming message beep (higher pitch, pleasant)
  const playIncomingBeep = () => {
    if (!enabled || !audioContext) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Pleasant incoming message sound: 800Hz -> 1000Hz
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.4);
    } catch (error) {
      console.error('Error playing incoming beep:', error);
    }
  };

  // Play dropped chat buzz (lower pitch, attention-grabbing)
  const playDroppedBuzz = () => {
    if (!enabled || !audioContext) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Buzzing sound for dropped chats: 200Hz with vibrato
      oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
      oscillator.type = 'sawtooth';
      
      // Create vibrato effect
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      lfo.frequency.setValueAtTime(8, audioContext.currentTime); // 8Hz vibrato
      lfoGain.gain.setValueAtTime(20, audioContext.currentTime); // 20Hz depth
      
      lfo.connect(lfoGain);
      lfoGain.connect(oscillator.frequency);
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
      
      lfo.start(audioContext.currentTime);
      oscillator.start(audioContext.currentTime);
      lfo.stop(audioContext.currentTime + 1.0);
      oscillator.stop(audioContext.currentTime + 1.0);
    } catch (error) {
      console.error('Error playing dropped buzz:', error);
    }
  };

  // Play new conversation alert (medium pitch, welcoming)
  const playNewConversationAlert = () => {
    if (!enabled || !audioContext) return;
    
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // New conversation sound: ascending notes
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.15);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing new conversation alert:', error);
    }
  };

  const showNotification = (title: string, message: string, type: 'incoming' | 'dropped' | 'new' = 'incoming') => {
    if (enabled && hasPermission && 'Notification' in window) {
      const icon = type === 'dropped' ? '⚠️' : type === 'new' ? '💬' : '📨';
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `chat-${type}`,
        requireInteraction: type === 'dropped' // Keep dropped chat notifications visible
      });
    }
  };

  const showVisualNotification = (message: string, type: 'incoming' | 'dropped' | 'new' = 'incoming') => {
    if (!enabled) return;
    
    const colors = {
      incoming: 'bg-blue-600',
      dropped: 'bg-red-600',
      new: 'bg-green-600'
    };
    
    const icons = {
      incoming: '📨',
      dropped: '⚠️',
      new: '💬'
    };
    
    // Create temporary visual notification
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 ${colors[type]} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-bounce max-w-sm`;
    notification.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-lg">${icons[type]}</span>
        <div>
          <div class="font-semibold text-sm">${type === 'dropped' ? 'Chat Dropped' : type === 'new' ? 'New Conversation' : 'New Message'}</div>
          <div class="text-xs opacity-90">${message.substring(0, 60)}${message.length > 60 ? '...' : ''}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, type === 'dropped' ? 5000 : 3000); // Keep dropped notifications longer
  };

  // Expose notification functions globally
  useEffect(() => {
    (window as any).notificationSystem = {
      playIncomingBeep,
      playDroppedBuzz,
      playNewConversationAlert,
      showNotification,
      showVisual: showVisualNotification,
      // Legacy compatibility
      playSound: playIncomingBeep
    };

    return () => {
      // Cleanup
      if ((window as any).notificationSystem) {
        delete (window as any).notificationSystem;
      }
    };
  }, [enabled, hasPermission, audioContext]);

  return (
    <div className="fixed top-4 right-4 z-50">
      <button
        onClick={onToggle}
        className={`p-3 rounded-full shadow-lg transition-all duration-200 ${
          enabled 
            ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105' 
            : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
        }`}
        title={enabled ? 'Disable notifications' : 'Enable notifications'}
      >
        {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </button>
      
      {/* Status indicator */}
      <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
        enabled ? 'bg-green-400' : 'bg-red-400'
      }`} />
    </div>
  );
}

// Hook for using notifications in components
export function useNotifications() {
  const playIncomingMessage = () => {
    if ((window as any).notificationSystem) {
      (window as any).notificationSystem.playIncomingBeep();
    }
  };

  const playDroppedChat = () => {
    if ((window as any).notificationSystem) {
      (window as any).notificationSystem.playDroppedBuzz();
    }
  };

  const playNewConversation = () => {
    if ((window as any).notificationSystem) {
      (window as any).notificationSystem.playNewConversationAlert();
    }
  };

  const showNotification = (title: string, message: string, type: 'incoming' | 'dropped' | 'new' = 'incoming') => {
    if ((window as any).notificationSystem) {
      (window as any).notificationSystem.showNotification(title, message, type);
      (window as any).notificationSystem.showVisual(message, type);
    }
  };

  return {
    playIncomingMessage,
    playDroppedChat,
    playNewConversation,
    showNotification
  };
}
