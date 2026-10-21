import { SetMetadata } from '@nestjs/common';

export const STAFF_ROLES = ['admin', 'manager', 'cashier', 'technician', 'cleaner'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type ActorRole = StaffRole | 'customer';
export interface StaffActor { id: number; role: StaffRole }
export const STAFF_ROLES_KEY = 'staffRoles';

export const Roles = (...roles: ActorRole[]) => SetMetadata(STAFF_ROLES_KEY, roles);
