import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LockerSize } from '../../common/enums';

export class CreateLockerDto {
  @ApiProperty({
    description: 'Size category of the locker',
    enum: LockerSize,
    example: LockerSize.MEDIUM,
  })
  @IsEnum(LockerSize)
  @IsNotEmpty()
  size: LockerSize;

  @ApiProperty({
    description: 'Physical location of the locker station',
    example: 'Building A, Level 1, Near Lobby',
  })
  @IsString()
  @IsNotEmpty()
  location: string;
}
