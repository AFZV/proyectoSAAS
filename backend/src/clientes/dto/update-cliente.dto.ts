import { PartialType } from '@nestjs/mapped-types';
import { CreateClienteDto } from './create-cliente.dto';

// Este DTO permite actualizar uno o varios campos opcionalmente
export class UpdateClienteDto extends PartialType(CreateClienteDto) {}
