-- Etapas da renovação (docs/produto/features/002-atividades-por-funcao.md).
-- Só acrescenta valores ao enum: um valor novo não pode ser usado na mesma transação em que nasce,
-- por isso a regra e as funções que os usam ficam na migration seguinte.

alter type public.status_renovacao add value if not exists 'cotada' before 'renovada';
alter type public.status_renovacao add value if not exists 'enviada' after 'cotada';
alter type public.status_renovacao add value if not exists 'negociando' after 'enviada';
alter type public.status_renovacao add value if not exists 'cancelada' after 'nao_renovada';
