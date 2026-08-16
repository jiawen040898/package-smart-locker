import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable global validation pipe for DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Smart Package Locker System')
    .setDescription(
      'A package locker management system that allows delivery agents to store packages ' +
        'and customers to retrieve them using pickup codes.',
    )
    .setVersion('1.0')
    .addTag('Lockers', 'Manage locker inventory')
    .addTag('Packages', 'Deliver and retrieve packages')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Application running on http://localhost:3000');
  console.log('Swagger UI available at http://localhost:3000/api');
}

void bootstrap();
