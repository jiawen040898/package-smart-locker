import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { LockerSize } from '../../common/enums';

export class DeliverPackageDto {
  @ApiProperty({
    description: 'Size of the package to be stored',
    enum: LockerSize,
    example: LockerSize.MEDIUM,
  })
  @IsEnum(LockerSize)
  @IsNotEmpty()
  packageSize: LockerSize;

  @ApiProperty({
    description: 'Name of the recipient who will collect the package',
    example: 'John Doe',
  })
  @IsString()
  @IsNotEmpty()
  recipientName: string;
}
