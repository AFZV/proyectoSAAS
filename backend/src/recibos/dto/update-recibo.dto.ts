import { PartialType } from '@nestjs/mapped-types';
import { CrearReciboDto } from './create-recibo.dto';

export class UpdateReciboDto extends PartialType(CrearReciboDto) {}
