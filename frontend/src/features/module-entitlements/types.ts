export interface ModuleEntitlement {
  id: number;
  client_id: number;
  entitlement_type: 'feature' | 'program';
  feature_key?: string | null;
  program_id?: number | null;
  enabled: boolean;
  assigned_by_user_id: number;
  assigned_at: string;
}

export interface ModuleProgramOption {
  id: number;
  name: string;
  code?: string | null;
}
