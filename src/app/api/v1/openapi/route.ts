import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-static'

export async function GET() {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://credi-marketplace.vercel.app'

  const document = {
    openapi: '3.1.0',
    info: {
      title: 'Credi Marketplace API',
      version: '1.0.0',
      description: 'API para integraciones de comercio y agentes externos.',
    },
    servers: [{ url: origin }],
    paths: {
      '/api/v1/catalog': {
        get: {
          summary: 'Consultar catálogo',
          parameters: [
            {
              name: 'q',
              in: 'query',
              schema: { type: 'string' },
            },
            {
              name: 'limit',
              in: 'query',
              schema: {
                type: 'integer',
                minimum: 1,
                maximum: 100,
              },
            },
          ],
          responses: {
            '200': {
              description: 'Catálogo publicado',
            },
          },
        },
      },
      '/api/v1/checkout/intent': {
        post: {
          summary: 'Crear intención de checkout',
          security: [{ bearerAuth: [] }],
          responses: {
            '201': {
              description: 'Intención creada',
            },
            '401': {
              description: 'API key inválida',
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key Credi (SHA-256 almacenada por Credi).',
        },
      },
    },
  }

  return NextResponse.json(document, {
    headers: {
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
