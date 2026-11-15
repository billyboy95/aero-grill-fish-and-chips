-- Phase 1: additive changes limited to the existing restaurant demo module.
-- No organizations, memberships, auth users or other client tables are changed.
create table public.restaurant_profiles (
 tenant_id text primary key references public.restaurant_tenants(id),
 content_approved boolean not null default false,
 address text not null default '', phone text not null default '',
 opening_hours text not null default '', collection_instructions text not null default '',
 delivery_enabled boolean not null default false,
 delivery_zones jsonb not null default '[]'::jsonb check(jsonb_typeof(delivery_zones)='array'),
 logo_url text not null default ''
);
alter table public.restaurant_profiles enable row level security;
create policy restaurant_profiles_read on public.restaurant_profiles for select to anon, authenticated using(true);
revoke all on public.restaurant_profiles from anon,authenticated;
grant select on public.restaurant_profiles to anon,authenticated;
insert into public.restaurant_profiles(tenant_id) values('aero-grill');
alter table public.restaurant_orders
 add column request_id uuid,
 add column request_hash text,
 add column delivery_address text,
 add column delivery_postcode text,
 add column delivery_zone_id text,
 add column delivery_fee_cents integer not null default 0 check(delivery_fee_cents>=0),
 add column updated_at timestamptz not null default now();
create unique index restaurant_order_request_unique on public.restaurant_orders(tenant_id,request_id);
create or replace function public.restaurant_place_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_token uuid; v_existing public.restaurant_orders%rowtype; v_profile public.restaurant_profiles%rowtype; v_fee integer := 0; v_zone jsonb; v_request uuid; v_hash text; v_item jsonb; v_db public.restaurant_menu_items%rowtype;
  v_price bigint := 0; v_n integer := 0; v_qty integer; v_tenant text := coalesce(p->>'tenant_id','');
  v_phone text := regexp_replace(coalesce(p->>'phone',''),'[^0-9+]','','g');
  v_source text := coalesce(p->>'source','website'); v_payment text := coalesce(p->>'payment_method','cash');
begin
  if jsonb_typeof(p) is distinct from 'object' then raise exception 'Invalid order'; end if;
  if coalesce(p->>'request_id','') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'Request ID required'; end if;
  v_request := (p->>'request_id')::uuid;
  v_hash := encode(extensions.digest(p::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended(v_request::text,0));
  select * into v_existing from public.restaurant_orders where tenant_id=v_tenant and request_id=v_request;
  if found then
    if v_existing.request_hash is distinct from v_hash then raise exception 'Request ID already used with different order'; end if;
    return jsonb_build_object('id',v_existing.id,'token',v_existing.token,'amount_cents',v_existing.amount_cents,'status',v_existing.status,'payment_status',v_existing.payment_status);
  end if;
  select * into v_profile from public.restaurant_profiles where tenant_id=v_tenant for share;
  if not found then raise exception 'Restaurant configuration unavailable'; end if;
  if exists(select 1 from public.restaurant_tenants where id=v_tenant and business_mode='live') then raise exception 'Live ordering is not enabled in this release'; end if;
  if v_tenant <> 'aero-grill' or not exists(select 1 from public.restaurant_tenants where id=v_tenant) then raise exception 'Restaurant not found'; end if;
  if length(btrim(coalesce(p->>'customer_name',''))) not between 2 and 80 then raise exception 'Name is required'; end if;
  if v_phone !~ '^([+]27|0)[0-9]{9}$' then raise exception 'Phone is required'; end if;
  if coalesce(p->>'fulfilment','') not in ('Collection','Dine-in','Delivery') then raise exception 'Invalid fulfilment'; end if;
  if v_source not in ('website','whatsapp','staff') or v_payment not in ('cash','online') then raise exception 'Invalid source or payment'; end if;
  if length(coalesce(p->>'notes',''))>400 then raise exception 'Notes too long'; end if;
  if jsonb_typeof(p->'items') is distinct from 'array' or jsonb_array_length(p->'items') < 1 or jsonb_array_length(p->'items')>20 then raise exception 'Invalid items'; end if;
  if p->>'fulfilment'='Delivery' then
    if not v_profile.delivery_enabled or not v_profile.content_approved then raise exception 'Delivery is not activated'; end if;
    if length(btrim(coalesce(p#>>'{delivery,address}',''))) not between 5 and 250 or
       coalesce(p#>>'{delivery,postcode}','') !~ '^[0-9]{4}$' then raise exception 'Valid delivery address and postcode required'; end if;
    select z into v_zone from jsonb_array_elements(v_profile.delivery_zones) z
      where z->>'id'=p#>>'{delivery,zone_id}' and z->'postcodes' ? (p#>>'{delivery,postcode}');
    if not found then raise exception 'Address outside delivery area'; end if;
    v_fee := (v_zone->>'fee_cents')::integer;
    if v_fee is null or v_fee not between 0 and 100000 then raise exception 'Invalid delivery fee'; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(v_tenant||v_phone,0));
  -- Basic anti-spam safeguard for a repeated number, including a hard cap.
  if (select count(*) from public.restaurant_orders where tenant_id=v_tenant and phone=v_phone and created_at > now()-interval '5 minutes')>=5 then raise exception 'Too many recent orders'; end if;
  for v_item in select * from jsonb_array_elements(p->'items') loop
    if jsonb_typeof(v_item->'qty') is distinct from 'number' or (v_item->>'qty') !~ '^[0-9]+$' then raise exception 'Invalid quantity'; end if;
    v_qty := (v_item->>'qty')::integer;
    if v_qty not between 1 and 30 then raise exception 'Invalid quantity'; end if;
    select * into v_db from public.restaurant_menu_items where id=(v_item->>'id')::integer and tenant_id=v_tenant and available for share;
    if not found then raise exception 'Menu item unavailable'; end if;
    v_n := v_n + v_qty; v_price := v_price + v_qty*v_db.price_cents;
  end loop;
  v_price := v_price + v_fee;
  if v_n > 60 or v_price > 1000000 then raise exception 'Order exceeds limit'; end if;
  insert into public.restaurant_orders(tenant_id,customer_name,phone,notes,fulfilment,source,amount_cents,payment_method,payment_status,request_id,request_hash,delivery_address,delivery_postcode,delivery_zone_id,delivery_fee_cents)
   values(v_tenant,left(btrim(p->>'customer_name'),80),v_phone,coalesce(p->>'notes',''),p->>'fulfilment',v_source,v_price::integer,v_payment,case when v_payment='online' then 'pending' else 'unpaid' end,v_request,v_hash,case when p->>'fulfilment'='Delivery' then p#>>'{delivery,address}' end,case when p->>'fulfilment'='Delivery' then p#>>'{delivery,postcode}' end,case when p->>'fulfilment'='Delivery' then p#>>'{delivery,zone_id}' end,v_fee)
   returning id, token into v_id,v_token;
  for v_item in select * from jsonb_array_elements(p->'items') loop
    select * into v_db from public.restaurant_menu_items where id=(v_item->>'id')::integer and tenant_id=v_tenant;
    insert into public.restaurant_order_items(order_id,menu_item_id,item_name,price_cents,qty)
      values(v_id,v_db.id,v_db.name,v_db.price_cents,(v_item->>'qty')::integer);
  end loop;
  return jsonb_build_object('id',v_id,'token',v_token,'amount_cents',v_price,'status','New','payment_status',case when v_payment='online' then 'pending' else 'unpaid' end);
end; $$;
revoke all on function public.restaurant_place_order(jsonb) from public;
grant execute on function public.restaurant_place_order(jsonb) to anon,authenticated;

create or replace function public.restaurant_track_order(p_id uuid,p_token uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.restaurant_orders%rowtype;
begin
 select * into v from public.restaurant_orders where id=p_id and token=p_token;
 if not found then return null; end if;
 return jsonb_build_object('id',v.id,'status',v.status,'payment_status',v.payment_status,'amount_cents',v.amount_cents,'created_at',v.created_at,'updated_at',v.updated_at,'delivery_fee_cents',v.delivery_fee_cents);
end; $$;
revoke all on function public.restaurant_track_order(uuid,uuid) from public;
grant execute on function public.restaurant_track_order(uuid,uuid) to anon,authenticated;

create or replace function public.restaurant_admin_status(p_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_tenant text; v_status text; v_payment text; v_method text;
begin
 select tenant_id,status,payment_status,payment_method into v_tenant,v_status,v_payment,v_method from public.restaurant_orders where id=p_id for update;
 if not found or not public.restaurant_is_owner(v_tenant) then raise exception 'Not authorized'; end if;
 if p_status=v_status then return true; end if;
 if p_status is null or not ((v_status='New' and p_status in ('Preparing','Cancelled')) or (v_status='Preparing' and p_status in ('Ready','Cancelled')) or (v_status='Ready' and p_status='Completed')) then raise exception 'Invalid status transition'; end if;
 if v_method='online' and v_payment<>'paid' and p_status<>'Cancelled' then raise exception 'Verified payment required'; end if;
 update public.restaurant_orders set status=p_status,updated_at=now() where id=p_id;
 return true;
end; $$;
revoke all on function public.restaurant_admin_status(uuid,text) from public;
grant execute on function public.restaurant_admin_status(uuid,text) to authenticated;

