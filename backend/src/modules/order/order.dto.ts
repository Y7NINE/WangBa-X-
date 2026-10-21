import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsString, IsUUID, Max, MaxLength, Min, ValidateIf, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  itemId: number;

  @ApiProperty({ minimum: 1, maximum: 20 })
  @IsInt()
  @Min(1)
  @Max(20)
  qty: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'UUID v4；超时重试须使用原编号和原参数' })
  @IsUUID('4')
  requestId: string;

  @ApiPropertyOptional({ description: '员工下单须指定会员；顾客身份由服务端确定' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(Number.MAX_SAFE_INTEGER)
  userId?: number;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiPropertyOptional({ maxLength: 255 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  remark?: string;
}

export class UpdateOrderStatusDto {
  @IsIn(['preparing', 'delivering', 'completed', 'cancelled'])
  status: string;
}
