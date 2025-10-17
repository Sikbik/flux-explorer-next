/**
 * API Health Check Route
 *
 * Server-side endpoint that determines which Blockbook to use
 * based on environment variables and health checks.
 */

import { NextResponse } from 'next/server';
import ky from 'ky';

// Force this route to be dynamic and never cached
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthCheckResult {
  endpoint: string;
  type: 'local' | 'public';
  healthy: boolean;
  responseTime: number;
  error?: string;
}

async function checkEndpoint(url: string, type: 'local' | 'public'): Promise<HealthCheckResult> {
  const startTime = Date.now();

  try {
    await ky.get(`${url}/api`, {
      timeout: 5000,
      retry: 0,
    }).json();

    return {
      endpoint: url,
      type,
      healthy: true,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      endpoint: url,
      type,
      healthy: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function GET() {
  console.log('[Health API] ============ HEALTH CHECK REQUEST ============');
  console.log('[Health API] All environment variables:', {
    BLOCKBOOK_API_URL: process.env.BLOCKBOOK_API_URL,
    NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL: process.env.NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL,
    NEXT_PUBLIC_BLOCKBOOK_API_URL: process.env.NEXT_PUBLIC_BLOCKBOOK_API_URL,
  });

  const localUrl = process.env.BLOCKBOOK_API_URL ||
                   process.env.NEXT_PUBLIC_LOCAL_BLOCKBOOK_API_URL;
  const publicUrl = process.env.NEXT_PUBLIC_BLOCKBOOK_API_URL ||
                    'https://blockbookflux.app.runonflux.io/api/v2';

  console.log('[Health API] Resolved URLs:', {
    local: localUrl,
    public: publicUrl,
  });

  const results: HealthCheckResult[] = [];

  // Check local endpoint if configured
  if (localUrl) {
    const localResult = await checkEndpoint(localUrl, 'local');
    results.push(localResult);
    console.log('[Health API] Local check:', localResult);
  }

  // Check public endpoint
  const publicResult = await checkEndpoint(publicUrl, 'public');
  results.push(publicResult);
  console.log('[Health API] Public check:', publicResult);

  // Select best endpoint (prefer local if healthy)
  const healthyLocal = results.find(r => r.type === 'local' && r.healthy);
  const healthyPublic = results.find(r => r.type === 'public' && r.healthy);

  const selectedEndpoint = healthyLocal || healthyPublic;

  if (!selectedEndpoint) {
    return NextResponse.json({
      error: 'No healthy endpoints available',
      results,
    }, { status: 503 });
  }

  return NextResponse.json({
    selected: selectedEndpoint,
    allResults: results,
    mode: selectedEndpoint.type,
  });
}
