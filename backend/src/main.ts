
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express } from 'express';
import { AppModule } from './app.module';

let cachedServer: Express;

const corsOptions = {
  origin: [
    'https://umssinspira3.vercel.app',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  optionsSuccessStatus: 204,
};

function configureApp(app: INestApplication) {
  app.enableCors(corsOptions);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

export async function createNestServer(): Promise<Express> {
  if (!cachedServer) {
    const server: Express = express();

    const app: INestApplication = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    configureApp(app);

    await app.init();

    cachedServer = server;
  }

  return cachedServer;
}

// Servidor local
async function bootstrapLocal() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const port = process.env.PORT ?? 3001;

  await app.listen(port);

  console.log(`Application is running on port ${port}`);
}

// Ejecutar servidor local únicamente fuera de Vercel.
if (!process.env.VERCEL) {
  void bootstrapLocal();
}

// Función serverless de Vercel.
export default async function handler(req: any, res: any) {
  try {
    const server = await createNestServer();

    server(req, res);
  } catch (err: any) {
    console.error('NestJS bootstrap serverless error:', err);

    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');

    res.end(
      JSON.stringify({
        error: 'NESTJS_BOOTSTRAP_ERROR',
        message:
          'Failed to initialize Nest application in serverless environment.',
        details: String(err?.message || err),
        stack: err?.stack,
      }),
    );
  }
}
