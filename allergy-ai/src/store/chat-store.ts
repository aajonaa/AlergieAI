import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

interface ChatState {
  messages: Message[]
  isLoading: boolean
  isStreaming: boolean
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (id: string, content: string) => void
  appendToMessage: (id: string, content: string) => void
  setLoading: (loading: boolean) => void
  setStreaming: (streaming: boolean) => void
  clearChat: () => void
  getContextMessages: () => Message[]
}

const SYSTEM_PROMPT: Message = {
  id: 'system-prompt',
  role: 'system',
  content: 'You are an expert Allergist AI. You provide helpful advice on managing allergies, pollen, and diet. Keep answers concise.',
  timestamp: 0,
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isLoading: false,
      isStreaming: false,

      addMessage: (message) => {
        const id = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newMessage: Message = {
          ...message,
          id,
          timestamp: Date.now(),
        }
        set((state) => ({
          messages: [...state.messages, newMessage],
        }))
        return id
      },

      updateMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content } : msg
          ),
        }))
      },

      appendToMessage: (id, content) => {
        set((state) => ({
          messages: state.messages.map((msg) =>
            msg.id === id ? { ...msg, content: msg.content + content } : msg
          ),
        }))
      },

      setLoading: (loading) => set({ isLoading: loading }),
      
      setStreaming: (streaming) => set({ isStreaming: streaming }),

      clearChat: () => set({ messages: [], isLoading: false, isStreaming: false }),

      // Get last 10 messages for context, always including system prompt
      getContextMessages: () => {
        const { messages } = get()
        const recentMessages = messages.slice(-10)
        return [SYSTEM_PROMPT, ...recentMessages]
      },
    }),
    {
      name: 'allergy-ai-chat',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
)

