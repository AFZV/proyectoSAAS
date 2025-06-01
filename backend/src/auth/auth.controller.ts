import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsuarioGuard } from 'src/common/guards/usuario.guard'; // Asegúrate de importar bien
import { UsuarioRequest } from 'src/types/request-with-usuario';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(UsuarioGuard)
  @Get('usuario-actual')
  async obtenerUsuarioActual(@Req() req: UsuarioRequest) {
    const userId = req['usuario'].codigo;
    return await this.authService.getUserByCodigo(userId);
  }
}
