import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Pool } from 'pg';

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

export const benefits = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const queryParams = event.queryStringParameters || {};
    let query = 'SELECT * FROM benefits';
    const values: any[] = [];
    const conditions: string[] = [];

    if (queryParams.bank) {
      conditions.push(`bank = $${values.length + 1}`);
      values.push(queryParams.bank);
    }

    if (queryParams.category) {
      conditions.push(`category = $${values.length + 1}`);
      values.push(queryParams.category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (queryParams.sort) {
      query += ` ORDER BY ${queryParams.sort}`;
    }

    if (queryParams.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(parseInt(queryParams.limit));
    }

    const result = await pool.query(query, values);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result.rows)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido'
      })
    };
  }
}; 