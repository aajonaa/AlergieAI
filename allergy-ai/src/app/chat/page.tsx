'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatHeader } from '@/components/chat/chat-header'
import { ChatInput, ChatInputHandle } from '@/components/chat/chat-input'
import { MessageBubble } from '@/components/chat/message-bubble'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import { Sidebar } from '@/components/chat/sidebar'
import { useChatStore } from '@/store/chat-store'
import { FaLeaf } from 'react-icons/fa'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n'

// Use internal API proxy - works for both local and public (FRP) access
const API_URL = '/api/vllm'

export default function ChatPage() {
  const {
    isLoading,
    isStreaming,
    isSidebarOpen,
    addMessage,
    appendToMessage,
    setLoading,
    setStreaming,
    getContextMessages,
    getCurrentSession,
  } = useChatStore()
  const { t } = useTranslation()

  // Prevent hydration mismatch - only show persisted data after client mount
  const [mounted, setMounted] = useState(false)
  const [modelName, setModelName] = useState<string | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)

  // Fetch model name from vLLM server on mount
  useEffect(() => {
    setMounted(true)

    const fetchModelName = async () => {
      try {
        const response = await fetch(`${API_URL}/models`)
        if (response.ok) {
          const data = await response.json()
          if (data.data && data.data.length > 0) {
            setModelName(data.data[0].id)
            setConnectionError(null)
          }
        } else {
          setConnectionError(t.chat.connectionError)
        }
      } catch {
        setConnectionError(t.chat.vllmNotRunning)
      }
    }

    fetchModelName()
    // Refresh model name every 30 seconds
    const interval = setInterval(fetchModelName, 30000)
    return () => clearInterval(interval)
  }, [t.chat.connectionError, t.chat.vllmNotRunning])

  const currentSession = getCurrentSession()
  const messages = mounted ? (currentSession?.messages || []) : []

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatInputRef = useRef<ChatInputHandle>(null)

  // Scroll to bottom function
  const scrollToBottom = useCallback((instant = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: instant ? 'instant' : 'smooth',
        block: 'end'
      })
    }
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // More aggressive scroll during streaming - use interval
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        scrollToBottom(true)
      }, 100)
      return () => clearInterval(interval)
    }
  }, [isStreaming, scrollToBottom])

  // Focus input on mount
  useEffect(() => {
    chatInputRef.current?.focus()
  }, [])

  // Handle focus when new chat is created
  const handleNewChat = useCallback(() => {
    chatInputRef.current?.focus()
  }, [])

  const handleSendMessage = async (content: string) => {
    // Check if model is available
    if (!modelName) {
      addMessage({ role: 'assistant', content: `⚠️ ${t.chat.vllmNotRunning}` })
      return
    }

    // Add user message
    addMessage({ role: 'user', content })

    setLoading(true)

    try {
      // Get context messages (last 10 + system prompt)
      const contextMessages = getContextMessages()

      // Add the new user message to context
      const allMessages = [
        ...contextMessages,
        { role: 'user', content },
      ]

      const response = await fetch(`${API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 512,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      // Create assistant message placeholder
      const assistantMessageId = addMessage({ role: 'assistant', content: '' })
      setLoading(false)
      setStreaming(true)

      // Stream the response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('No response body')
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })

        // Process SSE events
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6)

            if (data === '[DONE]') {
              continue
            }

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices?.[0]?.delta?.content

              if (content) {
                appendToMessage(assistantMessageId, content)
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error)
      addMessage({
        role: 'assistant',
        content: t.chat.serverError,
      })
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Sidebar */}
      <Sidebar onNewChat={handleNewChat} />

      {/* Main Chat Area */}
      <div
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 ease-in-out',
          isSidebarOpen ? 'ml-72' : 'ml-16'
        )}
      >
        <ChatHeader />

        {/* Messages Area */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <AnimatePresence mode="wait">
              {messages.length === 0 ? (
                <motion.div
                  key="welcome"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center justify-center min-h-[60vh] text-center w-full max-w-2xl mx-auto px-4"
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-2xl shadow-primary/30">
                    <FaLeaf className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-semibold text-foreground mb-2">
                    {mounted ? t.chat.welcome : ''}
                  </h2>
                  <p className="text-muted-foreground mb-8">
                    {mounted ? t.chat.welcomeDescription : ''}
                  </p>

                  <motion.div
                    layoutId="chat-input-container"
                    className="w-full mb-8 z-10"
                    transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                  >
                    <ChatInput
                      ref={chatInputRef}
                      onSend={handleSendMessage}
                      disabled={isLoading || isStreaming}
                    />
                  </motion.div>

                  <div className="grid gap-2 text-sm text-muted-foreground w-full max-w-md">
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {mounted ? t.chat.exampleQuestion1 : ''}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-secondary" />
                      {mounted ? t.chat.exampleQuestion2 : ''}
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-warning" />
                      {mounted ? t.chat.exampleQuestion3 : ''}
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="messages"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {messages.map((message, index) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isStreaming={isStreaming && index === messages.length - 1}
                    />
                  ))}
                  {isLoading && !isStreaming && <TypingIndicator />}
                </motion.div>
              )}
            </AnimatePresence>
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area - Only show when there are messages */}
        <AnimatePresence>
          {messages.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
              <div className="max-w-3xl mx-auto">
                <motion.div
                  layoutId="chat-input-container"
                  className="z-10"
                  transition={{ type: "spring", bounce: 0, duration: 0.6 }}
                >
                  <ChatInput
                    ref={chatInputRef}
                    onSend={handleSendMessage}
                    disabled={isLoading || isStreaming}
                  />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
