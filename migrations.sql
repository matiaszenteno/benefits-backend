DROP TABLE IF EXISTS benefits;

CREATE TABLE IF NOT EXISTS benefits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(100) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar datos de ejemplo
INSERT INTO benefits (name, description, category, image_url) VALUES
    ('Seguro Médico', 'Cobertura médica completa para el empleado y su familia', 'Salud y Estética', 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500'),
    ('Vale de Despensa', 'Vale mensual para gastos de despensa', 'Tiendas y Servicios', 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=500'),
    ('Gimnasio', 'Membresía anual en gimnasio de la ciudad', 'Gimnasios', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500'),
    ('Día de Cumpleaños', 'Día libre en tu cumpleaños', 'Recreación y Entretención', 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=500'),
    ('Home Office', 'Flexibilidad para trabajar desde casa', 'Recreación y Entretención', 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=500'),
    ('Descuento en Restaurantes', '15% de descuento en restaurantes asociados', 'Gastronomía', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500'),
    ('Hotel en la Playa', 'Fin de semana gratis en hotel de playa', 'Viajes, Hoteles y Trasporte', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500'),
    ('Curso de Inglés', 'Acceso a plataforma de aprendizaje de inglés', 'Cursos', 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=500')
ON CONFLICT (id) DO NOTHING;

-- Agregar nuevos campos si no existen
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefits' AND column_name = 'category') THEN
        ALTER TABLE benefits ADD COLUMN category VARCHAR(100);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'benefits' AND column_name = 'image_url') THEN
        ALTER TABLE benefits ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Actualizar registros existentes con categoría por defecto
UPDATE benefits 
SET category = 'Tiendas y Servicios' 
WHERE category IS NULL;