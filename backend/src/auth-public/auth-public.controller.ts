import { Controller, Post, Body } from '@nestjs/common';
import { AuthPublicService } from './auth-public.service';
import { AsignarPasswordDto } from './dto/asignar-password.dto';
import { RegistroClienteDto } from './dto/registro-cliente.dto';
//import { LoginTestDto } from './dto/login-test.dto'; //para pruebas con Clerk
//import { ClerkService } from '../clerk/clerk.service'; para pruebas con Clerk

@Controller('auth/public')
export class AuthPublicController {
  constructor(
    private authPublicService: AuthPublicService
    //private clerkService: ClerkService, //para pruebas con Clerk
  ) {}

  /**
   * POST /auth/public/cliente-existente/asignar-password
   * Cliente existente (ya registrado por vendedor) asigna contraseña para acceder al sistema
   */
  @Post('cliente-existente/asignar-password')
  async asignarPasswordClienteExistente(@Body() dto: AsignarPasswordDto) {
    return this.authPublicService.asignarPasswordClienteExistente(dto);
  }

  /**
   * POST /auth/public/cliente-nuevo/registrar
   * Cliente nuevo se autoregistra completamente (datos + cuenta)
   */
  @Post('cliente-nuevo/registrar')
  async registrarClienteNuevo(@Body() dto: RegistroClienteDto) {
    return this.authPublicService.registrarClienteNuevo(dto);
  }

  /**
   * POST /auth/public/test-login
   * SOLO PARA TESTING - Verificar si el usuario existe en Clerk
   * El login real debe hacerse desde el frontend con Clerk SDK
   */
  /** @Post('test-login')
    async testLogin(@Body() dto: LoginTestDto) {
        return this.clerkService.verifyCredentials(dto.email, dto.password);
    }*/ //para pruebas con Clerk
}
