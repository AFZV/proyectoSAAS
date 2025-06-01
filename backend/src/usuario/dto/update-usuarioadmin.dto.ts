import { PartialType } from '@nestjs/mapped-types';
import { CreateSuperadminDto } from './create-superadmin.dto';

export class UpdateUsuarioAdminDto extends PartialType(CreateSuperadminDto) {}
