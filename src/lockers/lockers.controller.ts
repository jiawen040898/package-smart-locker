import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { ILockerRepository } from '../common/interfaces';
import { LOCKER_REPOSITORY } from '../common/interfaces';
import { Locker } from './entities/locker.entity';
import { CreateLockerDto } from './dto/create-locker.dto';

@ApiTags('Lockers')
@Controller('lockers')
export class LockersController {
  constructor(
    @Inject(LOCKER_REPOSITORY)
    private readonly lockerRepository: ILockerRepository,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all lockers',
    description: 'Returns all lockers with their current status and location',
  })
  @ApiResponse({ status: 200, description: 'List of all lockers' })
  findAll() {
    return this.lockerRepository.findAll().map((locker) => ({
      id: locker.id,
      size: locker.size,
      location: locker.location,
      status: locker.status,
    }));
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new locker',
    description: 'Adds a new locker to the system inventory',
  })
  @ApiResponse({ status: 201, description: 'Locker created successfully' })
  create(@Body() dto: CreateLockerDto) {
    const locker = new Locker(dto.id, dto.size, dto.location);
    this.lockerRepository.save(locker);
    return { id: locker.id, size: locker.size, location: locker.location, status: locker.status };
  }
}
