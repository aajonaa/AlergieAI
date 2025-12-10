'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { FaLeaf, FaUser, FaLock, FaSpinner } from 'react-icons/fa'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useTranslation } from '@/lib/i18n'
import { motion } from 'framer-motion'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t.login.invalidCredentials)
      } else if (result?.ok) {
        router.push('/chat')
        router.refresh()
      }
    } catch {
      setError(t.login.errorOccurred)
    } finally {
      setIsLoading(false)
    }
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
        <div className="w-full max-w-md h-96 bg-background/50 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background overflow-hidden relative p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            repeatType: 'reverse'
          }}
          className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, -45, 0],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 2
          }}
          className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-secondary/20 to-transparent rounded-full blur-[100px]"
        />
      </div>

      {/* Language Switcher */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute top-4 right-4 z-10"
      >
        <LanguageSwitcher variant="pill" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="w-full max-w-md"
      >
        <Card className="w-full relative shadow-2xl border-white/10 bg-white/10 dark:bg-black/20 backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-4 shadow-lg shadow-primary/30"
            >
              <FaLeaf className="w-8 h-8 text-white" />
            </motion.div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {t.login.title}
            </CardTitle>
            <CardDescription>
              {t.login.signInDescription}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="username" className="text-sm font-medium">
                  {t.login.username}
                </Label>
                <div className="relative group">
                  <FaUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.login.usernamePlaceholder}
                    className="pl-10 bg-background/50 border-input/50 focus:bg-background/80 transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="password" className="text-sm font-medium">
                  {t.login.password}
                </Label>
                <div className="relative group">
                  <FaLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.login.passwordPlaceholder}
                    className="pl-10 bg-background/50 border-input/50 focus:bg-background/80 transition-all"
                    required
                    disabled={isLoading}
                  />
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-destructive/10 text-destructive text-sm p-3 rounded-md text-center"
                >
                  {error}
                </motion.div>
              )}

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium shadow-lg hover:shadow-primary/25 transition-all hover:scale-[1.02]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <FaSpinner className="mr-2 h-4 w-4 animate-spin" />
                      {t.login.signingIn}
                    </>
                  ) : (
                    t.login.signIn
                  )}
                </Button>
              </motion.div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
