BEGIN;

CREATE TABLE IF NOT EXISTS public.business_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  default_store_id uuid NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  display_name text NOT NULL DEFAULT 'Mi empresa',
  slug text,
  description text NOT NULL DEFAULT '',
  logo_url text,
  banner_url text,
  website_url text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_workspaces_slug_chk CHECK (slug IS NULL OR slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE UNIQUE INDEX IF NOT EXISTS business_workspaces_slug_uq ON public.business_workspaces(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS business_workspaces_owner_idx ON public.business_workspaces(owner_id);

CREATE TABLE IF NOT EXISTS public.business_catalogs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id uuid NULL REFERENCES public.stores(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT 'b2c',
  visibility text NOT NULL DEFAULT 'private',
  status text NOT NULL DEFAULT 'draft',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT business_catalogs_audience_chk CHECK (audience IN ('b2c','b2b','both')),
  CONSTRAINT business_catalogs_visibility_chk CHECK (visibility IN ('private','profile','marketplace','b2b','public')),
  CONSTRAINT business_catalogs_status_chk CHECK (status IN ('draft','published','archived')),
  CONSTRAINT business_catalogs_name_chk CHECK (char_length(trim(name)) BETWEEN 2 AND 200)
);

CREATE INDEX IF NOT EXISTS business_catalogs_owner_idx ON public.business_catalogs(owner_id);
CREATE INDEX IF NOT EXISTS business_catalogs_status_visibility_idx ON public.business_catalogs(status, visibility);

CREATE TABLE IF NOT EXISTS public.business_catalog_items (
  catalog_id uuid NOT NULL REFERENCES public.business_catalogs(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (catalog_id, product_id)
);

CREATE INDEX IF NOT EXISTS business_catalog_items_product_idx ON public.business_catalog_items(product_id);
CREATE INDEX IF NOT EXISTS business_catalog_items_owner_idx ON public.business_catalog_items(owner_id);

CREATE TABLE IF NOT EXISTS public.product_publication_controls (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  catalog_visible boolean NOT NULL DEFAULT false,
  marketplace_visible boolean NOT NULL DEFAULT false,
  b2b_visible boolean NOT NULL DEFAULT false,
  feed_visible boolean NOT NULL DEFAULT false,
  story_visible boolean NOT NULL DEFAULT false,
  sale_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_publication_controls_owner_idx ON public.product_publication_controls(owner_id);
CREATE INDEX IF NOT EXISTS product_publication_controls_public_idx ON public.product_publication_controls(marketplace_visible) WHERE marketplace_visible = true;

ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.business_catalogs(id) ON DELETE SET NULL;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.business_catalogs(id) ON DELETE SET NULL;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS product_id uuid REFERENCES public.products(id) ON DELETE SET NULL;
ALTER TABLE public.advertisements ADD COLUMN IF NOT EXISTS catalog_id uuid REFERENCES public.business_catalogs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS feed_posts_product_idx ON public.feed_posts(product_id);
CREATE INDEX IF NOT EXISTS feed_posts_catalog_idx ON public.feed_posts(catalog_id);
CREATE INDEX IF NOT EXISTS stories_product_idx ON public.stories(product_id);
CREATE INDEX IF NOT EXISTS stories_catalog_idx ON public.stories(catalog_id);
CREATE INDEX IF NOT EXISTS advertisements_product_idx ON public.advertisements(product_id);
CREATE INDEX IF NOT EXISTS advertisements_catalog_idx ON public.advertisements(catalog_id);

DROP TRIGGER IF EXISTS trg_business_workspaces_updated_at ON public.business_workspaces;
CREATE TRIGGER trg_business_workspaces_updated_at BEFORE UPDATE ON public.business_workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_business_catalogs_updated_at ON public.business_catalogs;
CREATE TRIGGER trg_business_catalogs_updated_at BEFORE UPDATE ON public.business_catalogs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_publication_controls_updated_at ON public.product_publication_controls;
CREATE TRIGGER trg_product_publication_controls_updated_at BEFORE UPDATE ON public.product_publication_controls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.business_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_publication_controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_workspaces_owner_select ON public.business_workspaces;
DROP POLICY IF EXISTS business_workspaces_owner_insert ON public.business_workspaces;
DROP POLICY IF EXISTS business_workspaces_owner_update ON public.business_workspaces;
DROP POLICY IF EXISTS business_workspaces_owner_delete ON public.business_workspaces;
CREATE POLICY business_workspaces_owner_select ON public.business_workspaces FOR SELECT USING (auth.uid() = owner_id OR is_public = true);
CREATE POLICY business_workspaces_owner_insert ON public.business_workspaces FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY business_workspaces_owner_update ON public.business_workspaces FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY business_workspaces_owner_delete ON public.business_workspaces FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS business_catalogs_owner_select ON public.business_catalogs;
DROP POLICY IF EXISTS business_catalogs_owner_insert ON public.business_catalogs;
DROP POLICY IF EXISTS business_catalogs_owner_update ON public.business_catalogs;
DROP POLICY IF EXISTS business_catalogs_owner_delete ON public.business_catalogs;
CREATE POLICY business_catalogs_owner_select ON public.business_catalogs FOR SELECT USING (auth.uid() = owner_id OR (status = 'published' AND visibility IN ('marketplace','public')));
CREATE POLICY business_catalogs_owner_insert ON public.business_catalogs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY business_catalogs_owner_update ON public.business_catalogs FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY business_catalogs_owner_delete ON public.business_catalogs FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS business_catalog_items_owner_select ON public.business_catalog_items;
DROP POLICY IF EXISTS business_catalog_items_owner_insert ON public.business_catalog_items;
DROP POLICY IF EXISTS business_catalog_items_owner_update ON public.business_catalog_items;
DROP POLICY IF EXISTS business_catalog_items_owner_delete ON public.business_catalog_items;
CREATE POLICY business_catalog_items_owner_select ON public.business_catalog_items FOR SELECT USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM public.business_catalogs c WHERE c.id = catalog_id AND c.status = 'published' AND c.visibility IN ('marketplace','public')));
CREATE POLICY business_catalog_items_owner_insert ON public.business_catalog_items FOR INSERT WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.vendor_id = auth.uid()));
CREATE POLICY business_catalog_items_owner_update ON public.business_catalog_items FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY business_catalog_items_owner_delete ON public.business_catalog_items FOR DELETE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS product_publication_controls_owner_select ON public.product_publication_controls;
DROP POLICY IF EXISTS product_publication_controls_owner_insert ON public.product_publication_controls;
DROP POLICY IF EXISTS product_publication_controls_owner_update ON public.product_publication_controls;
DROP POLICY IF EXISTS product_publication_controls_owner_delete ON public.product_publication_controls;
CREATE POLICY product_publication_controls_owner_select ON public.product_publication_controls FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY product_publication_controls_owner_insert ON public.product_publication_controls FOR INSERT WITH CHECK (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.vendor_id = auth.uid()));
CREATE POLICY product_publication_controls_owner_update ON public.product_publication_controls FOR UPDATE USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY product_publication_controls_owner_delete ON public.product_publication_controls FOR DELETE USING (auth.uid() = owner_id);

INSERT INTO public.product_publication_controls (product_id, owner_id, catalog_visible, marketplace_visible, b2b_visible, feed_visible, story_visible, sale_enabled)
SELECT p.id, s.vendor_id, false, p.is_active, false, false, false, p.is_active
FROM public.products p
JOIN public.stores s ON s.id = p.store_id
ON CONFLICT (product_id) DO NOTHING;

INSERT INTO public.business_workspaces (owner_id, default_store_id, display_name)
SELECT s.vendor_id, s.id, s.store_name
FROM public.stores s
ON CONFLICT (owner_id) DO UPDATE SET default_store_id = COALESCE(public.business_workspaces.default_store_id, EXCLUDED.default_store_id), display_name = CASE WHEN public.business_workspaces.display_name = 'Mi empresa' THEN EXCLUDED.display_name ELSE public.business_workspaces.display_name END;

COMMIT;
