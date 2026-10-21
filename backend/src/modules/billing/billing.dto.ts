import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';

export class StartSessionDto {
  @ApiProperty({ description: '会员ID', minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: '座位编号', maxLength: 20 })
  @IsString()
  @Length(1, 20)
  @Matches(/\S/, { message: '座位编号不能为空白' })
  machineId: string;
}

export class MemberQueryDto {
  @ApiPropertyOptional({ description: '会员ID；员工查询历史时必填，顾客始终查询本人', minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  userId?: number;
}

export class TransactionsQueryDto extends MemberQueryDto {
  @ApiPropertyOptional({ enum: ['recharge', 'consume', 'bonus', 'refund'] })
  @IsOptional()
  @IsIn(['recharge', 'consume', 'bonus', 'refund'])
  type?: string;
}
