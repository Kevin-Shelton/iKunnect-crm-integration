'use client';

import React, { useState } from 'react';
import { Plus, FileText, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Note {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  category?: 'general' | 'support' | 'sales' | 'billing' | 'technical';
  isPrivate?: boolean;
}

interface ContactNotesProps {
  contactId: string;
  notes: Note[];
  onAddNote: (content: string, category: string) => Promise<void>;
  onUpdateNote: (noteId: string, content: string) => Promise<void>;
  onDeleteNote: (noteId: string) => Promise<void>;
  isLoading?: boolean;
}

const noteCategories = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-800' },
  { value: 'support', label: 'Support', color: 'bg-blue-100 text-blue-800' },
  { value: 'sales', label: 'Sales', color: 'bg-green-100 text-green-800' },
  { value: 'billing', label: 'Billing', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'technical', label: 'Technical', color: 'bg-red-100 text-red-800' }
];

export function ContactNotes({ 
  contactId: _contactId, 
  notes, 
  onAddNote, 
  onUpdateNote, 
  onDeleteNote, 
  isLoading 
}: ContactNotesProps) {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('general');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;

    setActionLoading('add');
    try {
      await onAddNote(newNoteContent.trim(), newNoteCategory);
      setNewNoteContent('');
      setNewNoteCategory('general');
      setIsAddingNote(false);
      toast.success('Note added successfully');
    } catch (error) {
      toast.error('Failed to add note');
      console.error('Add note error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleSaveEdit = async () => {
    if (!editingNoteId || !editingContent.trim()) return;

    setActionLoading('edit');
    try {
      await onUpdateNote(editingNoteId, editingContent.trim());
      setEditingNoteId(null);
      setEditingContent('');
      toast.success('Note updated successfully');
    } catch (error) {
      toast.error('Failed to update note');
      console.error('Update note error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    setActionLoading('delete');
    try {
      await onDeleteNote(noteId);
      toast.success('Note deleted successfully');
    } catch (error) {
      toast.error('Failed to delete note');
      console.error('Delete note error:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const getCategoryConfig = (category?: string) => {
    return noteCategories.find(cat => cat.value === category) || noteCategories[0];
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-900">Notes</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNote(true)}
            disabled={isAddingNote || isLoading}
            className="text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add Note
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Add Note Form */}
        {isAddingNote && (
          <div className="mb-4 p-3 border border-blue-200 rounded-lg bg-blue-50">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Category</label>
                <select
                  value={newNoteCategory}
                  onChange={(e) => setNewNoteCategory(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {noteCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Note</label>
                <Textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Enter your note..."
                  className="text-xs resize-none"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNoteContent.trim() || actionLoading === 'add'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {actionLoading === 'add' ? (
                    <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                  ) : (
                    <Save className="w-3 h-3 mr-1" />
                  )}
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingNote(false);
                    setNewNoteContent('');
                    setNewNoteCategory('general');
                  }}
                  disabled={actionLoading === 'add'}
                  className="text-gray-700 border-gray-300 hover:bg-gray-50"
                >
                  <X className="w-3 h-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Notes List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No notes added yet</p>
            <p className="text-xs text-gray-400">Add a note to track important information</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {notes.map((note) => {
              const categoryConfig = getCategoryConfig(note.category);
              const isEditing = editingNoteId === note.id;
              
              return (
                <div key={note.id} className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="outline" className={`text-xs ${categoryConfig.color} border-current`}>
                      {categoryConfig.label}
                    </Badge>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditNote(note)}
                        disabled={isEditing || actionLoading !== null}
                        className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteNote(note.id)}
                        disabled={isEditing || actionLoading !== null}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {isEditing ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                        className="text-xs resize-none"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editingContent.trim() || actionLoading === 'edit'}
                          className="bg-green-600 hover:bg-green-700 text-white text-xs"
                        >
                          {actionLoading === 'edit' ? (
                            <div className="w-3 h-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-1" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingNoteId(null);
                            setEditingContent('');
                          }}
                          disabled={actionLoading === 'edit'}
                          className="text-gray-700 border-gray-300 hover:bg-gray-50 text-xs"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-900 mb-2 leading-relaxed">{note.content}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{note.author}</span>
                        <span>{note.timestamp}</span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

