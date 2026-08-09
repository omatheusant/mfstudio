-- ELEVO FIT — Fase 7: payments_with_status view
--
-- The single place "is this payment overdue?" is decided — see
-- docs/business-rules.md §"Inadimplência" ("Criar uma regra
-- centralizada... não duplicar essa lógica em diversos componentes
-- frontend"). Every read of payments for display goes through this view
-- instead of the bare table, so the app never has to re-derive
-- `effective_status` itself.
--
-- `security_invoker = true` is required (Postgres default is
-- security DEFINER-like behavior for views, running as the view's
-- owner) — without it, this view would silently bypass RLS on
-- `payments` for every caller. With it, RLS is evaluated as the actual
-- querying user, exactly as if they'd queried `payments` directly.

create or replace view public.payments_with_status
with (security_invoker = true) as
select
  p.*,
  case
    when p.status = 'PENDING' and p.due_date < current_date then 'OVERDUE'
    else p.status
  end as effective_status
from public.payments p;

comment on view public.payments_with_status is 'payments + a computed effective_status (adds OVERDUE for PENDING rows past due_date). Read from this view, not the bare table, for anything user-facing.';

grant select on public.payments_with_status to authenticated;
