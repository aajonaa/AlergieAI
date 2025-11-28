/// <reference types="cypress" />

// Custom command for login
Cypress.Commands.add('login', (username: string, password: string) => {
  cy.visit('/login')
  cy.get('input[id="username"]').type(username)
  cy.get('input[id="password"]').type(password)
  cy.get('button[type="submit"]').click()
  cy.url().should('include', '/chat')
})

// Custom command to mock the chat API
Cypress.Commands.add('mockChatAPI', () => {
  cy.intercept('POST', '**/v1/chat/completions', (req) => {
    // Create a mock streaming response
    const mockResponse = 'This is a mock response from the allergy AI assistant. I can help you with questions about allergies, pollen, and dietary concerns.'
    
    req.reply({
      statusCode: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: mockResponse.split(' ').map((word, i) => 
        `data: ${JSON.stringify({
          id: 'mock',
          object: 'chat.completion.chunk',
          created: Date.now(),
          model: 'mock',
          choices: [{
            index: 0,
            delta: { content: (i > 0 ? ' ' : '') + word },
            finish_reason: null,
          }],
        })}\n\n`
      ).join('') + 'data: [DONE]\n\n',
    })
  }).as('chatAPI')
})

// Extend Cypress namespace for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      login(username: string, password: string): Chainable<void>
      mockChatAPI(): Chainable<void>
    }
  }
}

export {}

