import NextAuth, { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Hardcoded credentials for prototype
        const validUsers = [
          { id: '1', username: 'doctor', password: 'pollen123', name: 'Dr. Smith' },
          { id: '2', username: 'admin', password: 'admin123', name: 'Admin User' },
        ]

        const user = validUsers.find(
          (u) =>
            u.username === credentials?.username &&
            u.password === credentials?.password
        )

        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: `${user.username}@allergyai.local`,
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string
      }
      return session
    },
  },
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

