import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { LockersService } from './lockers.service';

@ApiTags('Lockers')
@Controller('lockers')
export class LockersController {
  constructor(private readonly lockersService: LockersService) {}

  @Get()
  @ApiOperation({
    summary: 'List all lockers',
    description: 'Returns all lockers with their current status and location',
  })
  @ApiResponse({ status: 200, description: 'List of all lockers' })
  findAll() {
    return this.lockersService.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new locker',
    description:
      'Adds a new locker to the system. Locker ID is auto-generated.',
  })
  @ApiResponse({ status: 201, description: 'Locker created successfully' })
  create(@Body() dto: CreateLockerDto) {
    return this.lockersService.create(dto.size, dto.location);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a locker',
    description:
      'Updates the size or location of a locker. Cannot update an occupied locker.',
  })
  @ApiResponse({ status: 200, description: 'Locker updated successfully' })
  @ApiResponse({ status: 404, description: 'Locker not found' })
  @ApiResponse({
    status: 409,
    description: 'Locker is occupied and cannot be updated',
  })
  update(@Param('id') id: string, @Body() dto: UpdateLockerDto) {
    return this.lockersService.update(id, dto.size, dto.location);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Remove a locker',
    description:
      'Removes a locker from the system. Cannot remove a locker that currently holds a package.',
  })
  @ApiResponse({ status: 200, description: 'Locker removed successfully' })
  @ApiResponse({ status: 404, description: 'Locker not found' })
  @ApiResponse({
    status: 409,
    description: 'Locker is occupied and cannot be removed',
  })
  remove(@Param('id') id: string) {
    return this.lockersService.remove(id);
  }
}
