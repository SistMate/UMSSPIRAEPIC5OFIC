import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express, type Request, type Response } from 'express';
import { AppModule } from './app.module';

let cachedServer: Express;

export async function createNestServer(): Promise<Express> {
  if (!cachedServer) {
    const server: Express = express();
    const app: INestApplication = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.enableCors();
    await app.init();
    cachedServer = server;
  }
  return cachedServer;
}

// Local standalone server
async function bootstrapLocal() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
}

// Only launch standalone listener when not in Vercel serverless environment
if (!process.env.VERCEL) {
  void bootstrapLocal();
}

// Vercel serverless function export
export default async function handler(req: Request, res: Response) {
  try {
    const server = await createNestServer();
    server(req, res);
  } catch (error: unknown) {
    console.error('NestJS bootstrap serverless error:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    const message = error instanceof Error ? error.message : String(error);
    res.end(
      JSON.stringify({
        error: 'NESTJS_BOOTSTRAP_ERROR',
        message:
          'Failed to initialize Nest application in serverless environment.',
        details: message,
        ...(error instanceof Error && error.stack
          ? { stack: error.stack }
          : {}),
      }),
    );
  }
}