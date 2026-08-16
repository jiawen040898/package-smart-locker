import { Package } from '../../packages/entities/package.entity';

export const PACKAGE_REPOSITORY = Symbol('PACKAGE_REPOSITORY');

export interface IPackageRepository {
  findById(id: string): Package | undefined;
  findByLockerId(lockerId: string): Package | undefined;
  findAll(): Package[];
  save(pkg: Package): Package;
  update(pkg: Package): Package;
}
