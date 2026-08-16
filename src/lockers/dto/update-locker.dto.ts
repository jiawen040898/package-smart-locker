import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { LockerSize } from '../../common/enums';

export class UpdateLockerDto {
  @ApiPropertyOptional({
    description: 'New size category for the locker',
    enum: LockerSize,
    example: LockerSize.LARGE,
  })
  @IsEnum(LockerSize)
  @IsOptional()
  size?: LockerSize;

  @ApiPropertyOptional({
    description: 'New physical location of the locker',
    example: 'Building B, Level 2, Near Lift',
  })
  @IsString()
  @IsOptional()
  location?: string;
}
