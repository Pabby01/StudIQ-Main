'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { secureLogger } from '@/lib/secure-logger';
import { ChatManager } from '@/lib/database-utils';
import { buildHeaders } from '@/lib/client-database-utils';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  subject: string | null;
  difficulty_level: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface AITutorState {
  // Current session
  currentSession: ChatSession | null;
  messages: Message[];
  
  // Session management
  sessions: ChatSession[];
  
  // UI state
  isLoading: boolean;
  isLoadingHistory: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  createNewSession: (title?: string, subject?: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearError: () => void;
  refreshSessions: () => Promise<void>;
}

export const useAITutor = (): AITutorState => {
  const { user, isAuthenticated } = useAuth();
  
  // State
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize with welcome message for new sessions
  const initializeWelcomeMessage = useCallback(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your AI Financial Tutor. I'm here to help you learn about personal finance, DeFi, and smart money management. What would you like to learn about today?",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  // Load user sessions
  const refreshSessions = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    try {
      setIsLoadingHistory(true);
      const userSessions = await ChatManager.getUserSessions(user.id);
      setSessions(userSessions);
    } catch (err) {
      secureLogger.error('Failed to load sessions', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [isAuthenticated, user?.id]);

  // Create new session
  const createNewSession = useCallback(async (title?: string, subject?: string) => {
    if (!isAuthenticated || !user?.id) {
      setError('Please log in to start a chat session');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const sessionData = {
        user_id: user.id,
        title: title || `Chat ${new Date().toLocaleDateString()}`,
        subject: subject || null,
        difficulty_level: null
      };

      const newSession = await ChatManager.createSession(sessionData);
      setCurrentSession(newSession);
      initializeWelcomeMessage();
      await refreshSessions();
    } catch (err) {
      secureLogger.error('Failed to create session', err);
      setError('Failed to create new chat session');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, initializeWelcomeMessage, refreshSessions]);

  // Load existing session
  const loadSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated || !user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      // Find session in current sessions list
      const session = sessions.find(s => s.id === sessionId);
      if (!session) {
        setError('Session not found');
        return;
      }

      // Load messages for this session
      const sessionMessages = await ChatManager.getSessionMessages(sessionId);
      
      // Convert database messages to UI format
      const formattedMessages: Message[] = sessionMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        sessionId: msg.session_id
      }));

      // If no messages, add welcome message
      if (formattedMessages.length === 0) {
        initializeWelcomeMessage();
      } else {
        setMessages(formattedMessages);
      }

      setCurrentSession(session);
    } catch (err) {
      secureLogger.error('Error loading session', err);
      setError('Failed to load chat session');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, sessions, initializeWelcomeMessage]);

  // Delete session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!isAuthenticated || !user?.id) return;

    try {
      setIsLoading(true);
      setError(null);

      await ChatManager.deleteSession(sessionId, user.id);
      
      // If we're deleting the current session, clear it
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }

      await refreshSessions();
    } catch (err) {
      secureLogger.error('Failed to delete session', err);
      setError('Failed to delete chat session');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, currentSession?.id, refreshSessions]);

  // Send message
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    if (!isAuthenticated || !user?.id) {
      setError('Please log in to send messages');
      return;
    }

    // If no current session, create one
    if (!currentSession) {
      await createNewSession();
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      sessionId: currentSession.id
    };

    // Add user message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Save user message to database
      await ChatManager.addMessage({
        session_id: currentSession.id,
        user_id: user.id,
        role: 'user',
        content: content.trim()
      });

      // Get AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(),
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          sessionId: currentSession.id,
          userId: user.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorContent = "I'm sorry, I'm having trouble right now. ";
        
        if (data.error && data.details) {
          if (data.error.includes('API key not configured')) {
            errorContent = "🔑 OpenAI API key is not configured. Please add your OPENAI_API_KEY to the environment variables and restart the server.";
          } else if (data.error.includes('Invalid OpenAI API key')) {
            errorContent = "🔑 The OpenAI API key appears to be invalid. Please check that your API key is correct and starts with 'sk-'.";
          } else if (data.error.includes('quota exceeded')) {
            errorContent = "💳 OpenAI API quota has been exceeded. Please check your billing and usage limits.";
          } else {
            errorContent = `❌ ${data.error}${data.details ? ` - ${data.details}` : ''}`;
          }
        } else {
          errorContent = "❌ Failed to get response from the AI tutor. Please try again.";
        }

        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
          sessionId: currentSession.id
        };

        setMessages(prev => [...prev, errorMessage]);
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        sessionId: currentSession.id
      };

      // Add assistant message to UI
      setMessages(prev => [...prev, assistantMessage]);

      // Save assistant message to database
      await ChatManager.addMessage({
        session_id: currentSession.id,
        user_id: user.id,
        role: 'assistant',
        content: data.message
      });

    } catch (err) {
      secureLogger.error('Failed to send message', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "🌐 Network error: Unable to connect to the AI tutor. Please check your internet connection and try again.",
        timestamp: new Date(),
        sessionId: currentSession?.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id, currentSession, messages, createNewSession]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      refreshSessions();
    }
  }, [isAuthenticated, user?.id, refreshSessions]);

  // Initialize with welcome message if no session
  useEffect(() => {
    if (!currentSession && messages.length === 0) {
      initializeWelcomeMessage();
    }
  }, [currentSession, messages.length, initializeWelcomeMessage]);

  return {
    currentSession,
    messages,
    sessions,
    isLoading,
    isLoadingHistory,
    error,
    sendMessage,
    createNewSession,
    loadSession,
    deleteSession,
    clearError,
    refreshSessions
  };
};