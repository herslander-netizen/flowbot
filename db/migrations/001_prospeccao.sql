-- FlowBot / Supabase PostgreSQL: instalação INICIAL, não aplicada automaticamente.
-- Executar somente no projeto dedicado ao FlowBot; jamais nos projetos do Flow/Alvo OS.
-- Autorização: auth.uid() + membership em tabelas do próprio FlowBot.
-- NENHUM envio, scraper, automação outbound ou chave de serviço no cliente.
BEGIN;

CREATE TABLE IF NOT EXISTS public.flowbot_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Membership criada apenas pelo provisionamento administrativo/confiável.
CREATE TABLE IF NOT EXISTS public.flowbot_workspace_members (
  workspace_id uuid NOT NULL REFERENCES public.flowbot_workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);
CREATE INDEX IF NOT EXISTS flowbot_members_user_idx
  ON public.flowbot_workspace_members (user_id, workspace_id);

CREATE TABLE IF NOT EXISTS public.flowbot_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.flowbot_workspaces(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 140),
  city text CHECK (char_length(city) <= 100),
  uf text CHECK (uf IS NULL OR uf ~ '^[A-Z]{2}$'),
  category text CHECK (char_length(category) <= 80),
  cnpj text CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  website text CHECK (char_length(website) <= 300),
  latitude numeric(9,6) CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) CHECK (longitude BETWEEN -180 AND 180),
  stage text NOT NULL DEFAULT 'pesquisado'
    CHECK (stage IN ('pesquisado','lead','qualificado','proposta','negociacao','ganho','perdido')),
  suppressed boolean NOT NULL DEFAULT false,
  source_type text NOT NULL DEFAULT 'manual'
    CHECK (source_type IN ('manual','csv')),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id)
);
CREATE UNIQUE INDEX IF NOT EXISTS flowbot_prospects_cnpj_uniq
  ON public.flowbot_prospects (workspace_id, cnpj)
  WHERE cnpj IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS flowbot_prospects_name_city_uniq
  ON public.flowbot_prospects (workspace_id, lower(trim(name)),
       lower(trim(coalesce(city,''))), lower(trim(coalesce(uf,''))))
  WHERE cnpj IS NULL;
CREATE INDEX IF NOT EXISTS flowbot_prospects_workspace_stage_idx
  ON public.flowbot_prospects (workspace_id, stage, created_at DESC);

CREATE TABLE IF NOT EXISTS public.flowbot_prospect_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  fact text NOT NULL CHECK (char_length(trim(fact)) BETWEEN 2 AND 300),
  source_url text NOT NULL CHECK (char_length(source_url) <= 500),
  collected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, prospect_id)
    REFERENCES public.flowbot_prospects (workspace_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS flowbot_prospect_evidence_lookup_idx
  ON public.flowbot_prospect_evidence (workspace_id, prospect_id);

CREATE TABLE IF NOT EXISTS public.flowbot_prospect_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','reviewed','cancelled')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, id),
  FOREIGN KEY (workspace_id, prospect_id)
    REFERENCES public.flowbot_prospects (workspace_id, id) ON DELETE CASCADE
);

-- Informações de permissão só são consultáveis por membros.
-- Escrita reservada a operações administrativas verificadas, sem endpoint de envio.
CREATE TABLE IF NOT EXISTS public.flowbot_contact_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL,
  prospect_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('whatsapp','email','telefone')),
  basis text NOT NULL CHECK (basis IN ('opt_in','legitimate_interest_reviewed')),
  proof_reference text NOT NULL,
  granted_at timestamptz,
  revoked_at timestamptz,
  FOREIGN KEY (workspace_id, prospect_id)
    REFERENCES public.flowbot_prospects (workspace_id, id) ON DELETE CASCADE
);

-- Não expor escrita de auditoria ao navegador.
CREATE TABLE IF NOT EXISTS public.flowbot_prospect_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  workspace_id uuid NOT NULL,
  prospect_id uuid,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (workspace_id, prospect_id)
    REFERENCES public.flowbot_prospects (workspace_id, id)
);
CREATE INDEX IF NOT EXISTS flowbot_events_workspace_time_idx
  ON public.flowbot_prospect_events (workspace_id, occurred_at DESC);

-- RLS ativada inclusive para quem possui privilégios de OWNER na tabela.
ALTER TABLE public.flowbot_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_workspace_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospect_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospect_evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospect_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospect_drafts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_contact_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_contact_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospect_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flowbot_prospect_events FORCE ROW LEVEL SECURITY;

-- RLS da tabela de membros NÃO consulta a si mesma (evita recursão).
CREATE POLICY flowbot_member_read_self ON public.flowbot_workspace_members
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY flowbot_workspace_read ON public.flowbot_workspaces
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_workspaces.id AND m.user_id = (SELECT auth.uid())
  ));

CREATE POLICY flowbot_prospect_read ON public.flowbot_prospects
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospects.workspace_id AND m.user_id = (SELECT auth.uid())
  ));
CREATE POLICY flowbot_prospect_insert ON public.flowbot_prospects
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospects.workspace_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor')
  ));
CREATE POLICY flowbot_prospect_update ON public.flowbot_prospects
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospects.workspace_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospects.workspace_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor')
  ));

CREATE POLICY flowbot_evidence_read ON public.flowbot_prospect_evidence
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospect_evidence.workspace_id AND m.user_id = (SELECT auth.uid())
  ));
CREATE POLICY flowbot_evidence_insert ON public.flowbot_prospect_evidence
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospect_evidence.workspace_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor')
  ));

CREATE POLICY flowbot_drafts_read ON public.flowbot_prospect_drafts
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospect_drafts.workspace_id AND m.user_id = (SELECT auth.uid())
  ));
CREATE POLICY flowbot_drafts_insert ON public.flowbot_prospect_drafts
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospect_drafts.workspace_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor')
  ));
CREATE POLICY flowbot_drafts_update ON public.flowbot_prospect_drafts
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospect_drafts.workspace_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospect_drafts.workspace_id AND m.user_id = (SELECT auth.uid())
      AND m.role IN ('owner','admin','editor')
  ));
CREATE POLICY flowbot_permissions_read ON public.flowbot_contact_permissions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_contact_permissions.workspace_id AND m.user_id = (SELECT auth.uid())
  ));
CREATE POLICY flowbot_events_read ON public.flowbot_prospect_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.flowbot_workspace_members m
    WHERE m.workspace_id = flowbot_prospect_events.workspace_id AND m.user_id = (SELECT auth.uid())
  ));

-- Permissões explícitas. Nenhum acesso anônimo nem criação de memberships via app.
REVOKE ALL ON public.flowbot_workspaces,
  public.flowbot_workspace_members, public.flowbot_prospects,
  public.flowbot_prospect_evidence, public.flowbot_prospect_drafts,
  public.flowbot_contact_permissions, public.flowbot_prospect_events
  FROM anon, authenticated;

GRANT SELECT ON public.flowbot_workspaces, public.flowbot_workspace_members,
  public.flowbot_prospects, public.flowbot_prospect_evidence,
  public.flowbot_prospect_drafts, public.flowbot_contact_permissions,
  public.flowbot_prospect_events TO authenticated;
GRANT INSERT ON public.flowbot_prospects,
  public.flowbot_prospect_evidence, public.flowbot_prospect_drafts TO authenticated;
GRANT UPDATE (name, city, uf, category, website, latitude, longitude,
  stage, suppressed, notes) ON public.flowbot_prospects TO authenticated;
GRANT UPDATE (body, status, reviewed_by, reviewed_at)
  ON public.flowbot_prospect_drafts TO authenticated;
-- Não liberar delete, modificar workspace_id nem inserir permissões pelo navegador.

COMMIT;
