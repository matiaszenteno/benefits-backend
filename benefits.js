const { Pool } = require('pg');
const { query, getPool, checkConnection } = require('./db');
const response = require('./response');

// Función para obtener datos de Google Sheets
async function getBenefitsFromGoogleSheets() {
  const GOOGLE_SHEETS_URL = process.env.GOOGLE_SHEETS_URL;
  
  if (!GOOGLE_SHEETS_URL) {
    throw new Error('GOOGLE_SHEETS_URL environment variable not set');
  }

  try {
    const fetch = require('node-fetch');
    const response = await fetch(GOOGLE_SHEETS_URL);
    
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
        await checkConnection();
        benefits = await getBenefitsFromDatabase(categoryFilter);
        console.log(`Retrieved ${benefits.length} benefits from database`);
      }
    } else {
      // Usar base de datos si no hay URL de Google Sheets configurada
      await checkConnection();
      benefits = await getBenefitsFromDatabase(categoryFilter);
      console.log(`Retrieved ${benefits.length} benefits from database`);
    }

    return response.success(benefits);

  } catch (error) {
    console.error('Error:', error);
    return response.error('Internal server error');
  }
}; 