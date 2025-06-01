import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  //  Permitir CORS solo desde el frontend en desarrollo
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
  });

  //  Pipe global para validación con detalles de errores
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        console.error('🚨 Errores de validación:', errors);
        return new BadRequestException(errors);
      },
    }),
  );

  await app.listen(4000);
  console.log('🚀 Servidor iniciado en http://localhost:4000');
}

bootstrap();
