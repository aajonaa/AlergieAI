'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useTranslation, Language } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact' | 'pill'
  className?: string
}

export function LanguageSwitcher({ variant = 'default', className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useTranslation()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  const languages: { code: Language; label: string; short: string }[] = [
    { code: 'zh', label: '中文', short: '中' },
    { code: 'en', label: 'English', short: 'EN' },
  ]

  if (variant === 'pill') {
    return (
      <div className={cn('flex items-center gap-1 p-1 bg-muted rounded-full', className)}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200',
              language === lang.code
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {lang.short}
          </button>
        ))}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
        className={cn('text-xs font-medium', className)}
      >
        {language === 'zh' ? 'EN' : '中文'}
      </Button>
    )
  }

  // Default variant - toggle button with flag-like styling
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
      className={cn(
        'gap-2 font-medium transition-all',
        className
      )}
    >
      <span className="text-base leading-none">
        {language === 'zh' ? '🇨🇳' : '🇬🇧'}
      </span>
      <span>{language === 'zh' ? '中文' : 'EN'}</span>
    </Button>
  )
}

