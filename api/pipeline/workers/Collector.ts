import { Lead } from '../types';

export class Collector {
  private leads: Map<string, Lead> = new Map();

  public addLead(lead: Lead): void {
    this.leads.set(lead.id, lead);
  }

  public getLead(id: string): Lead | undefined {
    return this.leads.get(id);
  }

  public updateLead(id: string, updates: Partial<Lead>): void {
    const existing = this.leads.get(id);
    if (existing) {
      this.leads.set(id, { ...existing, ...updates });
    }
  }

  public getAllLeads(): Lead[] {
    return Array.from(this.leads.values());
  }
}
