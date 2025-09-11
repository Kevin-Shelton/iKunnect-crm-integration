'use client';

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category: string;
  preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update shortcuts ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      // Allow some shortcuts even in input fields (like Escape)
      if (event.key !== 'Escape' && event.key !== 'F1') {
        return;
      }
    }

    const matchingShortcut = shortcutsRef.current.find(shortcut => {
      return (
        shortcut.key.toLowerCase() === event.key.toLowerCase() &&
        !!shortcut.ctrlKey === event.ctrlKey &&
        !!shortcut.altKey === event.altKey &&
        !!shortcut.shiftKey === event.shiftKey &&
        !!shortcut.metaKey === event.metaKey
      );
    });

    if (matchingShortcut) {
      if (preventDefault || matchingShortcut.preventDefault !== false) {
        event.preventDefault();
        event.stopPropagation();
      }
      matchingShortcut.action();
    }
  }, [enabled, preventDefault]);

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);

  return {
    shortcuts: shortcutsRef.current
  };
}

// Predefined shortcut configurations for common actions
export const createChatShortcuts = (actions: {
  sendMessage?: () => void;
  openAI?: () => void;
  closeTab?: () => void;
  nextTab?: () => void;
  prevTab?: () => void;
  newChat?: () => void;
  searchConversations?: () => void;
  toggleSidebar?: () => void;
  escalate?: () => void;
  markResolved?: () => void;
}): KeyboardShortcut[] => [
  {
    key: 'Enter',
    ctrlKey: true,
    action: actions.sendMessage || (() => {}),
    description: 'Send message',
    category: 'Chat'
  },
  {
    key: 'i',
    ctrlKey: true,
    action: actions.openAI || (() => {}),
    description: 'Open AI assistant',
    category: 'AI'
  },
  {
    key: 'w',
    ctrlKey: true,
    action: actions.closeTab || (() => {}),
    description: 'Close current chat tab',
    category: 'Navigation'
  },
  {
    key: 'Tab',
    ctrlKey: true,
    action: actions.nextTab || (() => {}),
    description: 'Next chat tab',
    category: 'Navigation'
  },
  {
    key: 'Tab',
    ctrlKey: true,
    shiftKey: true,
    action: actions.prevTab || (() => {}),
    description: 'Previous chat tab',
    category: 'Navigation'
  },
  {
    key: 't',
    ctrlKey: true,
    action: actions.newChat || (() => {}),
    description: 'New chat',
    category: 'Chat'
  },
  {
    key: 'f',
    ctrlKey: true,
    action: actions.searchConversations || (() => {}),
    description: 'Search conversations',
    category: 'Search'
  },
  {
    key: 'b',
    ctrlKey: true,
    action: actions.toggleSidebar || (() => {}),
    description: 'Toggle sidebar',
    category: 'Navigation'
  },
  {
    key: 'e',
    ctrlKey: true,
    shiftKey: true,
    action: actions.escalate || (() => {}),
    description: 'Escalate conversation',
    category: 'Actions'
  },
  {
    key: 'r',
    ctrlKey: true,
    shiftKey: true,
    action: actions.markResolved || (() => {}),
    description: 'Mark as resolved',
    category: 'Actions'
  }
];

export const createAgentShortcuts = (actions: {
  changeStatus?: (status: string) => void;
  takeBreak?: () => void;
  viewStats?: () => void;
  openHelp?: () => void;
  refreshData?: () => void;
}): KeyboardShortcut[] => [
  {
    key: '1',
    altKey: true,
    action: () => actions.changeStatus?.('available'),
    description: 'Set status to Available',
    category: 'Status'
  },
  {
    key: '2',
    altKey: true,
    action: () => actions.changeStatus?.('busy'),
    description: 'Set status to Busy',
    category: 'Status'
  },
  {
    key: '3',
    altKey: true,
    action: () => actions.changeStatus?.('away'),
    description: 'Set status to Away',
    category: 'Status'
  },
  {
    key: '4',
    altKey: true,
    action: () => actions.changeStatus?.('offline'),
    description: 'Set status to Offline',
    category: 'Status'
  },
  {
    key: 'p',
    ctrlKey: true,
    shiftKey: true,
    action: actions.takeBreak || (() => {}),
    description: 'Take break',
    category: 'Status'
  },
  {
    key: 'd',
    ctrlKey: true,
    shiftKey: true,
    action: actions.viewStats || (() => {}),
    description: 'View dashboard/stats',
    category: 'Navigation'
  },
  {
    key: 'F1',
    action: actions.openHelp || (() => {}),
    description: 'Open help',
    category: 'Help'
  },
  {
    key: 'F5',
    action: actions.refreshData || (() => {}),
    description: 'Refresh data',
    category: 'Actions'
  }
];

export const createContactShortcuts = (actions: {
  callContact?: () => void;
  emailContact?: () => void;
  addNote?: () => void;
  viewHistory?: () => void;
  createOpportunity?: () => void;
}): KeyboardShortcut[] => [
  {
    key: 'c',
    ctrlKey: true,
    altKey: true,
    action: actions.callContact || (() => {}),
    description: 'Call contact',
    category: 'Contact'
  },
  {
    key: 'm',
    ctrlKey: true,
    altKey: true,
    action: actions.emailContact || (() => {}),
    description: 'Email contact',
    category: 'Contact'
  },
  {
    key: 'n',
    ctrlKey: true,
    altKey: true,
    action: actions.addNote || (() => {}),
    description: 'Add note',
    category: 'Contact'
  },
  {
    key: 'h',
    ctrlKey: true,
    altKey: true,
    action: actions.viewHistory || (() => {}),
    description: 'View contact history',
    category: 'Contact'
  },
  {
    key: 'o',
    ctrlKey: true,
    altKey: true,
    action: actions.createOpportunity || (() => {}),
    description: 'Create opportunity',
    category: 'Contact'
  }
];

// Hook for displaying keyboard shortcuts help
export function useShortcutHelp() {
  const showHelp = useCallback((shortcuts: KeyboardShortcut[]) => {
    const categories = shortcuts.reduce((acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    }, {} as Record<string, KeyboardShortcut[]>);

    const formatShortcut = (shortcut: KeyboardShortcut) => {
      const keys = [];
      if (shortcut.ctrlKey) keys.push('Ctrl');
      if (shortcut.altKey) keys.push('Alt');
      if (shortcut.shiftKey) keys.push('Shift');
      if (shortcut.metaKey) keys.push('Cmd');
      keys.push(shortcut.key);
      return keys.join(' + ');
    };

    let helpText = 'Keyboard Shortcuts:\n\n';
    Object.entries(categories).forEach(([category, shortcuts]) => {
      helpText += `${category}:\n`;
      shortcuts.forEach(shortcut => {
        helpText += `  ${formatShortcut(shortcut)} - ${shortcut.description}\n`;
      });
      helpText += '\n';
    });

    // You can replace this with a proper modal or help component
    alert(helpText);
  }, []);

  return { showHelp };
}

// Global shortcut for help
export function useGlobalShortcuts(allShortcuts: KeyboardShortcut[]) {
  const { showHelp } = useShortcutHelp();

  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: 'F1',
      action: () => showHelp(allShortcuts),
      description: 'Show keyboard shortcuts help',
      category: 'Help'
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open modals, dropdowns, etc.
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
      },
      description: 'Close/Cancel',
      category: 'Navigation'
    }
  ];

  useKeyboardShortcuts([...allShortcuts, ...globalShortcuts]);

  return {
    showHelp: () => showHelp(allShortcuts)
  };
}

