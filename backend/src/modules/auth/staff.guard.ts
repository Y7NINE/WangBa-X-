import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { STAFF_ROLES, STAFF_ROLES_KEY, ActorRole } from './roles.decorator';

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    if (!user || !Number.isSafeInteger(user.id) || user.id < 1 || !STAFF_ROLES.includes(user.role)) throw new ForbiddenException('仅门店员工可操作');
    const roles = this.reflector.getAllAndOverride<ActorRole[]>(STAFF_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && !roles.includes(user.role)) throw new ForbiddenException('当前员工角色无权执行此操作');
    return true;
  }
}
