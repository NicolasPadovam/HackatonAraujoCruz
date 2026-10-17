-- Dados de desenvolvimento (apenas ambiente local; NUNCA dados reais de clientes).
insert into public.seguradoras (nome) values
  ('Porto Seguro'), ('Bradesco Seguros'), ('SulAmérica'), ('Tokio Marine'), ('Allianz')
on conflict (nome) do nothing;
