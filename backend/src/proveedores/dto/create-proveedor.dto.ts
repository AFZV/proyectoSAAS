import { IsString, IsNotEmpty } from 'class-validator';
export class createProveedorDto {
  @IsString()
  @IsNotEmpty()
  identificacion: string;

  @IsString()
  @IsNotEmpty()
  razonSocial: string;

  @IsString()
  @IsNotEmpty()
  telefono: string;

  @IsString()
  @IsNotEmpty()
  direccion: string;
}

//   identificacion String @unique
//   razonsocial String @db.Text
//   telefono String @db.Text
//   direccion String @db.Text
