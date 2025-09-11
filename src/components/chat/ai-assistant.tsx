'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare, Heart, Zap, FileText, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AiSuggestion {
  id: string;
  type: 'response' | 'followup' | 'empathy' | 'solution' | 'template';
  content: string;
  confidence: number;
  reasoning?: string;
}

interface AiAssistantProps {
  conversationId: string;
  contactName: string;
  conversationContext: string;
  onUseSuggestion: (content: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

const suggestionTypes = {
  response: { icon: MessageSquare, label: 'Response', color: 'bg-blue-100 text-blue-800' },
  followup: { icon: Zap, label: 'Follow-up', color: 'bg-green-100 text-green-800' },
  empathy: { icon: Heart, label: 'Empathy', color: 'bg-pink-100 text-pink-800' },
  solution: { icon: Sparkles, label: 'Solution', color: 'bg-purple-100 text-purple-800' },
  template: { icon: FileText, label: 'Template', color: 'bg-orange-100 text-orange-800' }
};

export function AiAssistant({ 
  conversationId, 
  contactName, 
  conversationContext, 
  onUseSuggestion, 
  onClose, 
  isVisible 
}: AiAssistantProps) {
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const generateSuggestions = async (type?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/conversations/${conversationId}/ai-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: conversationContext,
          contactName,
          requestType: type || 'multiple',
          suggestionTypes: type ? [type] : ['response', 'followup', 'empathy', 'solution']
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Mock multiple suggestions for demo (in real implementation, API would return multiple)
        const mockSuggestions: AiSuggestion[] = [
          {
            id: '1',
            type: 'response',
            content: data.suggestion,
            confidence: data.confidence || 0.9,
            reasoning: data.reasoning
          },
          {
            id: '2',
            type: 'empathy',
            content: `I understand your frustration, ${contactName}. Let me help you resolve this quickly.`,
            confidence: 0.85,
            reasoning: 'Empathetic response to acknowledge customer concern'
          },
          {
            id: '3',
            type: 'followup',
            content: 'Is there anything else I can help you with today?',
            confidence: 0.8,
            reasoning: 'Standard follow-up to ensure customer satisfaction'
          },
          {
            id: '4',
            type: 'solution',
            content: 'I\'ve escalated this to our technical team. You should receive an update within 2 hours.',
            confidence: 0.75,
            reasoning: 'Solution-oriented response with clear timeline'
          }
        ];

        setSuggestions(type ? mockSuggestions.filter(s => s.type === type) : mockSuggestions);
      } else {
        console.error('AI suggestion failed:', data.error);
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTypeFilter = (type: string) => {
    setSelectedType(selectedType === type ? null : type);
    generateSuggestions(selectedType === type ? undefined : type);
  };

  const handleRefresh = () => {
    generateSuggestions(selectedType || undefined);
  };

  React.useEffect(() => {
    if (isVisible && suggestions.length === 0) {
      generateSuggestions();
    }
  }, [isVisible]); // Only depend on isVisible to avoid infinite loops

  if (!isVisible) return null;

  return (
    <Card className="mx-4 mb-2 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium text-purple-900">AI Assistant</CardTitle>
              <p className="text-xs text-purple-600">Smart suggestions for {contactName}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Suggestion Type Filters */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(suggestionTypes).map(([type, config]) => {
            const Icon = config.icon;
            const isSelected = selectedType === type;
            
            return (
              <Button
                key={type}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => handleTypeFilter(type)}
                className={`text-xs ${isSelected ? 'bg-purple-600 text-white' : 'text-purple-700 border-purple-300 hover:bg-purple-50'}`}
              >
                <Icon className="w-3 h-3 mr-1" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center space-x-2 text-purple-600">
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent" />
              <span className="text-sm">Generating suggestions...</span>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {!isLoading && suggestions.length > 0 && (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {suggestions.map((suggestion) => {
              const typeConfig = suggestionTypes[suggestion.type];
              const Icon = typeConfig.icon;
              
              return (
                <div
                  key={suggestion.id}
                  className="p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-200 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${typeConfig.color}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Badge variant="outline" className={`text-xs ${typeConfig.color} border-current`}>
                          {typeConfig.label}
                        </Badge>
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">
                            {Math.round(suggestion.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-900 mb-2 leading-relaxed">
                        {suggestion.content}
                      </p>
                      
                      {suggestion.reasoning && (
                        <p className="text-xs text-gray-500 mb-2 italic">
                          {suggestion.reasoning}
                        </p>
                      )}
                      
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => onUseSuggestion(suggestion.content)}
                          className="bg-purple-600 hover:bg-purple-700 text-white text-xs"
                        >
                          Use This
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onUseSuggestion(suggestion.content)}
                          className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs"
                        >
                          Edit & Use
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && suggestions.length === 0 && (
          <div className="text-center py-6">
            <Bot className="w-8 h-8 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-purple-600 mb-2">No suggestions available</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateSuggestions()}
              className="text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-2 border-t border-purple-100">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUseSuggestion("Thank you for contacting us. How can I help you today?")}
              className="text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              Greeting
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUseSuggestion("I apologize for any inconvenience. Let me look into this for you.")}
              className="text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              Apology
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUseSuggestion("Is there anything else I can help you with today?")}
              className="text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
            >
              Closing
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

