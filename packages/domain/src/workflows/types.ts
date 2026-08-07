import type { EntityId, ISODateString } from "@ghost/shared";

import type { DomainEventType } from "../events/types.js";

export type WorkflowChannel = "whatsapp" | "email";

export type WorkflowOutboxStatus = "pending" | "ready" | "sent" | "failed" | "skipped";

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  trigger: DomainEventType;
  channel: WorkflowChannel;
  enabledByDefault: boolean;
}

export interface WorkflowOutboxEntryInput {
  workflowId: string;
  channel: WorkflowChannel;
  title: string;
  message: string;
  actionUrl?: string;
  recipientPhone?: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface WorkflowOutboxEntry extends WorkflowOutboxEntryInput {
  id: EntityId;
  organizationId: EntityId;
  domainEventId?: EntityId;
  domainEventType: DomainEventType;
  status: WorkflowOutboxStatus;
  createdAt?: ISODateString;
  processedAt?: ISODateString;
  errorMessage?: string;
}

export interface OrganizationWorkflowSettings {
  enabledWorkflowIds: string[];
  /** Teléfono operativo para alertas (solo dígitos, ej. 573001234567). */
  staffWhatsAppPhone?: string;
  /** Umbral COP para alerta de venta alta. */
  highValueSaleThresholdCop: number;
}

export type OrganizationWorkflowSettingsInput = Partial<OrganizationWorkflowSettings>;

export interface WorkflowEvaluationContext {
  organizationName: string;
  workflowSettings: OrganizationWorkflowSettings;
}
