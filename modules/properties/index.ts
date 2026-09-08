/**
 * Property Module Public API.
 * Exposes pure domain models, DTOs, and application contracts.
 * Infrastructure implementations are intentionally kept internal.
 */

export * from './domain/entities/property';
export * from './domain/repositories/property-repository';
export * from './application/dto/property-dto';
export * from './application/services/property-service';
export * from './presentation/client/property-client';
