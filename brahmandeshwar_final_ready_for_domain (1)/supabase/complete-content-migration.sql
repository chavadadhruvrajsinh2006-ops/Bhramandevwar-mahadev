-- Run once in Supabase SQL Editor. Safe to re-run.
alter table public.temple_info add column if not exists history text;
alter table public.temple_info add column if not exists significance text;
alter table public.temple_info add column if not exists map_url text;
alter table public.temple_info add column if not exists email text;

insert into public.temple_info (id, temple_name, description, history, significance, address, phone, timings, email, map_url)
values (1, 'બ્રહ્માંડેશ્વર મહાદેવ મંદિર', 'બ્રહ્માંડેશ્વર મહાદેવ મંદિર ભક્તિ, શાંતિ અને આધ્યાત્મિકતાનું પવિત્ર સ્થળ છે.', '[અહીં મંદિરનો સંપૂર્ણ ઇતિહાસ ટૂંક સમયમાં ઉમેરાશે]', 'આ મંદિર ભક્તો માટે ખૂબ જ મહત્વપૂર્ણ છે.', 'બ્રહ્માંડેશ્વર મહાદેવ મંદિર, ખોલવાડા, સિદ્ધપુર, ગુજરાત', '+૯૧ ૯૩૧૬૫૧૩૩૦૧', 'સવારે ૫:૦૦ થી રાત્રે ૧૦:૦૦', 'bhramandeshwarmahadev@gmail.com', 'https://maps.app.goo.gl/m5frtUYgsR8UAwLA6')
on conflict (id) do nothing;
