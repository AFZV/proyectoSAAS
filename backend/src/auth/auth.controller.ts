import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard'; // Asegúrate de importar bien
import { UsuarioRequest } from 'src/types/request-with-usuario';
import { SuperadminGuard } from 'src/common/guards/superadmin.guard';
import { CompleteClientRegistrationDto } from './dto/complete-client-registration.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(UsuarioGuard)
  @Get('usuario-actual')
  async obtenerUsuarioActual(@Req() req: UsuarioRequest) {
    const userId = req['usuario'].codigo;
    return await this.authService.getUserByCodigo(userId);
  }
  @UseGuards(SuperadminGuard)
  @Get('superadmin')
  async obtenerSuperAdmin(@Req() req: UsuarioRequest) {
    const usuario = req.usuario;
    return await this.authService.verificarSuperAdmin(usuario);
  }

  // Historia 3: Completar registro de cliente existente (público)
  @Post('client/complete')
  async completeClientRegistration(
    @Body() dto: CompleteClientRegistrationDto,
  ) {
    return await this.authService.completeClientRegistration(dto);
  }
}
