import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, Length, Matches, MaxLength, ValidateIf } from 'class-validator';

export class CreateFaultDto {
  @ApiProperty({ maxLength: 20 })
  @IsString()
  @Length(1, 20)
  @Matches(/\S/)
  machineId: string;

  @ApiProperty({ maxLength: 50 })
  @IsString()
  @Length(1, 50)
  faultType: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ enum: ['wait', 'change', 'wait_repair', 'request_change'] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsIn(['wait', 'change', 'wait_repair', 'request_change'])
  playerAction?: string;
}

export class ResolveFaultDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @Length(1, 50)
  @Matches(/\S/)
  resolution: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class TransferFaultDto {
  @ApiProperty({ maxLength: 20 })
  @IsString()
  @Length(1, 20)
  @Matches(/\S/)
  newMachineId: string;
}

export class FaultQueryDto {
  @ApiPropertyOptional({ enum: ['pending', 'accepted', 'processing', 'transferred', 'resolved', 'cancelled', 'escalated'] })
  @IsOptional()
  @IsIn(['pending', 'accepted', 'processing', 'transferred', 'resolved', 'cancelled', 'escalated'])
  status?: string;

  @ApiPropertyOptional({ enum: ['P0', 'P1', 'P2', 'P3'] })
  @IsOptional()
  @IsIn(['P0', 'P1', 'P2', 'P3'])
  priority?: string;
}
