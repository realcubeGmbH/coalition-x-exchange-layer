/**
 * Centralized Logger Class
 * 
 * Features:
 * - Context propagation (organizationId, assetId, requestId)
 * - Structured JSON logging
 * - AuditLog database integration
 * - Consistent format across all connectors
 */

import type { AuditAction } from "@prisma/client";
import prisma from "../prisma";

// =============================================================================
// Types
// =============================================================================

export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

export interface LogContext {
  requestId?: string;
  organizationId?: string;
  userId?: string;
  assetId?: string;
  connector?: string;
  endpoint?: string;
  method?: string;
  schemaVersion?: string;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

export interface AuditParams {
  action: AuditAction;
  resource: string;
  resourceId?: string;
  method?: string;
  endpoint?: string;
  statusCode?: number;
  ipAddress?: string;
  userAgent?: string;
  payload?: object;
  response?: object;
  schemaVersion?: string;
}

// =============================================================================
// Logger Class
// =============================================================================

export class Logger {
  private context: LogContext;

  constructor(defaultContext: LogContext = {}) {
    this.context = defaultContext;
  }

  /**
   * Create a new logger instance with additional context
   */
  withContext(ctx: Partial<LogContext>): Logger {
    return new Logger({ ...this.context, ...ctx });
  }

  /**
   * Set context on current logger (mutates)
   */
  setContext(ctx: Partial<LogContext>): void {
    this.context = { ...this.context, ...ctx };
  }

  /**
   * Get current context
   */
  getContext(): LogContext {
    return { ...this.context };
  }

  // ===========================================================================
  // Logging Methods
  // ===========================================================================

  private log(level: LogLevel, message: string, data?: unknown): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...(data !== undefined && { data }),
    };

    // Output to console (structured JSON)
    const output = JSON.stringify(entry);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(output);
        break;
      case LogLevel.INFO:
        console.info(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      case LogLevel.ERROR:
        console.error(output);
        break;
    }

    return entry;
  }

  debug(message: string, data?: unknown): LogEntry {
    return this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: unknown): LogEntry {
    return this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: unknown): LogEntry {
    return this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: Error | unknown, data?: unknown): LogEntry {
    const err = error instanceof Error ? error : null;
    
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      context: this.context,
      ...(data !== undefined && { data }),
      ...(err && {
        error: {
          code: (err as { code?: string }).code || "UNKNOWN_ERROR",
          message: err.message,
          stack: err.stack,
        },
      }),
    };

    console.error(JSON.stringify(entry));
    return entry;
  }

  // ===========================================================================
  // Audit Log (Database)
  // ===========================================================================

  /**
   * Write to AuditLog table
   */
  async audit(params: AuditParams): Promise<void> {
    if (!this.context.organizationId) {
      console.warn("Cannot write audit log without organizationId in context");
      return;
    }

    try {
      await prisma.auditLog.create({
        data: {
          organizationId: this.context.organizationId,
          userId: this.context.userId || null,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          method: params.method || this.context.method,
          endpoint: params.endpoint || this.context.endpoint,
          statusCode: params.statusCode,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
          payload: params.payload,
          response: params.response,
          schemaVersion: params.schemaVersion || this.context.schemaVersion,
        },
      });
    } catch (error) {
      // Don't throw - audit failures shouldn't break the main flow
      this.error("Failed to write audit log", error, { params });
    }
  }

  // ===========================================================================
  // Request Lifecycle Helpers
  // ===========================================================================

  /**
   * Log request start with timing
   */
  requestStart(): { startTime: number } {
    this.info("Request started", {
      method: this.context.method,
      endpoint: this.context.endpoint,
    });
    return { startTime: Date.now() };
  }

  /**
   * Log request completion with duration
   */
  requestComplete(startTime: number, statusCode: number): void {
    const duration = Date.now() - startTime;
    this.info("Request completed", {
      statusCode,
      durationMs: duration,
    });
  }

  /**
   * Log request failure with duration
   */
  requestFailed(startTime: number, statusCode: number, error?: Error): void {
    const duration = Date.now() - startTime;
    this.error("Request failed", error, {
      statusCode,
      durationMs: duration,
    });
  }
}

// =============================================================================
// Default Logger Instance
// =============================================================================

export const logger = new Logger();

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a logger for a specific connector
 */
export function createConnectorLogger(connector: string): Logger {
  return new Logger({ connector });
}

/**
 * Create a logger for an API endpoint
 */
export function createEndpointLogger(endpoint: string, method: string): Logger {
  return new Logger({ endpoint, method });
}

/**
 * Create a logger with request context
 */
export function createRequestLogger(params: {
  requestId: string;
  organizationId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
}): Logger {
  return new Logger(params);
}

