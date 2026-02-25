'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { notesApi } from '@/lib/api-notes';
import { MealNote } from '@/types';
import {
  ArrowLeft,
  Save,
  Copy,
  Check,
  FileText,
} from 'lucide-react';

export default function NotesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState('');
  const [currentNote, setCurrentNote] = useState<MealNote | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_CHARS = 1000;

  // Get today's date as default
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadTodayNote();
  }, []);

  const loadTodayNote = async () => {
    try {
      setLoading(true);
      
      // Try to get existing note
      const note = await notesApi.getNoteByDate(today);
      
      if (note) {
        // Note exists - populate content
        setCurrentNote(note);
        setContent(note.content);
        setLastSaved(new Date(note.updated_at));
      } else {
        // No note exists - create empty note immediately
        // This guarantees a row exists for this date
        try {
          const created = await notesApi.createNote(today, '');
          setCurrentNote(created);
          setContent('');
          setLastSaved(null);
        } catch (createErr) {
          console.error('Failed to create note:', createErr);
        }
      }
    } catch (err) {
      console.error('Failed to load note:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveNote = useCallback(async (noteContent: string) => {
    // Always use PUT to update - never POST after initial creation
    // This ensures we update the existing row, not create duplicates
    if (!currentNote) return;
    
    try {
      setSaving(true);
      setError(null);
      
      // Always use PUT (update) - never POST
      const updated = await notesApi.updateNote(today, noteContent);
      setCurrentNote(updated);
      setLastSaved(new Date());
      
      // IMPORTANT: Do NOT reset content - keep textarea bound to local state
      // The content state is already updated via handleContentChange
      
    } catch (err: any) {
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  }, [currentNote, today]);

  // Debounced auto-save
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    
    // Enforce character limit
    if (newContent.length > MAX_CHARS) {
      return;
    }
    
    setContent(newContent);
    setError(null);
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce - save after 1.5 seconds of no typing
    if (newContent.trim()) {
      debounceRef.current = setTimeout(() => {
        saveNote(newContent);
      }, 1500);
    }
  };

  const handleManualSave = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    await saveNote(content);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Saved just now';
    if (diffMins === 1) return 'Saved 1 minute ago';
    if (diffMins < 60) return `Saved ${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Saved 1 hour ago';
    return `Saved ${diffHours} hours ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-500 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-gold-900 border-t-gold-500 rounded-full animate-spin mx-auto"></div>
          <p className="mt-6 text-gold-400 font-bold tracking-wider uppercase">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-500">
      <header className="bg-dark-200/90 backdrop-blur-lg border-b border-dark-300 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.push('/dashboard')}
                className="text-gray-400 hover:text-gray-200 hover:bg-dark-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-700 flex items-center justify-center shadow-lg glow-gold">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold gradient-text tracking-tight">
                  NOTES
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {content.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="border-gold-700 text-gold-400 hover:bg-gold-900/30"
                >
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleManualSave}
                disabled={saving || !content.trim()}
                className="bg-gold-600 hover:bg-gold-700 text-white"
              >
                <Save className="w-4 h-4 mr-1" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="bg-dark-100 border-dark-200">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-gold-400 font-bold">
                {new Date(today).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  {formatLastSaved()}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
            
            <div className="relative">
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Write meals here throughout the day..."
                className="
                  w-full h-96 p-4 
                  bg-dark-200 border border-dark-300 rounded-xl
                  text-gray-100 placeholder-gray-500
                  resize-none
                  focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent
                  text-base leading-relaxed
                "
                maxLength={MAX_CHARS}
              />
              
              {/* Character counter */}
              <div className="absolute bottom-3 right-3 text-sm">
                <span className={content.length > 900 ? 'text-red-400' : 'text-gray-500'}>
                  {content.length} / {MAX_CHARS}
                </span>
              </div>
            </div>

            {/* Helper text */}
            <p className="mt-4 text-sm text-gray-500">
              Write meals here throughout the day. In the evening, calculate totals and enter summary in Daily Log.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
