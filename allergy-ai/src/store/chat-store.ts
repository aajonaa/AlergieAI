import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations, Language } from '@/lib/i18n'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

interface ChatState {
  // Sessions management
  sessions: ChatSession[]
  currentSessionId: string | null
  
  // UI state
  isLoading: boolean
  isStreaming: boolean
  isSidebarOpen: boolean
  
  // Session actions
  createNewSession: () => string
  switchSession: (sessionId: string) => void
  deleteSession: (sessionId: string) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  
  // Message actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, content: string) => void
  appendToMessage: (id: string, content: string) => void
  
  // UI actions
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  
  // Helpers
  getCurrentSession: () => ChatSession | null
  getContextMessages: (language?: Language) => Message[]
  clearCurrentChat: () => void
}

// Function to get system prompt based on language
const getSystemPrompt = (language: Language = 'zh'): Message => ({
  id: 'system-prompt',
  role: 'system',
  content: translations[language].systemPrompt,
  timestamp: 0,
})

// Default title for new chats
const getNewChatTitle = (language: Language = 'zh'): string => {
  return language === 'zh' ? '新对话' : 'New Chat'
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

const generateTitle = (firstMessage: string): string => {
  // Generate title from first message, truncated
  const maxLength = 30
  const cleaned = firstMessage.replace(/\n/g, ' ').trim()
  return cleaned.length > maxLength 
    ? cleaned.substring(0, maxLength) + '...' 
    : cleaned || getNewChatTitle()
}

// Get current language from localStorage (synced with language store)
const getCurrentLanguage = (): Language => {
  if (typeof window === 'undefined') return 'zh'
  try {
    const stored = localStorage.getItem('allergy-ai-language')
    if (stored) {
      const parsed = JSON.parse(stored)
      return parsed.state?.language || 'zh'
    }
  } catch {
    // ignore
  }
  return 'zh'
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,
      isLoading: false,
      isStreaming: false,
      isSidebarOpen: false,

      createNewSession: () => {
        const { sessions } = get()
        const lang = getCurrentLanguage()
        const newChatTitle = getNewChatTitle(lang)
        
        // Check if there's already an empty session (no messages)
        const existingEmptySession = sessions.find(s => s.messages.length === 0)
        
        if (existingEmptySession) {
          // Switch to the existing empty session instead of creating a new one
          set({ currentSessionId: existingEmptySession.id })
          return existingEmptySession.id
        }
        
        // Create a new session only if no empty session exists
        const newSession: ChatSession = {
          id: generateId(),
          title: newChatTitle,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newSession.id,
        }))
        return newSession.id
      },

      switchSession: (sessionId) => {
        set({ currentSessionId: sessionId })
      },

      deleteSession: (sessionId) => {
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== sessionId)
          const newCurrentId = 
            state.currentSessionId === sessionId 
              ? (newSessions[0]?.id || null)
              : state.currentSessionId
          return {
            sessions: newSessions,
            currentSessionId: newCurrentId,
          }
        })
      },

      updateSessionTitle: (sessionId, title) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s
          ),
        }))
      },

      addMessage: (message) => {
        const { currentSessionId, sessions, createNewSession } = get()
        const lang = getCurrentLanguage()
        const newChatTitle = getNewChatTitle(lang)
        
        // Create a new session if none exists
        let sessionId = currentSessionId
        if (!sessionId) {
          sessionId = createNewSession()
        }

        const id = `msg-${generateId()}`
        const newMessage: Message = {
          ...message,
          id,
          timestamp: Date.now(),
        }

        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.id === sessionId) {
              const updatedMessages = [...s.messages, newMessage]
              // Update title if this is the first user message
              const shouldUpdateTitle = 
                (s.title === newChatTitle || s.title === 'New Chat' || s.title === '新对话') && 
                message.role === 'user' && 
                s.messages.filter(m => m.role === 'user').length === 0
              
              return {
                ...s,
                messages: updatedMessages,
                title: shouldUpdateTitle ? generateTitle(message.content) : s.title,
                updatedAt: Date.now(),
              }
            }
            return s
          }),
        }))

        return id
      },

      updateMessage: (id, content) => {
        const { currentSessionId } = get()
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId
              ? {
                  ...s,
                  messages: s.messages.map((msg) =>
                    msg.id === id ? { ...msg, content } : msg
                  ),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }))
      },

      appendToMessage: (id, content) => {
        const { currentSessionId } = get()
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId
              ? {
                  ...s,
                  messages: s.messages.map((msg) =>
                    msg.id === id ? { ...msg, content: msg.content + content } : msg
                  ),
                  updatedAt: Date.now(),
                }
              : s
          ),
        }))
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (open) => set({ isSidebarOpen: open }),

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get()
        return sessions.find((s) => s.id === currentSessionId) || null
      },

      getContextMessages: (language?: Language) => {
        const lang = language || getCurrentLanguage()
        const session = get().getCurrentSession()
        const systemPrompt = getSystemPrompt(lang)
        if (!session) return [systemPrompt]
        const recentMessages = session.messages.slice(-10)
        return [systemPrompt, ...recentMessages]
      },

      clearCurrentChat: () => {
        const { currentSessionId } = get()
        const lang = getCurrentLanguage()
        const newChatTitle = getNewChatTitle(lang)
        if (!currentSessionId) return
        
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === currentSessionId
              ? { ...s, messages: [], title: newChatTitle, updatedAt: Date.now() }
              : s
          ),
        }))
      },
    }),
    {
      name: 'allergy-ai-chat-v2',
      partialize: (state) => ({ 
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
)
