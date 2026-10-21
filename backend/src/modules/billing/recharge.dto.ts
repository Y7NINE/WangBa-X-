import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsNumber, IsUUID, Max, Min } from 'class-validator';

export class RechargeDto {
  @ApiProperty({ description: '本笔充值的UUID v4；超时或重试必须复用原编号' })
  @IsUUID('4')
  requestId: string;

  @ApiProperty({ description: '会员ID', minimum: 1 })
  @IsInt()
  @Min(1)
  userId: number;

  @ApiProperty({ description: '前台记账金额，最多两位小数', minimum: 0.01, maximum: 10000 })
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @Min(0.01)
  @Max(10000)
  amount: number;

  @ApiProperty({ enum: ['cash', 'wechat', 'alipay', 'demo'] })
  @IsIn(['cash', 'wechat', 'alipay', 'demo'])
  paymentMethod: string;
}
