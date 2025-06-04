// src/middleware/auth.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { verifyToken } from '@clerk/backend';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No autorizado: sin token' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });

    // Puedes guardar el userId en el request
    req['userId'] = payload.sub;

    next();
  } catch (err) {
    console.error('Error al verificar token:', err);
    return res.status(401).json({ message: 'Token inválido' });
  }
}
