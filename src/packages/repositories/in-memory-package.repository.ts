import { Injectable } from '@nestjs/common';
import { IPackageRepository } from '../../common/interfaces';
import { Package } from '../entities/package.entity';

@Injectable()
export class InMemoryPackageRepository implements IPackageRepository {
  private packages: Map<string, Package> = new Map();

  findById(id: string): Package | undefined {
    return this.packages.get(id);
  }

  findByLockerId(lockerId: string): Package | undefined {
    return Array.from(this.packages.values()).find(
      (pkg) => pkg.lockerId === lockerId && pkg.isStored,
    );
  }

  findAll(): Package[] {
    return Array.from(this.packages.values());
  }

  save(pkg: Package): Package {
    this.packages.set(pkg.id, pkg);
    return pkg;
  }

  update(pkg: Package): Package {
    this.packages.set(pkg.id, pkg);
    return pkg;
  }
}
