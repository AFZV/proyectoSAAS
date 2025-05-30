import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('usuario-actual')
  async obtenerUsuarioActual(@Headers('authorization') authHeader: string) {
    if (!authHeader) {
      throw new UnauthorizedException('userId no proporcionado');
    }

    const userId = authHeader; // directamente el código de Clerk (user_...)

    return await this.authService.getUserByCodigo(userId);
  }
}
