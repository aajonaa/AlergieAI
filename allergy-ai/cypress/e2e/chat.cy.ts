describe('AllergyAI Chat Flow', () => {
  beforeEach(() => {
    // Mock the chat API before each test
    cy.mockChatAPI()
  })

  it('should redirect unauthenticated users to login', () => {
    cy.visit('/chat')
    cy.url().should('include', '/login')
  })

  it('should display login page correctly', () => {
    cy.visit('/login')
    
    // Check for key elements
    cy.contains('AllergyAI').should('be.visible')
    cy.contains('Sign in').should('be.visible')
    cy.get('input[id="username"]').should('be.visible')
    cy.get('input[id="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible')
  })

  it('should show error for invalid credentials', () => {
    cy.visit('/login')
    
    cy.get('input[id="username"]').type('wronguser')
    cy.get('input[id="password"]').type('wrongpass')
    cy.get('button[type="submit"]').click()
    
    cy.contains('Invalid username or password').should('be.visible')
  })

  it('should login with valid credentials and navigate to chat', () => {
    cy.login('doctor', 'pollen123')
    
    // Should be on chat page
    cy.url().should('include', '/chat')
    cy.contains('AllergyAI').should('be.visible')
    cy.contains('Your Expert Allergist Assistant').should('be.visible')
  })

  it('should display welcome message on empty chat', () => {
    cy.login('doctor', 'pollen123')
    
    cy.contains('Welcome to AllergyAI').should('be.visible')
    cy.contains('your expert allergist assistant').should('be.visible')
  })

  it('should send a message and display user bubble', () => {
    cy.login('doctor', 'pollen123')
    
    // Type a message
    const testMessage = 'What are common spring allergy symptoms?'
    cy.get('textarea').type(testMessage)
    cy.get('button[type="submit"]').click()
    
    // User message bubble should appear
    cy.contains(testMessage).should('be.visible')
  })

  it('should receive and display assistant response', () => {
    cy.login('doctor', 'pollen123')
    
    // Send a message
    cy.get('textarea').type('Tell me about pollen allergies')
    cy.get('button[type="submit"]').click()
    
    // Wait for mock response
    cy.wait('@chatAPI')
    
    // Assistant response should appear
    cy.contains('mock response').should('be.visible', { timeout: 10000 })
  })

  it('should clear input after sending message', () => {
    cy.login('doctor', 'pollen123')
    
    cy.get('textarea').type('Test message')
    cy.get('button[type="submit"]').click()
    
    // Input should be cleared
    cy.get('textarea').should('have.value', '')
  })

  it('should clear chat when clicking Clear Chat button', () => {
    cy.login('doctor', 'pollen123')
    
    // Send a message first
    cy.get('textarea').type('Test message')
    cy.get('button[type="submit"]').click()
    cy.contains('Test message').should('be.visible')
    
    // Click clear chat
    cy.contains('Clear Chat').click()
    
    // Welcome message should appear again
    cy.contains('Welcome to AllergyAI').should('be.visible')
  })

  it('should sign out and redirect to login', () => {
    cy.login('doctor', 'pollen123')
    
    // Click sign out
    cy.contains('Sign Out').click()
    
    // Should be redirected to login
    cy.url().should('include', '/login')
  })

  it('should send message on Enter key', () => {
    cy.login('doctor', 'pollen123')
    
    cy.get('textarea').type('Enter key test{enter}')
    
    // Message should be sent
    cy.contains('Enter key test').should('be.visible')
  })

  it('should not send message on Shift+Enter', () => {
    cy.login('doctor', 'pollen123')
    
    cy.get('textarea').type('Line 1{shift+enter}Line 2')
    
    // Message should not be sent, textarea should have both lines
    cy.get('textarea').should('contain.value', 'Line 1')
    cy.get('textarea').should('contain.value', 'Line 2')
  })

  it('should persist chat history after refresh', () => {
    cy.login('doctor', 'pollen123')
    
    // Send a message
    const testMessage = 'Persistence test message'
    cy.get('textarea').type(testMessage)
    cy.get('button[type="submit"]').click()
    cy.contains(testMessage).should('be.visible')
    
    // Refresh the page
    cy.reload()
    
    // Message should still be there (from localStorage)
    cy.contains(testMessage).should('be.visible')
  })
})

describe('AllergyAI Chat - Without API Mock', () => {
  it('should handle API errors gracefully', () => {
    // Mock API to return error
    cy.intercept('POST', '**/v1/chat/completions', {
      statusCode: 500,
      body: { error: 'Internal server error' },
    }).as('chatAPIError')
    
    cy.login('doctor', 'pollen123')
    
    cy.get('textarea').type('Test error handling')
    cy.get('button[type="submit"]').click()
    
    // Should show error message
    cy.contains('error connecting').should('be.visible', { timeout: 10000 })
  })
})

