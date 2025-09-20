/**
 * Dashboard Screenshot API Route - DISABLED
 *
 * Screenshot functionality disabled for Vercel deployment compatibility
 * Puppeteer is not well-suited for serverless environments
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSecureErrorResponse } from '@/lib/security'

export interface ScreenshotRequest {
  dashboardUrl: string
  width?: number
  height?: number
  quality?: number
  printMode?: boolean
  waitForSelector?: string
}

export interface ScreenshotResponse {
  success: boolean
  screenshot?: string // Base64 encoded image
  error?: string
  metadata?: {
    width: number
    height: number
    format: string
    size: number
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Screenshot functionality disabled for Vercel compatibility
  return createSecureErrorResponse('Screenshot functionality is disabled for deployment compatibility. PDF reports will generate without screenshots.', 503);
}

// Handle GET requests with error
export async function GET(): Promise<NextResponse> {
  return createSecureErrorResponse('Screenshot functionality is disabled for deployment compatibility', 503);
}