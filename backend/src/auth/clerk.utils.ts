import { UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { ClerkTokenPayload } from './clerk.types';

export async function verificarTokenClerk(
  authHeader?: string,
): Promise<ClerkTokenPayload> {
  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Token no proporcionado o mal formado');
  }

  const token = authHeader.replace('Bearer ', '');
  console.log('este es el token que llega al backend:', token);

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    console.log('esto hay en payload:', payload);
    return payload as ClerkTokenPayload;
  } catch (error) {
    console.error(
      '🧨 Error al verificar token Clerk:',
      JSON.stringify(error, null, 2),
    );
    throw new UnauthorizedException('Token inválido o expirado');
  }
}
