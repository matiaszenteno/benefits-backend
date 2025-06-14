const { Pool } = require('pg');
const { query, getPool, checkConnection } = require('./db');
const response = require('./response');

// Función para obtener datos de Google Sheets
async function getBenefitsFromGoogleSheets() {
  const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL;
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
  
  if (!GOOGLE_SHEETS_URL) {
    throw new Error('GOOGLE_SHEETS_URL environment variable not set');
  }

  try {
    const fetch = require('node-fetch');
    let response;
    
    // Si tenemos credenciales de Service Account, usar autenticación
    if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY) {
      console.log('Using Google Service Account authentication');
      
      // Crear JWT token para autenticación
      const jwt = require('jsonwebtoken');
      const now = Math.floor(Date.now() / 1000);
      
      const payload = {
        iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };
      
      // Procesar la clave privada correctamente
      let privateKey = GOOGLE_PRIVATE_KEY;
      
      // Remover comillas si existen
      if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
        privateKey = privateKey.slice(1, -1);
      }
      
      // Reemplazar \\n con saltos de línea reales
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // Asegurar que la clave tenga el formato correcto
      if (!privateKey.includes('-----BEGIN') || !privateKey.includes('-----END')) {
        throw new Error('Invalid private key format');
      }
      
      console.log('Private key format validated');
      
      const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      
      // Obtener access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token request failed: ${tokenResponse.status} - ${errorText}`);
      }
      
      const tokenData = await tokenResponse.json();
      
      // Hacer request con token de autorización
      response = await fetch(GOOGLE_SHEETS_URL, {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
    } else {
      console.log('Using public Google Sheets access');
      // Acceso público sin autenticación
      response = await fetch(GOOGLE_SHEETS_URL);
    }
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    
    // Parsear CSV simple (asumiendo que la primera línea son headers)
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const benefits = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const benefit = {};
      
      headers.forEach((header, index) => {
        benefit[header] = values[index] || '';
      });
      
      // Mapear campos si es necesario para mantener compatibilidad
      if (benefit.title && !benefit.name) {
        benefit.name = benefit.title;
      }
      if (!benefit.id) {
        benefit.id = i.toString();
      }
      
      benefits.push(benefit);
    }
    
    return benefits;
  } catch (error) {
    console.error('Error fetching from Google Sheets:', error);
    throw error;
  }
}

// Función única para consultas a la base de datos con manejo de conexiones
async function executeQuery(sql, params = []) {
  const pool = getPool();
  try {
    const result = await pool.query(sql, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Función para obtener beneficios de la base de datos
async function getBenefitsFromDatabase(categoryFilter = null) {
  let sqlQuery = 'SELECT * FROM benefits';
  const params = [];

  if (categoryFilter) {
    sqlQuery += ' WHERE category = $1';
    params.push(categoryFilter);
  }

  sqlQuery += ' ORDER BY id';
  
  const { rows } = await executeQuery(sqlQuery, params);
  return rows;
}

// Validación de entrada
const validateBenefit = (data) => {
  const errors = [];
  if (!data.name || typeof data.name !== 'string' || data.name.trim().length === 0) {
    errors.push('Name is required and must be a non-empty string');
  }
  if (data.description && typeof data.description !== 'string') {
    errors.push('Description must be a string');
  }
  return errors;
};

// Handler principal de Lambda
exports.handler = async (event) => {
  try {
    const { httpMethod, queryStringParameters } = event;

    // Solo permitir GET /benefits
    if (httpMethod !== 'GET') {
      return response.error('Method not allowed', 405);
    }

    const categoryFilter = queryStringParameters?.category || null;
    let benefits = [];

    // Intentar obtener datos de Google Sheets primero si está configurado
    if (process.env.GOOGLE_SHEETS_URL) {
      try {
        console.log('Fetching benefits from Google Sheets...');
        benefits = await getBenefitsFromGoogleSheets();
        
        // Aplicar filtro de categoría si se especifica
        if (categoryFilter) {
          benefits = benefits.filter(benefit => 
            benefit.category && benefit.category.toLowerCase() === categoryFilter.toLowerCase()
          );
        }
        
        console.log(`Retrieved ${benefits.length} benefits from Google Sheets`);
      } catch (error) {
        console.error('Failed to fetch from Google Sheets, falling back to database:', error);
        
        // Fallback a base de datos
        try {
          await checkConnection();
          benefits = await getBenefitsFromDatabase(categoryFilter);
          console.log(`Retrieved ${benefits.length} benefits from database`);
        } catch (dbError) {
          console.error('Database connection also failed:', dbError);
          throw new Error('Both Google Sheets and database are unavailable');
        }
      }
    } else {
      // Usar base de datos si no hay URL de Google Sheets configurada
      try {
        await checkConnection();
        benefits = await getBenefitsFromDatabase(categoryFilter);
        console.log(`Retrieved ${benefits.length} benefits from database`);
      } catch (dbError) {
        console.error('Database connection failed and no Google Sheets configured:', dbError);
        throw new Error('Database unavailable and no Google Sheets fallback configured');
      }
    }

    return response.success(benefits);

  } catch (error) {
    console.error('Error:', error);
    return response.error('Internal server error');
  }
}; 