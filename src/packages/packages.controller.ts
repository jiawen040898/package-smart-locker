import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DeliverPackageDto, RetrievePackageDto } from './dto';
import type { DeliveryResult } from './services/package-delivery.service';
import { PackageDeliveryService } from './services/package-delivery.service';
import type {
  RetrievalCheckResult,
  RetrievalConfirmResult,
} from './services/package-retrieval.service';
import { PackageRetrievalService } from './services/package-retrieval.service';

@ApiTags('Packages')
@Controller('packages')
export class PackagesController {
  constructor(
    private readonly deliveryService: PackageDeliveryService,
    private readonly retrievalService: PackageRetrievalService,
  ) {}

  @Post('deliver')
  @ApiOperation({
    summary: 'Store a package (Delivery Agent)',
    description:
      'Delivery agent stores a package. The system finds the smallest available locker that fits the package and generates a pickup code. Concurrent requests are safely handled — each locker is assigned to only one package.',
  })
  @ApiResponse({ status: 201, description: 'Package stored successfully' })
  @ApiResponse({ status: 409, description: 'No suitable locker available' })
  async deliver(@Body() dto: DeliverPackageDto): Promise<DeliveryResult> {
    return this.deliveryService.deliver(dto.packageSize, dto.recipientName);
  }

  @Post('retrieve/check')
  @ApiOperation({
    summary: 'Check storage charge before retrieval (Customer)',
    description:
      'Customer provides locker ID and pickup code. System validates the request and returns the storage charge. The locker remains locked until confirmation.',
  })
  @ApiResponse({
    status: 201,
    description: 'Charge calculated — awaiting payment confirmation',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired pickup code' })
  @ApiResponse({ status: 404, description: 'Locker not found' })
  retrieveCheck(@Body() dto: RetrievePackageDto): RetrievalCheckResult {
    return this.retrievalService.check(dto.lockerId, dto.pickupCode);
  }

  @Post('retrieve/confirm')
  @ApiOperation({
    summary: 'Confirm payment and retrieve package (Customer)',
    description:
      'Customer confirms payment. The system processes payment, releases the package, and opens the locker.',
  })
  @ApiResponse({
    status: 201,
    description: 'Package retrieved and payment confirmed',
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired pickup code' })
  @ApiResponse({ status: 402, description: 'Payment failed' })
  @ApiResponse({ status: 404, description: 'Locker not found' })
  retrieveConfirm(@Body() dto: RetrievePackageDto): RetrievalConfirmResult {
    return this.retrievalService.confirm(dto.lockerId, dto.pickupCode);
  }
}
