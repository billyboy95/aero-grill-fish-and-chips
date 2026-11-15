-- Emergency function rollback only. Keeps added data columns and profiles intact.
create or replace function public.restaurant_place_order(p jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_token uuid; v_item jsonb; v_db public.restaurant_menu_items%rowtype;
  v_price bigint := 0; v_n integer := 0; v_qty integer; v_tenant text := coalesce(p->>'tenant_id','');
  v_phone text := btrim(coalesce(p->>'phone',''));
  v_source text := coalesce(p->>'source','website'); v_payment text := coalesce(p->>'payment_method','cash');
begin
  if v_tenant <> 'aero-grill' or not exists(select 1 from public.restaurant_tenants where id=v_tenant) then raise exception 'Restaurant not found'; end if;
  if length(btrim(coalesce(p->>'customer_name',''))) not between 2 and 80 then raise exception 'Name is required'; end if;
  if length(v_phone) not between 7 and 22 then raise exception 'Phone is required'; end if;
  if coalesce(p->>'fulfilment','') not in ('Collection','Dine-in','Delivery') then raise exception 'Invalid fulfilment'; end if;
  if v_source not in ('website','whatsapp','staff') or v_payment not in ('cash','online') then raise exception 'Invalid source or payment'; end if;
  if length(coalesce(p->>'notes',''))>400 then raise exception 'Notes too long'; end if;
  if jsonb_typeof(p->'items') != 'array' or jsonb_array_length(p->'items') < 1 or jsonb_array_length(p->'items')>20 then raise exception 'Invalid items'; end if;
  -- Basic anti-spam safeguard for a repeated number, including a hard cap.
  if (select count(*) from public.restaurant_orders where tenant_id=v_tenant and phone=v_phone and created_at > now()-interval '5 minutes')>=5 then raise exception 'Too many recent orders'; end if;
  for v_item in select * from jsonb_array_elements(p->'items') loop
    v_qty := (v_item->>'qty')::integer;
    if v_qty not between 1 and 30 then raise exception 'Invalid quantity'; end if;
    select * into v_db from public.restaurant_menu_items where id=(v_item->>'id')::integer and tenant_id=v_tenant and available;
    if not found then raise exception 'Menu item unavailable'; end if;
    v_n := v_n + v_qty; v_price := v_price + v_qty*v_db.price_cents;
  end loop;
  if v_n > 60 or v_price > 1000000 then raise exception 'Order exceeds limit'; end if;
  insert into public.restaurant_orders(tenant_id,customer_name,phone,notes,fulfilment,source,amount_cents,payment_method,payment_status)
   values(v_tenant,left(btrim(p->>'customer_name'),80),v_phone,coalesce(p->>'notes',''),p->>'fulfilment',v_source,v_price::integer,v_payment,case when v_payment='online' then 'pending' else 'unpaid' end)
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
 return jsonb_build_object('id',v.id,'status',v.status,'payment_status',v.payment_status,'amount_cents',v.amount_cents,'created_at',v.created_at);
end; $$;
revoke all on function public.restaurant_track_order(uuid,uuid) from public;
grant execute on function public.restaurant_track_order(uuid,uuid) to anon,authenticated;

create or replace function public.restaurant_admin_status(p_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_tenant text;
begin
 select tenant_id into v_tenant from public.restaurant_orders where id=p_id;
 if not found or not public.restaurant_is_owner(v_tenant) then raise exception 'Not authorized'; end if;
 if p_status not in ('New','Preparing','Ready','Completed','Cancelled') then raise exception 'Invalid status'; end if;
 update public.restaurant_orders set status=p_status where id=p_id;
 return true;
end; $$;
revoke all on function public.restaurant_admin_status(uuid,text) from public;
grant execute on function public.restaurant_admin_status(uuid,text) to authenticated;

