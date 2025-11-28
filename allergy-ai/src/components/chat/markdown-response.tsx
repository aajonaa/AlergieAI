'use client'

import { memo, useEffect, useId, useMemo, useRef, useState } from 'react'
import ReactMarkdown, { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import { codeToHtml } from 'shiki'
import mermaid from 'mermaid'
import katex from 'katex'
import { cn } from '@/lib/utils'
import { FaCheck, FaCopy } from 'react-icons/fa'

// ============================================================================
// Types
// ============================================================================

interface MarkdownResponseProps {
  content: string
  isStreaming?: boolean
  className?: string
}

interface CodeBlockProps {
  language: string
  code: string
  isStreaming?: boolean
}

interface MermaidBlockProps {
  chart: string
  id: string
}

interface LaTeXBlockProps {
  math: string
  displayMode?: boolean
}

// ============================================================================
// Mermaid Configuration
// ============================================================================

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaidInitialized = true
  
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'inherit',
    themeVariables: {
      darkMode: document.documentElement.classList.contains('dark'),
    },
  })
}

// ============================================================================
// Mermaid Block Component
// ============================================================================

function MermaidBlock({ chart, id }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    initMermaid()
    
    const renderChart = async () => {
      try {
        // Update theme based on current mode
        const isDark = document.documentElement.classList.contains('dark')
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        })
        
        const { svg } = await mermaid.render(`mermaid-${id}`, chart)
        setSvg(svg)
        setError('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram')
        setSvg('')
      }
    }

    // Debounce rendering during streaming
    const timer = setTimeout(renderChart, 100)
    return () => clearTimeout(timer)
  }, [chart, id])

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        <p className="font-medium">Mermaid Error</p>
        <pre className="mt-2 text-xs opacity-75">{error}</pre>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-x-auto rounded-lg bg-muted/30 p-4"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

// ============================================================================
// LaTeX Block Component (for ```latex or ```math code blocks)
// ============================================================================

function LaTeXBlock({ math, displayMode = true }: LaTeXBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    try {
      const rendered = katex.renderToString(math, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: true,
        macros: {
          '\\R': '\\mathbb{R}',
          '\\N': '\\mathbb{N}',
          '\\Z': '\\mathbb{Z}',
          '\\C': '\\mathbb{C}',
        },
      })
      setHtml(rendered)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render LaTeX')
      setHtml('')
    }
  }, [math, displayMode])

  if (error) {
    return (
      <div className="my-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm">
        <p className="font-medium text-amber-600 dark:text-amber-400">LaTeX Error</p>
        <pre className="mt-2 text-xs opacity-75">{error}</pre>
        <pre className="mt-2 font-mono text-xs bg-muted p-2 rounded">{math}</pre>
      </div>
    )
  }

  return (
    <div 
      className={cn(
        'my-4 overflow-x-auto',
        displayMode && 'flex justify-center py-2'
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// ============================================================================
// Code Block with Shiki Highlighting
// ============================================================================

function CodeBlock({ language, code, isStreaming }: CodeBlockProps) {
  const [html, setHtml] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const codeRef = useRef(code)
  
  // Track if this is a meaningful code update
  const shouldHighlight = !isStreaming || code.length - codeRef.current.length > 50 || code.includes('\n')
  
  useEffect(() => {
    if (!shouldHighlight && html) return
    codeRef.current = code
    
    const highlight = async () => {
      try {
        const highlighted = await codeToHtml(code, {
          lang: language || 'text',
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
          defaultColor: false,
        })
        setHtml(highlighted)
      } catch {
        // Fallback for unknown languages
        try {
          const highlighted = await codeToHtml(code, {
            lang: 'text',
            themes: {
              light: 'github-light',
              dark: 'github-dark',
            },
            defaultColor: false,
          })
          setHtml(highlighted)
        } catch {
          setHtml(`<pre><code>${escapeHtml(code)}</code></pre>`)
        }
      }
    }

    // Debounce during streaming
    const timer = setTimeout(highlight, isStreaming ? 150 : 0)
    return () => clearTimeout(timer)
  }, [code, language, isStreaming, shouldHighlight, html])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="group relative my-4">
      {/* Language label + Copy button */}
      <div className="flex items-center justify-between rounded-t-lg border border-b-0 border-border bg-muted/50 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
            'hover:bg-muted text-muted-foreground hover:text-foreground',
            copied && 'text-green-500 hover:text-green-500'
          )}
          aria-label={copied ? 'Copied!' : 'Copy code'}
        >
          {copied ? (
            <>
              <FaCheck className="h-3 w-3" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <FaCopy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code content */}
      <div
        className={cn(
          'overflow-x-auto rounded-b-lg border border-border',
          '[&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!border-0 [&_pre]:!bg-transparent [&_pre]:p-4',
          '[&_code]:!bg-transparent [&_code]:text-sm [&_code]:leading-relaxed',
          // Shiki dual theme support
          '[&_.shiki]:!bg-[--shiki-light-bg] dark:[&_.shiki]:!bg-[--shiki-dark-bg]',
          '[&_.shiki_span]:!text-[--shiki-light] dark:[&_.shiki_span]:!text-[--shiki-dark]',
          'bg-zinc-50 dark:bg-zinc-900'
        )}
        dangerouslySetInnerHTML={{ __html: html || `<pre><code>${escapeHtml(code)}</code></pre>` }}
      />
    </div>
  )
}

// ============================================================================
// Inline Code Component
// ============================================================================

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-md bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground">
      {children}
    </code>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Custom sanitize schema that allows KaTeX and Shiki classes
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [...(defaultSchema.attributes?.['*'] || []), 'className', 'class', 'style'],
    span: [...(defaultSchema.attributes?.span || []), 'style'],
    code: [...(defaultSchema.attributes?.code || []), 'className', 'class'],
    pre: [...(defaultSchema.attributes?.pre || []), 'className', 'class'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'span',
    'math',
    'semantics',
    'mrow',
    'mi',
    'mo',
    'mn',
    'msup',
    'msub',
    'mfrac',
    'mover',
    'munder',
    'msqrt',
    'mroot',
    'mtable',
    'mtr',
    'mtd',
    'annotation',
  ],
}

// ============================================================================
// Content Preprocessor for LaTeX
// ============================================================================

function preprocessContent(content: string): string {
  let processed = content

  // Convert \[...\] to $$...$$ (display math)
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, '\n$$\n$1\n$$\n')
  
  // Convert \(...\) to $...$ (inline math)
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$')
  
  // Convert ```latex blocks to $$...$$ so remark-math can process them too
  // But keep them as code blocks for our custom renderer to handle
  // Actually, we handle this in the code component, so no change needed here
  
  return processed
}

// ============================================================================
// Main Component
// ============================================================================

function MarkdownResponseInner({ content, isStreaming = false, className }: MarkdownResponseProps) {
  const componentId = useId()
  const mermaidCounter = useRef(0)
  
  // Preprocess content to normalize LaTeX delimiters
  const processedContent = useMemo(() => preprocessContent(content), [content])

  // Memoize components to prevent unnecessary re-renders
  const components: Components = useMemo(() => ({
    // Code blocks
    code({ node, className: codeClassName, children, ...props }) {
      const match = /language-(\w+)/.exec(codeClassName || '')
      const language = match?.[1] || ''
      const codeContent = String(children).replace(/\n$/, '')
      
      // Check if it's a code block (has language) or inline code
      const isCodeBlock = match || (node?.position?.start.line !== node?.position?.end.line)
      
      if (!isCodeBlock) {
        return <InlineCode>{children}</InlineCode>
      }

      // Handle Mermaid diagrams
      if (language === 'mermaid') {
        const id = `${componentId}-${mermaidCounter.current++}`
        return <MermaidBlock chart={codeContent} id={id} />
      }

      // Handle LaTeX/Math code blocks
      if (language === 'latex' || language === 'math' || language === 'tex') {
        return <LaTeXBlock math={codeContent} displayMode={true} />
      }

      return (
        <CodeBlock
          language={language}
          code={codeContent}
          isStreaming={isStreaming}
        />
      )
    },

    // Prevent pre from wrapping our custom code blocks
    pre({ children }) {
      return <>{children}</>
    },

    // Links
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
        >
          {children}
        </a>
      )
    },

    // Headings
    h1: ({ children }) => (
      <h1 className="mb-4 mt-6 text-2xl font-bold tracking-tight first:mt-0">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="mb-3 mt-5 text-xl font-semibold tracking-tight first:mt-0">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h4>
    ),

    // Paragraphs
    p: ({ children }) => (
      <p className="mb-3 leading-7 last:mb-0">{children}</p>
    ),

    // Lists
    ul: ({ children }) => (
      <ul className="mb-3 ml-6 list-disc space-y-1 [&>li]:pl-1">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="mb-3 ml-6 list-decimal space-y-1 [&>li]:pl-1">{children}</ol>
    ),
    li: ({ children }) => (
      <li className="leading-7">{children}</li>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-primary/30 bg-muted/30 py-2 pl-4 pr-2 italic text-muted-foreground">
        {children}
      </blockquote>
    ),

    // Horizontal rule
    hr: () => <hr className="my-6 border-border" />,

    // Tables
    table: ({ children }) => (
      <div className="my-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-muted/50">{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody className="divide-y divide-border">{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr className="border-b border-border last:border-0">{children}</tr>
    ),
    th: ({ children }) => (
      <th className="px-4 py-2 text-left font-semibold">{children}</th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2">{children}</td>
    ),

    // Images
    img: ({ src, alt }) => (
      <span className="my-4 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt || ''}
          className="max-w-full rounded-lg border border-border"
          loading="lazy"
        />
      </span>
    ),

    // Strong/Bold
    strong: ({ children }) => (
      <strong className="font-semibold">{children}</strong>
    ),

    // Emphasis/Italic
    em: ({ children }) => (
      <em className="italic">{children}</em>
    ),

    // Strikethrough
    del: ({ children }) => (
      <del className="line-through opacity-70">{children}</del>
    ),
  }), [componentId, isStreaming])

  return (
    <div 
      className={cn(
        'prose prose-zinc dark:prose-invert max-w-none',
        'prose-headings:scroll-mt-20',
        // Ensure proper text colors
        'text-foreground',
        // KaTeX styling
        '[&_.katex]:text-foreground [&_.katex-display]:my-4 [&_.katex-display]:overflow-x-auto',
        '[&_.katex-display]:py-2',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeKatex,
          [rehypeSanitize, sanitizeSchema],
        ]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

// Memoize the component to prevent unnecessary re-renders
export const MarkdownResponse = memo(MarkdownResponseInner, (prevProps, nextProps) => {
  // Always re-render if streaming state changes
  if (prevProps.isStreaming !== nextProps.isStreaming) return false
  // During streaming, always re-render on content change
  if (nextProps.isStreaming) return prevProps.content === nextProps.content
  // When not streaming, only re-render if content changed
  return prevProps.content === nextProps.content && prevProps.className === nextProps.className
})

MarkdownResponse.displayName = 'MarkdownResponse'

