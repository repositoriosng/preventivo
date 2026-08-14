-- Planes recurrentes para mantenimiento preventivo.
CREATE TABLE IF NOT EXISTS public.planes_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id uuid NOT NULL REFERENCES public.maquinas(id) ON DELETE RESTRICT,
  titulo text NOT NULL CHECK (char_length(trim(titulo)) >= 3),
  descripcion text,
  frecuencia text NOT NULL CHECK (frecuencia IN ('diaria', 'semanal', 'mensual')),
  proxima_fecha date NOT NULL,
  activo boolean NOT NULL DEFAULT true,
  creado_por uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE RESTRICT,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mantenimientos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.planes_preventivos(id) ON DELETE RESTRICT,
  maquina_id uuid NOT NULL REFERENCES public.maquinas(id) ON DELETE RESTRICT,
  fecha_programada date NOT NULL,
  estado text NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado', 'completado', 'omitido')),
  realizado_por uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  realizado_en timestamptz,
  observaciones text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, fecha_programada)
);

CREATE INDEX IF NOT EXISTS idx_planes_preventivos_proxima_fecha ON public.planes_preventivos (proxima_fecha) WHERE activo;
CREATE INDEX IF NOT EXISTS idx_mantenimientos_preventivos_fecha_estado ON public.mantenimientos_preventivos (fecha_programada, estado);

ALTER TABLE public.planes_preventivos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mantenimientos_preventivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "planes preventivos: supervisor administra" ON public.planes_preventivos;
CREATE POLICY "planes preventivos: supervisor administra" ON public.planes_preventivos
FOR ALL USING (mi_rol() IN ('admin', 'supervisor')) WITH CHECK (mi_rol() IN ('admin', 'supervisor'));

DROP POLICY IF EXISTS "mantenimientos preventivos: supervisor administra" ON public.mantenimientos_preventivos;
CREATE POLICY "mantenimientos preventivos: supervisor administra" ON public.mantenimientos_preventivos
FOR ALL USING (mi_rol() IN ('admin', 'supervisor')) WITH CHECK (mi_rol() IN ('admin', 'supervisor'));
