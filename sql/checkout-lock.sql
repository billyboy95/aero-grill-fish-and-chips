create or replace function public.restaurant_internal_order(p_id uuid,p_token uuid,p_secret text,p_checkout text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v public.restaurant_orders%rowtype;
begin
 if not exists(select 1 from restaurant_private.settings where gateway_secret_hash=encode(extensions.digest(p_secret,'sha256'),'hex')) then raise exception 'Unauthorized'; end if;
 select * into v from public.restaurant_orders where id=p_id and token=p_token and tenant_id='aero-grill' for update;
 if not found then raise exception 'Order not found'; end if;
 if p_checkout is not null then
   if v.payment_status<>'pending' or v.payment_method<>'online' or (v.external_checkout_id is not null and v.external_checkout_id<>p_checkout) then raise exception 'Checkout conflict'; end if;
   update public.restaurant_orders set external_checkout_id=p_checkout where id=p_id and (external_checkout_id is null or external_checkout_id=p_checkout);
 end if;
 return jsonb_build_object('id',v.id,'amount_cents',v.amount_cents,'payment_status',v.payment_status,'external_checkout_id',coalesce(p_checkout,v.external_checkout_id));
end; $$;
revoke all on function public.restaurant_internal_order(uuid,uuid,text,text) from public;
grant execute on function public.restaurant_internal_order(uuid,uuid,text,text) to anon;

