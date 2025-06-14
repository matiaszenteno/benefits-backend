import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import fetch from 'node-fetch';

// Actualizada para que sea accesible desde AWS Lambda (no localhost)
const N8N_WEBHOOK_URL = 'https://benefits-workflow.n8n.cloud/webhook/bec74910-0988-4aa2-a2f7-bc880318b7c2';

interface SearchRequest {
  query: string;
  filters?: {
    category?: string;
  };
}

// Exportamos la función handler directamente
export const search = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Método no permitido. Solo se acepta POST para búsquedas AI.' })
      };
    }

    const body = JSON.parse(event.body || '{}') as SearchRequest;
    const { query, filters } = body;

    if (!query) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Query es requerido para búsqueda AI' })
      };
    }

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, filters, useAI: true })
    });

    if (!response.ok) {
      throw new Error(`Error en n8n: ${response.statusText}`);
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(await response.json())
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    };
  }
}; 