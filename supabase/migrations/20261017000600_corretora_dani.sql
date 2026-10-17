-- Nova corretora: Dani (sigla D, como aparece na planilha).
insert into public.corretores (nome, sigla) values ('Dani', 'D')
on conflict (sigla) do nothing;
