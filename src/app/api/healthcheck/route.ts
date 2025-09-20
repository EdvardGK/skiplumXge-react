// Health check endpoint
import { createSecureResponse } from '@/lib/security';

export async function GET() {
  return createSecureResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
}