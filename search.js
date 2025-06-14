const response = require('./response');

// Función para llamar a la lambda de benefits
async function getBenefitsData() {
  try {
    // Importar dinámicamente la función handler de benefits
    const { handler: benefitsHandler } = require('./benefits');
    
    // Crear un evento simulado para la lambda de benefits
    const benefitsEvent = {
      httpMethod: 'GET',
      queryStringParameters: null
    };
    
    // Llamar a la lambda de benefits
    const benefitsResponse = await benefitsHandler(benefitsEvent);
    
    if (benefitsResponse.statusCode === 200) {
      return JSON.parse(benefitsResponse.body);
    } else {
      throw new Error('Failed to get benefits data');
    }
  } catch (error) {
    console.error('Error getting benefits data:', error);
    throw error;
  }
}

// Función para enviar datos a N8N
async function sendToN8N(query, benefitsData) {
  const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
  
  if (!N8N_WEBHOOK_URL) {
    throw new Error('N8N_WEBHOOK_URL environment variable not set');
  }

  try {
    const fetch = require('node-fetch');
    
    const payload = {
      query: query,
      benefits: benefitsData,
      timestamp: new Date().toISOString()
    };

    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!n8nResponse.ok) {
      throw new Error(`N8N request failed with status: ${n8nResponse.status}`);
    }

    const result = await n8nResponse.json();
    return result;
  } catch (error) {
    console.error('Error sending to N8N:', error);
    throw error;
  }
}

// Handler principal de la lambda de search
exports.handler = async (event) => {
  try {
    const { httpMethod, body } = event;

    // Solo permitir POST /search
    if (httpMethod !== 'POST') {
      return response.error('Method not allowed', 405);
    }

    if (!body) {
      return response.error('Request body is required', 400);
    }

    let requestData;
    try {
      requestData = JSON.parse(body);
    } catch (error) {
      return response.error('Invalid JSON in request body', 400);
    }

    const { query } = requestData;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return response.error('Query parameter is required and must be a non-empty string', 400);
    }

    console.log(`Processing search query: "${query}"`);

    // 1. Primero obtener todos los datos de benefits
    const benefitsData = await getBenefitsData();
    console.log(`Retrieved ${benefitsData.length} benefits for processing`);

    // 2. Enviar query y datos de benefits a N8N para procesamiento con AI
    const aiResponse = await sendToN8N(query, benefitsData);
    console.log('AI processing completed successfully');

    return response.success({
      query: query,
      totalBenefits: benefitsData.length,
      aiResponse: aiResponse
    });

  } catch (error) {
    console.error('Search error:', error);
    return response.error('Internal server error', 500);
  }
}; 