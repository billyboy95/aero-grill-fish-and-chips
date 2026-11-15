alter table public.restaurant_menu_items add column image_url text not null default '';
create or replace function public.restaurant_save_profile(p jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.restaurant_is_owner('aero-grill') then raise exception 'Not authorized'; end if;
 if jsonb_typeof(p) is distinct from 'object' then raise exception 'Invalid profile'; end if;
 if length(coalesce(p->>'address',''))>250 or length(coalesce(p->>'phone',''))>30 or length(coalesce(p->>'opening_hours',''))>400 or length(coalesce(p->>'collection_instructions',''))>400 then raise exception 'Profile field too long'; end if;
 if coalesce(p->>'logo_url','')<>'' and (p->>'logo_url' !~ '^https://' or length(p->>'logo_url')>1000) then raise exception 'Use a secure logo URL'; end if;
 if coalesce((p->>'content_approved')::boolean,false) and (length(coalesce(p->>'address',''))<5 or length(coalesce(p->>'phone',''))<7 or length(coalesce(p->>'opening_hours',''))<3) then raise exception 'Address, contact number and opening hours are required for approval'; end if;
 update public.restaurant_profiles set address=coalesce(p->>'address',''),phone=coalesce(p->>'phone',''),opening_hours=coalesce(p->>'opening_hours',''),collection_instructions=coalesce(p->>'collection_instructions',''),logo_url=coalesce(p->>'logo_url',''),content_approved=coalesce((p->>'content_approved')::boolean,false) where tenant_id='aero-grill';
 return true;
end; $$;
revoke all on function public.restaurant_save_profile(jsonb) from public;
grant execute on function public.restaurant_save_profile(jsonb) to authenticated;
create or replace function public.restaurant_save_menu(p_id integer,p jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not public.restaurant_is_owner('aero-grill') then raise exception 'Not authorized'; end if;
 if length(btrim(coalesce(p->>'name',''))) not between 2 and 80 or length(coalesce(p->>'description',''))>300 or coalesce(p->>'price_cents','') !~ '^[0-9]+$' or (p->>'price_cents')::integer not between 1 and 1000000 then raise exception 'Invalid menu details'; end if;
 if coalesce(p->>'image_url','')<>'' and (p->>'image_url' !~ '^https://' or length(p->>'image_url')>1000) then raise exception 'Use a secure photo URL'; end if;
 update public.restaurant_menu_items set name=btrim(p->>'name'),description=coalesce(p->>'description',''),price_cents=(p->>'price_cents')::integer,image_url=coalesce(p->>'image_url','') where id=p_id and tenant_id='aero-grill';
 if not found then raise exception 'Menu item not found'; end if;
 update public.restaurant_profiles set content_approved=false where tenant_id='aero-grill';
 return true;
end; $$;
revoke all on function public.restaurant_save_menu(integer,jsonb) from public;
grant execute on function public.restaurant_save_menu(integer,jsonb) to authenticated;
