import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatInput } from '@/components/chat/chat-input'
import { MessageBubble } from '@/components/chat/message-bubble'
import { Message } from '@/store/chat-store'

describe('ChatInput Component', () => {
  it('renders the input field', () => {
    render(<ChatInput onSend={jest.fn()} />)
    
    expect(
      screen.getByPlaceholderText(/ask about allergies/i)
    ).toBeInTheDocument()
  })

  it('calls onSend with message content when submitted', async () => {
    const mockOnSend = jest.fn()
    const user = userEvent.setup()
    
    render(<ChatInput onSend={mockOnSend} />)
    
    const input = screen.getByPlaceholderText(/ask about allergies/i)
    await user.type(input, 'What causes hay fever?')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    expect(mockOnSend).toHaveBeenCalledWith('What causes hay fever?')
  })

  it('clears the input after sending a message', async () => {
    const mockOnSend = jest.fn()
    const user = userEvent.setup()
    
    render(<ChatInput onSend={mockOnSend} />)
    
    const input = screen.getByPlaceholderText(/ask about allergies/i) as HTMLTextAreaElement
    await user.type(input, 'Test message')
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(input.value).toBe('')
    })
  })

  it('does not send empty messages', async () => {
    const mockOnSend = jest.fn()
    const user = userEvent.setup()
    
    render(<ChatInput onSend={mockOnSend} />)
    
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)
    
    expect(mockOnSend).not.toHaveBeenCalled()
  })

  it('disables input when disabled prop is true', () => {
    render(<ChatInput onSend={jest.fn()} disabled={true} />)
    
    const input = screen.getByPlaceholderText(/ask about allergies/i)
    expect(input).toBeDisabled()
  })

  it('sends message on Enter key press', async () => {
    const mockOnSend = jest.fn()
    const user = userEvent.setup()
    
    render(<ChatInput onSend={mockOnSend} />)
    
    const input = screen.getByPlaceholderText(/ask about allergies/i)
    await user.type(input, 'Test message{enter}')
    
    expect(mockOnSend).toHaveBeenCalledWith('Test message')
  })

  it('does not send on Shift+Enter (allows multiline)', async () => {
    const mockOnSend = jest.fn()
    const user = userEvent.setup()
    
    render(<ChatInput onSend={mockOnSend} />)
    
    const input = screen.getByPlaceholderText(/ask about allergies/i)
    await user.type(input, 'Line 1{shift>}{enter}{/shift}Line 2')
    
    expect(mockOnSend).not.toHaveBeenCalled()
  })
})

describe('MessageBubble Component', () => {
  it('renders user message correctly', () => {
    const userMessage: Message = {
      id: '1',
      role: 'user',
      content: 'What are common allergy symptoms?',
      timestamp: Date.now(),
    }
    
    render(<MessageBubble message={userMessage} />)
    
    expect(screen.getByText('What are common allergy symptoms?')).toBeInTheDocument()
  })

  it('renders assistant message correctly', () => {
    const assistantMessage: Message = {
      id: '2',
      role: 'assistant',
      content: 'Common allergy symptoms include sneezing, runny nose, and itchy eyes.',
      timestamp: Date.now(),
    }
    
    render(<MessageBubble message={assistantMessage} />)
    
    expect(
      screen.getByText(/common allergy symptoms include/i)
    ).toBeInTheDocument()
  })

  it('renders user message with correct alignment (right)', () => {
    const userMessage: Message = {
      id: '1',
      role: 'user',
      content: 'Test user message',
      timestamp: Date.now(),
    }
    
    const { container } = render(<MessageBubble message={userMessage} />)
    
    // User messages should have flex-row-reverse class for right alignment
    const messageContainer = container.firstChild
    expect(messageContainer).toHaveClass('flex-row-reverse')
  })

  it('renders assistant message with correct alignment (left)', () => {
    const assistantMessage: Message = {
      id: '2',
      role: 'assistant',
      content: 'Test assistant message',
      timestamp: Date.now(),
    }
    
    const { container } = render(<MessageBubble message={assistantMessage} />)
    
    // Assistant messages should not have flex-row-reverse
    const messageContainer = container.firstChild
    expect(messageContainer).not.toHaveClass('flex-row-reverse')
  })

  it('renders markdown content in assistant messages', () => {
    const assistantMessage: Message = {
      id: '2',
      role: 'assistant',
      content: '**Bold text** and *italic text*',
      timestamp: Date.now(),
    }
    
    render(<MessageBubble message={assistantMessage} />)
    
    // ReactMarkdown should render the markdown
    expect(screen.getByText('Bold text')).toBeInTheDocument()
    expect(screen.getByText('italic text')).toBeInTheDocument()
  })
})

