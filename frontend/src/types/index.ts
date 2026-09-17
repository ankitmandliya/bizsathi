export type StatusTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface AppUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
}
