# Benefits Backend

Backend para la aplicación de beneficios con soporte para Google Sheets y base de datos PostgreSQL.

## Características

- **Fuente de datos flexible**: Puede consumir datos desde Google Sheets o base de datos PostgreSQL
- **Fallback automático**: Si Google Sheets falla, automáticamente usa la base de datos
- **API REST**: Endpoint GET /benefits con filtros opcionales
- **Serverless**: Desplegado como AWS Lambda

## Configuración

### Variables de Entorno

Copia `env.example` y configura las variables necesarias:

```bash
cp env.example .env
```

#### Base de Datos (opcional si usas Google Sheets)
```
DB_HOST=your-database-host
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-user
DB_PASSWORD=your-database-password
```

#### Google Sheets (opcional)
```
GOOGLE_SHEETS_URL=https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
```

## Uso de Google Sheets

### Configuración del Google Sheet

1. Crea un Google Sheet con las siguientes columnas:
   - `id`: ID único del beneficio
   - `name`: Nombre del beneficio
   - `description`: Descripción del beneficio
   - `category`: Categoría del beneficio
   - `bank`: Banco (ej: "bancodechile")
   - `provider`: Proveedor (ej: "Banco de Chile")
   - `is_active`: Estado activo (1 o 0)
   - `created_at`: Fecha de creación
   - `updated_at`: Fecha de actualización

2. Haz el Google Sheet público:
   - Archivo → Compartir → Cambiar a "Cualquier persona con el enlace"
   - Permisos: "Lector"

3. Obtén la URL de exportación CSV:
   ```
   https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
   ```

### Comportamiento de la Lambda

1. **Si `GOOGLE_SHEETS_URL` está configurada**:
   - Intenta obtener datos del Google Sheet
   - Si falla, usa la base de datos como fallback

2. **Si `GOOGLE_SHEETS_URL` no está configurada**:
   - Usa directamente la base de datos

## API Endpoints

### GET /benefits

Obtiene la lista de beneficios.

**Parámetros de consulta opcionales:**
- `category`: Filtra por categoría

**Ejemplos:**
```bash
# Obtener todos los beneficios
GET /benefits

# Filtrar por categoría
GET /benefits?category=Salud
```

**Respuesta:**
```json
[
  {
    "id": "1",
    "name": "Seguro Médico",
    "description": "Cobertura médica completa",
    "category": "Salud",
    "bank": "bancodechile",
    "provider": "Banco de Chile",
    "is_active": 1,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z"
  }
]
```

## Desarrollo Local

### Instalación
```bash
npm install
```

### Ejecutar localmente
```bash
npm start
```

El servidor estará disponible en `http://localhost:4000`

## Despliegue

### Configurar AWS CLI
```bash
aws configure
```

### Desplegar
```bash
npm run deploy
```

### Configurar variables de entorno en AWS

Después del despliegue, configura las variables de entorno en la consola de AWS Lambda:

1. Ve a AWS Lambda Console
2. Selecciona la función `benefits-backend-prod-benefits`
3. Ve a Configuration → Environment variables
4. Agrega las variables necesarias

## Estructura del Proyecto

```
├── benefits.js          # Handler principal de la lambda
├── db.js               # Configuración de base de datos
├── response.js         # Utilidades para respuestas HTTP
├── migrations.sql      # Scripts de migración de BD
├── serverless.yml      # Configuración de Serverless Framework
├── package.json        # Dependencias y scripts
└── env.example         # Ejemplo de variables de entorno
```

## Dependencias

- `pg`: Cliente PostgreSQL
- `node-fetch`: Cliente HTTP para Google Sheets
- `serverless`: Framework de despliegue

## Notas Importantes

- El Google Sheet debe ser público para que la lambda pueda acceder
- Los datos del Google Sheet se parsean como CSV simple
- El fallback a base de datos es automático en caso de error
- Las columnas del Google Sheet deben coincidir con la estructura de la base de datos 