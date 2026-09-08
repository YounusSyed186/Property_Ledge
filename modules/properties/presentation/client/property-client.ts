/**
 * Property Client Interface.
 * The Presentation layer depends on this contract for data access.
 * Decoupled from transport mechanism (Server Actions, REST, or GraphQL).
 */

import { Property, PropertyFilters } from '../../domain/entities/property';
import { CreatePropertyDTO, UpdatePropertyDTO } from '../../application/dto/property-dto';

export interface PropertyClient {
  list(filters?: PropertyFilters): Promise<Property[]>;
  get(id: string): Promise<Property>;
  create(dto: CreatePropertyDTO): Promise<Property>;
  update(id: string, dto: UpdatePropertyDTO): Promise<Property>;
  archive(id: string): Promise<void>;
  restore(id: string): Promise<Property>;
  delete(id: string): Promise<void>;
}
