import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, IsUrl, Length, Matches, MaxLength, ValidateIf } from 'class-validator';

class UserContactDto {
  @ApiPropertyOptional({ description: '11位手机号' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/^1[3-9]\d{9}$/)
  phone?: string;

  @ApiPropertyOptional({ description: '头像 HTTP/HTTPS 地址' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(255)
  avatar?: string;
}

export class CreateUserDto extends UserContactDto {
  @ApiProperty({ description: '会员昵称' })
  @IsString()
  @Length(1, 50)
  @Matches(/\S/, { message: '昵称不能只包含空白字符' })
  nickname: string;
}

export class UpdateUserDto extends UserContactDto {
  @ApiPropertyOptional({ description: '会员昵称' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Length(1, 50)
  @Matches(/\S/, { message: '昵称不能只包含空白字符' })
  nickname?: string;

  @ApiPropertyOptional({ description: '会员是否启用' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
