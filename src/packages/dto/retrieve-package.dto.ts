import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RetrievePackageDto {
  @ApiProperty({
    description: 'ID of the locker containing the package',
    example: 'locker-1',
  })
  @IsString()
  @IsNotEmpty()
  lockerId: string;

  @ApiProperty({
    description: 'Pickup code provided to the customer for retrieval',
    example: 'ABC123',
  })
  @IsString()
  @IsNotEmpty()
  pickupCode: string;
}
