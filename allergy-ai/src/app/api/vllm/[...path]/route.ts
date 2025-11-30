import { NextRequest, NextResponse } from 'next/server'

// vLLM server runs on the same machine as Next.js
const VLLM_URL = process.env.VLLM_INTERNAL_URL || 'http://127.0.0.1:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const targetPath = path.join('/')
  const url = new URL(request.url)
  const queryString = url.search

  try {
    const response = await fetch(`${VLLM_URL}/v1/${targetPath}${queryString}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    console.error('vLLM proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to vLLM server', details: String(error) },
      { status: 502 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const targetPath = path.join('/')
  
  try {
    const body = await request.json()
    
    // Check if streaming is requested
    const isStreaming = body.stream === true

    const response = await fetch(`${VLLM_URL}/v1/${targetPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return NextResponse.json(
        { error: `vLLM error: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    if (isStreaming && response.body) {
      // Return streaming response
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Return JSON response
      const data = await response.json()
      return NextResponse.json(data, { status: response.status })
    }
  } catch (error) {
    console.error('vLLM proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to connect to vLLM server', details: String(error) },
      { status: 502 }
    )
  }
}

