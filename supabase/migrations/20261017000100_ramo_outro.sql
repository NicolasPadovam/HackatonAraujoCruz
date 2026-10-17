-- Alinha o enum de ramos ao modelo de dados (docs/arquitetura/modelo-dados.md).
-- Em arquivo próprio: um valor novo de enum só pode ser usado depois do commit.
alter type public.ramo_seguro add value if not exists 'outro';
