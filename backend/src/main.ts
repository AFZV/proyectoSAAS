import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  //  Permitir CORS solo desde el frontend en desarrollo
  app.enableCors({
    origin: [
      'http://g844cwsocsw44ck8s88oocgg.69.62.65.126.sslip.io',
      'http://g844cwsocsw44ck8s88oocgg.69.62.65.126.sslip.io:3000',
      'https://g844cwsocsw44ck8s88oocgg.69.62.65.126.sslip.io',
      'http://localhost:3000',
      'https://bgacloudsaas.com',
      'https://www.bgacloudsaas.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', // incluye OPTIONS
    allowedHeaders: '*', // permite todos los headers
    credentials: true,
    preflightContinue: false, // Nest responde el preflight
    optionsSuccessStatus: 204,
  });

  //  Pipe global para validación con detalles de errores
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        return new BadRequestException(errors);
      },
    })
  );
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

  await app.listen(4000, '0.0.0.0');
}

bootstrap();
