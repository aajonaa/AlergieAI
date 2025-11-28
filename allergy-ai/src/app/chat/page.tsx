'use client'

import { useEffect, useRef, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatHeader } from '@/components/chat/chat-header'
import { ChatInput, ChatInputHandle } from '@/components/chat/chat-input'
import { MessageBubble } from '@/components/chat/message-bubble'
import { TypingIndicator } from '@/components/chat/typing-indicator'
import { Sidebar } from '@/components/chat/sidebar'
import { useChatStore } from '@/store/chat-store'
import { FaLeaf } from 'react-icons/fa'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/v1'

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

  const currentSession = getCurrentSession()
  const messages = currentSession?.messages || []

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

  const handleSendMessage = async (content: string) => {
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
          model: 'Qwen/Qwen2.5-1.5B-Instruct',
          messages: allMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 1024,
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
        content: 'I apologize, but I encountered an error connecting to the server. Please ensure the GPU API is running and try again.',
      })
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Sidebar */}
      <Sidebar />

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
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 shadow-2xl shadow-primary/30">
                  <FaLeaf className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  Welcome to AllergyAI
                </h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  I&apos;m your expert allergist assistant. Ask me anything about allergies,
                  pollen seasons, food sensitivities, or dietary management.
                </p>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    &quot;What are common spring allergy triggers?&quot;
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-secondary" />
                    &quot;How can I manage my dust mite allergy?&quot;
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning" />
                    &quot;What foods should I avoid with a nut allergy?&quot;
                  </p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                {isLoading && !isStreaming && <TypingIndicator />}
              </>
            )}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="max-w-3xl mx-auto">
            <ChatInput 
              ref={chatInputRef}
              onSend={handleSendMessage} 
              disabled={isLoading || isStreaming} 
            />
          </div>
        </div>
      </div>
    </div>
  )
}
