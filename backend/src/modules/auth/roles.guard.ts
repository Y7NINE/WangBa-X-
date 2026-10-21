import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ActorRole, STAFF_ROLES_KEY } from './roles.decorator';

/** For routes shared by customers and selected staff; missing policy fails closed. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    const roles = this.reflector.getAllAndOverride<ActorRole[]>(STAFF_ROLES_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (!user || !Number.isSafeInteger(user.id) || user.id < 1 || !roles?.includes(user.role)) {
      throw new ForbiddenException('当前身份无权执行此操作');
    }
    return true;
  }
}
