/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AppLayout from '@/components/AppLayout';
import { useAITutor } from '@/hooks/useAITutor';
import { useAuth } from '@/hooks/useAuth';
import { EXAMPLE_TOPICS } from '@/lib/openai';
import { 
  Brain, 
  Send, 
  Lightbulb, 
  BookOpen, 
  TrendingUp,
  Shield,
  User,
  Bot,
  Plus,
  MessageSquare,
  Trash2,
  History,
  AlertCircle,
  Loader2,
  Menu,
  X
} from 'lucide-react';

export default function AITutor() {
  const { isAuthenticated, user } = useAuth();
  const {
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
    clearError
  } = useAITutor();

  const [input, setInput] = useState('');
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive behavior
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput('');
  };

  const handleExampleClick = (topic: string) => {
    setInput(topic);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCreateSession = async () => {
    await createNewSession(newSessionTitle || undefined);
    setNewSessionTitle('');
    setShowSessionDialog(false);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this chat session?')) {
      await deleteSession(sessionId);
    }
  };

  // Show authentication prompt if not logged in
  if (!isAuthenticated) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <Brain className="h-16 w-16 text-blue-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Financial Tutor</h1>
            <p className="text-lg text-gray-600 mb-8">
              Please log in to start chatting with your AI Financial Tutor and save your conversation history.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-center space-x-2 text-blue-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Authentication Required</span>
              </div>
              <p className="text-blue-700 mt-2">
                Connect your wallet or sign in to access personalized AI tutoring with persistent chat history.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <style jsx global>{`
        .sidebar-transition {
          transition: transform 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-backdrop {
          transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Brain className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">AI Financial Tutor</h1>
            </div>
            <div className="flex items-center space-x-2">
                {currentSession && (
                  <Badge variant="outline" className="hidden sm:flex">
                    {currentSession.title}
                  </Badge>
                )}
                {isMobile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="md:hidden min-h-[48px] min-w-[48px] touch-manipulation hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                  >
                    {isSidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                  </Button>
                )}
                <Dialog open={showSessionDialog} onOpenChange={setShowSessionDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center space-x-2 min-h-[48px] touch-manipulation hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">New Chat</span>
                    </Button>
                  </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Chat Session</DialogTitle>
                    <DialogDescription>
                      Create a new chat session with your AI Financial Tutor
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      placeholder="Session title (optional)"
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleCreateSession()}
                    />
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setShowSessionDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSession}>
                        Create Session
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            Learn financial concepts through personalized AI conversations. Your chat history is automatically saved.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Error</span>
              </div>
              <Button variant="ghost" size="sm" onClick={clearError}>
                ×
              </Button>
            </div>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 relative">
          {/* Mobile Sidebar Overlay */}
          {isMobile && isSidebarOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
          )}
          
          {/* Sidebar */}
          <div className={`${isMobile ? 'fixed inset-y-0 right-0 w-80 bg-white z-50 sidebar-transition md:relative md:transform-none' : 'w-full md:w-80'} ${isMobile && !isSidebarOpen ? 'translate-x-full' : ''} md:block`}>
            <div className="space-y-6 h-full overflow-y-auto p-4 md:p-0">
              {/* Chat History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="h-5 w-5" />
                    <span>Chat History</span>
                  </CardTitle>
                  <CardDescription>
                    Your previous conversations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 max-h-48 overflow-y-auto">
                  {isLoadingHistory ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm text-gray-500">Loading...</span>
                    </div>
                  ) : sessions.length > 0 ? (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          currentSession?.id === session.id
                            ? 'bg-blue-100 border border-blue-200'
                            : 'hover:bg-gray-50'
                        }`}
                        onClick={() => {
                          loadSession(session.id);
                          if (isMobile) setIsSidebarOpen(false);
                        }}
                      >
                        <div className="flex items-center space-x-2 flex-1 min-w-0">
                          <MessageSquare className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{session.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(session.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No chat history yet. Start a conversation!
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Example Topics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lightbulb className="h-5 w-5" />
                    <span>Example Topics</span>
                  </CardTitle>
                  <CardDescription>
                    Click on any topic to get started
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {EXAMPLE_TOPICS.map((topic, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="w-full text-left justify-start h-auto p-3 min-h-[48px] touch-manipulation hover:bg-gray-50 focus:ring-2 focus:ring-blue-500"
                      onClick={() => {
                        handleExampleClick(topic);
                        if (isMobile) setIsSidebarOpen(false);
                      }}
                    >
                      {topic}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              {/* Learning Categories */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BookOpen className="h-5 w-5" />
                    <span>Learning Categories</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Investing & DeFi</span>
                    <Badge variant="secondary">Beginner</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Risk Management</span>
                    <Badge variant="secondary">Essential</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Financial Planning</span>
                    <Badge variant="secondary">Core</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle>💡 Pro Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-2">
                  <p>• Ask specific questions for better answers</p>
                  <p>• Request examples with real numbers</p>
                  <p>• Ask for step-by-step explanations</p>
                  <p>• Your conversations are automatically saved</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 min-w-0">
            <Card className="h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bot className="h-5 w-5" />
                  <span>StudIQ AI Tutor</span>
                  {currentSession && (
                    <Badge variant="secondary" className="ml-auto">
                      {currentSession.title}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Ask me anything about personal finance and DeFi
                </CardDescription>
              </CardHeader>
              
              {/* Messages */}
              <CardContent className="flex-1 overflow-y-auto space-y-4 p-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        {message.role === 'assistant' && (
                          <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        {message.role === 'user' && (
                          <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          <p className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4" />
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
              
              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me about financial concepts..."
                    className="flex-1 min-h-[48px]"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!input.trim() || isLoading}
                    size="default"
                    className="min-h-[48px] min-w-[48px] touch-manipulation"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          </div>
        </div>
      </AppLayout>
    </>
  );
}