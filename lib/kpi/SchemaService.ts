/**
 * Schema Registry Service
 * 
 * Manages KPI schema versions:
 * - Get default schema (most recent active)
 * - Get specific schema version
 * - Validate against schema
 * 
 * Note: The SchemaRegistry model uses isActive flag.
 * The "default" schema is determined by convention (version "1.0" or most recent active).
 */

import prisma from "../prisma";
import { ApiError } from "../core/ErrorHandler";
import type { SchemaRegistry } from "@prisma/client";

// =============================================================================
// Types
// =============================================================================

export interface SchemaInfo {
  id: string;
  version: string;
  name: string | null;
  isActive: boolean;
}

// =============================================================================
// Schema Service
// =============================================================================

export class SchemaService {
  private cache: Map<string, SchemaRegistry> = new Map();
  private defaultSchema: SchemaRegistry | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEFAULT_VERSION = "0.9.2"; // V0.9.2 ZIA KPI Basic Set

  /**
   * Get the default active schema
   * Uses version "1.0" as the default by convention
   */
  async getDefaultSchema(): Promise<SchemaRegistry> {
    // Check cache
    if (this.defaultSchema && Date.now() < this.cacheExpiry) {
      return this.defaultSchema;
    }

    // Try to get the default version (1.0)
    let schema = await prisma.schemaRegistry.findFirst({
      where: {
        version: this.DEFAULT_VERSION,
        isActive: true,
      },
    });

    // Fallback to most recent active schema
    if (!schema) {
      schema = await prisma.schemaRegistry.findFirst({
        where: {
          isActive: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!schema) {
      throw ApiError.internal("No default schema version configured");
    }

    // Cache it
    this.defaultSchema = schema;
    this.cache.set(schema.version, schema);
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    return schema;
  }

  /**
   * Get schema by version string
   */
  async getSchemaByVersion(version: string): Promise<SchemaRegistry> {
    // Check cache
    const cached = this.cache.get(version);
    if (cached && Date.now() < this.cacheExpiry) {
      return cached;
    }

    const schema = await prisma.schemaRegistry.findUnique({
      where: { version },
    });

    if (!schema) {
      throw ApiError.schemaNotFound(version);
    }

    if (!schema.isActive) {
      throw ApiError.schemaInactive(version);
    }

    // Cache it
    this.cache.set(version, schema);
    this.cacheExpiry = Date.now() + this.CACHE_TTL;

    return schema;
  }

  /**
   * Get schema - uses default if version not specified
   */
  async getSchema(version?: string): Promise<SchemaRegistry> {
    if (version) {
      return this.getSchemaByVersion(version);
    }
    return this.getDefaultSchema();
  }

  /**
   * Get schema by ID
   */
  async getSchemaById(id: string): Promise<SchemaRegistry | null> {
    return prisma.schemaRegistry.findUnique({
      where: { id },
    });
  }

  /**
   * List all schemas
   */
  async listSchemas(includeInactive = false): Promise<SchemaInfo[]> {
    const schemas = await prisma.schemaRegistry.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        version: true,
        name: true,
        isActive: true,
      },
    });

    return schemas;
  }

  /**
   * Get default version string
   */
  async getDefaultVersion(): Promise<string> {
    const schema = await this.getDefaultSchema();
    return schema.version;
  }

  /**
   * Clear cache (useful for testing or after admin updates)
   */
  clearCache(): void {
    this.cache.clear();
    this.defaultSchema = null;
    this.cacheExpiry = 0;
  }

  /**
   * Create a new schema version (admin only)
   */
  async createSchema(params: {
    version: string;
    name?: string;
    description?: string;
    schema: object;
  }): Promise<SchemaRegistry> {
    const schema = await prisma.schemaRegistry.create({
      data: {
        version: params.version,
        name: params.name,
        description: params.description,
        schema: params.schema,
        isActive: true,
      },
    });

    // Clear cache
    this.clearCache();

    return schema;
  }

  /**
   * Deprecate a schema (mark as inactive)
   */
  async deprecateSchema(version: string): Promise<SchemaRegistry> {
    const schema = await prisma.schemaRegistry.findUnique({
      where: { version },
    });

    if (!schema) {
      throw ApiError.schemaNotFound(version);
    }

    // Don't allow deprecating the default version
    if (version === this.DEFAULT_VERSION) {
      throw ApiError.validation("Cannot deprecate the default schema version");
    }

    const updated = await prisma.schemaRegistry.update({
      where: { id: schema.id },
      data: {
        isActive: false,
        deprecatedAt: new Date(),
      },
    });

    // Clear cache
    this.clearCache();

    return updated;
  }
}

// =============================================================================
// Default Instance
// =============================================================================

export const schemaService = new SchemaService();
