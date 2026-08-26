import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // All endpoints are prefixed with /api (e.g. /api/users, /api/auth)
  app.setGlobalPrefix('api');

  // Automatic DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // CORS configuration
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl && process.env.NODE_ENV === 'production') {
    Logger.warn(
      'FRONTEND_URL environment variable is not defined in production!',
      'Bootstrap',
    );
  }

  app.enableCors({
    origin: frontendUrl ?? 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  const backendUrl = process.env.BACKEND_URL ?? `http://localhost:${port}`;
  Logger.log(`Application is running on: ${backendUrl}/api`, 'Bootstrap');
}
void bootstrap();
