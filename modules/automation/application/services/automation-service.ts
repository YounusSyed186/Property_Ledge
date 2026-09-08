import { IAutomationRepository } from '../../domain/repositories/automation-repository';
import {
  AutomationDTO,
  CreateAutomationDTO,
  UpdateAutomationDTO,
} from '../dto/automation-dto';
import { Automation } from '../../domain/entities/automation';
import { TriggerType } from '../../domain/types/trigger.types';

export class AutomationService {
  constructor(private automationRepo: IAutomationRepository) {}

  private toDTO(entity: Automation): AutomationDTO {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      name: entity.name,
      description: entity.description,
      triggerType: entity.triggerType,
      triggerConfig: entity.triggerConfig,
      conditions: entity.conditions,
      actions: entity.actions,
      isActive: entity.isActive,
      createdBy: entity.createdBy,
      lastRunAt: entity.lastRunAt,
      runCount: entity.runCount,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  async getAutomationById(id: string): Promise<AutomationDTO | null> {
    const automation = await this.automationRepo.findById(id);
    return automation ? this.toDTO(automation) : null;
  }

  async getAutomationsByWorkspace(workspaceId: string): Promise<AutomationDTO[]> {
    const list = await this.automationRepo.findByWorkspaceId(workspaceId);
    return list.map((a) => this.toDTO(a));
  }

  async getActiveByTriggerType(triggerType: TriggerType, workspaceId?: string): Promise<AutomationDTO[]> {
    const list = await this.automationRepo.findActiveByTriggerType(triggerType, workspaceId);
    return list.map((a) => this.toDTO(a));
  }

  async getActiveByEventName(eventName: string, workspaceId?: string): Promise<AutomationDTO[]> {
    const list = await this.automationRepo.findActiveByEventName(eventName, workspaceId);
    return list.map((a) => this.toDTO(a));
  }

  async createAutomation(workspaceId: string, dto: CreateAutomationDTO, userId?: string): Promise<AutomationDTO> {
    const created = await this.automationRepo.create({
      workspaceId,
      name: dto.name,
      description: dto.description || null,
      triggerType: dto.triggerType,
      triggerConfig: dto.triggerConfig,
      conditions: dto.conditions || { operator: 'AND', rules: [] },
      actions: dto.actions,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      createdBy: userId || null,
    });
    return this.toDTO(created);
  }

  async updateAutomation(id: string, dto: UpdateAutomationDTO): Promise<AutomationDTO> {
    const updated = await this.automationRepo.update(id, {
      name: dto.name,
      description: dto.description,
      triggerType: dto.triggerType,
      triggerConfig: dto.triggerConfig,
      conditions: dto.conditions,
      actions: dto.actions,
      isActive: dto.isActive,
    });
    return this.toDTO(updated);
  }

  async toggleActive(id: string, isActive: boolean): Promise<AutomationDTO> {
    const updated = await this.automationRepo.update(id, { isActive });
    return this.toDTO(updated);
  }

  async deleteAutomation(id: string): Promise<void> {
    await this.automationRepo.delete(id);
  }
}
