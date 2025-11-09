
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Sparkles, 
  MessageSquare, 
  Copy, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  Zap,
  Clock
} from 'lucide-react';

interface AgentAssistProps {
  conversationId: string;
  contactId: string; // New prop for the contact ID
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  onSuggestionSelect: (suggestion: string) => void;
  onToggle: () => void;
}

interface Suggestion {
  id: string;
  text: string;
  confidence: number;
  category: 'greeting' | 'question' | 'solution' | 'closing' | 'escalation';
  timestamp: number;
}

export function AgentAssist({ 
  conversationId, 
  contactId, // Use the new prop
  contactName,
  contactEmail,
  contactPhone,
  isActive, 
  onSuggestionSelect, 
  onToggle 
}: AgentAssistProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch suggestions from the backend
  const fetchSuggestions = async () => {
    if (!conversationId || !isActive) return;
    
    setIsLoading(true);
    try {
      // Get stored suggestions from chatStorage
      const response = await fetch(`/api/conversations/${conversationId}/suggestions`);
      if (response.ok) {
        const data = await response.json();
        const formattedSuggestions: Suggestion[] = (data.suggestions || []).map((text: string, index: number) => ({
          id: `sugg-${index}`,
          text,
          confidence: 0.8 + (Math.random() * 0.2), // Simulate confidence scores
          category: categorizeMessage(text),
          timestamp: Date.now()
        }));
        
        setSuggestions(formattedSuggestions);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('[Agent Assist] Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Request new suggestions from n8n workflow
  const requestSuggestions = async () => {
    if (!conversationId || !contactId) return; // Check for contactId
    
    setIsLoading(true);
    try {
      console.log('[Agent Assist] Requesting suggestions from n8n for conversation:', conversationId);
      
      // Call the API endpoint to trigger n8n suggestion generation
      const response = await fetch(`/api/conversations/${conversationId}/request-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactId, 
          contactName, 
          contactEmail, 
          contactPhone 
        });
      
      // Always treat as success - errors are handled gracefully by the API
      const result = await response.json();
      console.log('[Agent Assist] n8n suggestion request result:', result);
      
      // Show "No suggestions right now" message initially
      setSuggestions([]);
      
      // Wait for suggestions to arrive via SSE/Desk events
      // Then fetch the updated suggestions from storage
      setTimeout(() => {
        fetchSuggestions();
      }, 5000); // Give n8n more time to process and send via SSE
      
    } catch (error) {
      console.error('[Agent Assist] Error requesting suggestions from n8n:', error);
      // Don't show error to user - just show "No suggestions right now"
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Categorize message based on content
  const categorizeMessage = (text: string): Suggestion['category'] => {
    const lower = text.toLowerCase();
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('welcome')) return 'greeting';
    if (lower.includes('?') || lower.includes('can you') || lower.includes('could you')) return 'question';
    if (lower.includes('try') || lower.includes('solution') || lower.includes('fix')) return 'solution';
    if (lower.includes('thank') || lower.includes('help') || lower.includes('anything else')) return 'closing';
    if (lower.includes('escalate') || lower.includes('manager') || lower.includes('supervisor')) return 'escalation';
    return 'solution';
  };

  // Get category color and icon
  const getCategoryStyle = (category: Suggestion['category']) => {
    switch (category) {
      case 'greeting': return { color: 'bg-blue-100 text-blue-800', icon: '👋' };
      case 'question': return { color: 'bg-purple-100 text-purple-800', icon: '❓' };
      case 'solution': return { color: 'bg-green-100 text-green-800', icon: '💡' };
      case 'closing': return { color: 'bg-orange-100 text-orange-800', icon: '✅' };
      case 'escalation': return { color: 'bg-red-100 text-red-800', icon: '⚠️' };
      default: return { color: 'bg-gray-100 text-gray-800', icon: '💬' };
    }
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: Suggestion) => {
    onSuggestionSelect(suggestion.text);
    
    // Track usage for learning (could be sent to analytics)
    console.log('[Agent Assist] Suggestion selected:', {
      id: suggestion.id,
      category: suggestion.category,
      confidence: suggestion.confidence
    });
  };

  // Auto-fetch suggestions when conversation changes or component becomes active
  useEffect(() => {
    if (isActive && conversationId) {
      fetchSuggestions();
    }
  }, [conversationId, isActive]);

  if (!isActive) {
    return (
      <div className="p-3 border-t bg-gray-50">
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="w-full text-gray-600 hover:text-blue-600"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Activate Agent Assist
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-t-0 rounded-t-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium">Agent Assist</CardTitle>
            <Badge variant="outline" className="text-xs">
              AI-Powered
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              onClick={requestSuggestions}
              variant="ghost"
              size="sm"
              disabled={isLoading}
              className="h-6 w-6 p-0"
              title="Request suggestions from n8n"
            >
              <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>
        </div>
        {lastUpdated && (
          <div className="flex items-center text-xs text-gray-500 mt-1">
            <Clock className="h-3 w-3 mr-1" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-gray-600">Generating suggestions...</span>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion) => {
                const categoryStyle = getCategoryStyle(suggestion.category);
                return (
                  <div
                    key={suggestion.id}
                    className="group p-3 bg-gray-50 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors border border-transparent hover:border-blue-200"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Badge variant="outline" className={`text-xs ${categoryStyle.color}`}>
                        {categoryStyle.icon} {suggestion.category}
                      </Badge>
                      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}%
                        </span>
                        <Copy className="h-3 w-3 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {suggestion.text}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-4">
              <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No suggestions available</p>
              <Button
                onClick={requestSuggestions}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <Zap className="h-3 w-3 mr-1" />
                Request from n8n
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
