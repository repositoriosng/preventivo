ALTER TABLE public.anomalias DROP CONSTRAINT IF EXISTS anomalias_asignado_a_fkey;
ALTER TABLE public.anomalias ADD CONSTRAINT anomalias_asignado_a_fkey FOREIGN KEY (asignado_a) REFERENCES public.usuarios(id) ON DELETE SET NULL;
