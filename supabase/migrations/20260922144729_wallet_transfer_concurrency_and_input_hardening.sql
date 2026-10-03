create or replace function public.wallet_transfer(
  p_to_user_id uuid,
  p_amount numeric,
  p_currency text default 'USD',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_from public.wallet_accounts;
  v_to public.wallet_accounts;
  v_key text;
  v_currency text;
  v_amount numeric;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  v_currency := upper(trim(coalesce(p_currency, 'USD')));
  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'INVALID_CURRENCY';
  end if;

  if p_to_user_id is null or p_to_user_id = auth.uid() then
    raise exception 'INVALID_RECIPIENT';
  end if;

  v_amount := round(p_amount, 8);
  if v_amount <= 0 or v_amount > 1000000000000 then
    raise exception 'INVALID_AMOUNT';
  end if;

  v_key := nullif(trim(p_idempotency_key), '');
  if v_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;
  if length(v_key) < 16 or length(v_key) > 200 then
    raise exception 'INVALID_IDEMPOTENCY_KEY';
  end if;

  -- Idempotency is checked before any balance mutation.
  if exists (
    select 1 from public.wallet_ledger
    where idempotency_key = v_key
  ) then
    return jsonb_build_object('status', 'idempotent');
  end if;

  insert into public.wallet_accounts(user_id, currency)
  values (auth.uid(), v_currency)
  on conflict (user_id) do nothing;

  insert into public.wallet_accounts(user_id, currency)
  values (p_to_user_id, v_currency)
  on conflict (user_id) do nothing;

  -- Always lock wallets in deterministic UUID order to reduce transfer/transfer
  -- deadlocks when two users transfer to each other concurrently.
  if auth.uid()::text < p_to_user_id::text then
    select * into v_from from public.wallet_accounts where user_id = auth.uid() for update;
    select * into v_to from public.wallet_accounts where user_id = p_to_user_id for update;
  else
    select * into v_to from public.wallet_accounts where user_id = p_to_user_id for update;
    select * into v_from from public.wallet_accounts where user_id = auth.uid() for update;
  end if;

  if v_from.currency <> v_currency or v_to.currency <> v_currency then
    raise exception 'CURRENCY_MISMATCH';
  end if;

  if v_from.status <> 'active' or v_to.status <> 'active' then
    raise exception 'WALLET_NOT_ACTIVE';
  end if;

  if v_from.available_balance < v_amount then
    raise exception 'INSUFFICIENT_FUNDS';
  end if;

  update public.wallet_accounts
  set available_balance = available_balance - v_amount, updated_at = now()
  where id = v_from.id;

  update public.wallet_accounts
  set available_balance = available_balance + v_amount, updated_at = now()
  where id = v_to.id;

  insert into public.wallet_ledger(
    wallet_id, direction, amount, currency, entry_type,
    reference_type, reference_id, idempotency_key, metadata
  )
  values (
    v_from.id, 'debit', v_amount, v_currency, 'transfer',
    'user', p_to_user_id, v_key,
    jsonb_build_object('to_user_id', p_to_user_id)
  );

  insert into public.wallet_ledger(
    wallet_id, direction, amount, currency, entry_type,
    reference_type, reference_id, idempotency_key, metadata
  )
  values (
    v_to.id, 'credit', v_amount, v_currency, 'transfer',
    'user', auth.uid(), v_key || ':credit',
    jsonb_build_object('from_user_id', auth.uid())
  );

  return jsonb_build_object(
    'status', 'succeeded',
    'amount', v_amount,
    'currency', v_currency
  );
end
$function$;

revoke execute on function public.wallet_transfer(uuid,numeric,text,text) from public, anon;
grant execute on function public.wallet_transfer(uuid,numeric,text,text) to authenticated;
