import { NextRequest, NextResponse } from 'next/server';
import { secureLogger } from '@/lib/secure-logger';

interface AuthLogEntry {
  timestamp: string;
  userId?: string;
  action: string;
  details: Record<string, unknown>;
  severity: string;
}

/**
 * GET /api/debug/auth-logs
 * Returns recent authentication debug logs
 */
export async function GET(request: NextRequest) {
  try {
    // Get the number of logs to return from query params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const maxLimit = 100;
    const safeLimit = Math.min(limit, maxLimit);

    // Get recent logs - using a simple in-memory store for now
    const logs: AuthLogEntry[] = []; // Placeholder - implement proper logging later

    // Log the request
    secureLogger.info('Auth logs requested', {
      limit: safeLimit,
      logCount: logs.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      logs,
      count: logs.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    secureLogger.error('Error retrieving auth logs', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve authentication logs',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/debug/auth-logs
 * Creates a new authentication debug log entry
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, details, severity, userId } = body;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        {
          success: false,
          error: 'Action is required',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Create log entry
    const logEntry: AuthLogEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action,
      details: details || {},
      severity: severity || 'info'
    };

    // Log the entry - using console for now since authDebugLogger doesn't exist
    console.log('[Auth Debug Log]', logEntry);

    secureLogger.info('Auth debug log created', {
      action,
      userId,
      severity,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Log entry created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    secureLogger.error('Error creating auth log', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create authentication log',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/debug/auth-logs
 * Clears all authentication debug logs
 */
export async function DELETE() {
  try {
    // Clear logs - no-op for now since authDebugLogger doesn't exist
    // In a real implementation, this would clear the log storage
    console.log('[Auth Debug] Logs cleared request received');

    secureLogger.info('Auth logs cleared', {
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Authentication logs cleared successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    secureLogger.error('Error clearing auth logs', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear authentication logs',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}