-- Añadir columna de categoría a planes_preventivos
ALTER TABLE public.planes_preventivos 
ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'general'
CHECK (categoria IN ('mecanico', 'electrico', 'lubricacion', 'limpieza', 'general', 'otro'));

-- Añadir columna de categoría a anomalias (mantenimiento correctivo)
ALTER TABLE public.anomalias 
ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'general'
CHECK (categoria IN ('mecanico', 'electrico', 'lubricacion', 'limpieza', 'general', 'otro'));
