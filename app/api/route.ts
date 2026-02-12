import { NextResponse } from 'next/server';

/**
 * Root API endpoint - provides API information
 */
export async function GET() {
  return NextResponse.json({
    name: 'Coalition X Exchange Layer API',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/api/health',
      documentation: '/docs/swagger',
      openapi: '/api/docs/swagger-json',
    },
    authentication: {
      type: 'OAuth 2.0',
      tokenEndpoint: '/api/auth/token',
    },
    support: {
      documentation: 'https://dev.coalition-x-exchange.com/docs/swagger',
    },
  });
}
