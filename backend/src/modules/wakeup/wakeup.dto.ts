import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsString, Length, Matches, Max, Min, ValidateIf } from 'class-validator';

export class CreateWakeupDto {
  @ApiProperty({ maxLength: 20 })
  @IsString()
  @Length(1, 20)
  @Matches(/\S/)
  machineId: string;

  @ApiProperty({ example: '08:30' })
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  wakeTime: string;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  headphone?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  lightStrip?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  screen?: boolean;

  @ApiPropertyOptional()
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  humanWake?: boolean;

  @ApiPropertyOptional({ minimum: 1, maximum: 30 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(30)
  snoozeInterval?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 10 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(0)
  @Max(10)
  maxSnooze?: number;
}
