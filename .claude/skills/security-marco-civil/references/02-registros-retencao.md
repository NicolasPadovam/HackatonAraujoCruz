# Registros e Retenção — Marco Civil da Internet

> Lei n° 12.965/2014 — Arts. 13°, 15°, 16° | Decreto 8.771/2016 — Arts. 11°, 15°

---

## 1. Dois Tipos de Registro — Obrigações Distintas

### Registro de Conexão (art. 5°, VI)
Dados relativos à **data e hora de início e término de uma conexão** à internet,
sua duração e o endereço IP utilizado.

**Quem deve guardar:** Provedores de **conexão** (ISPs, operadoras).
**Prazo:** **1 (um) ano** — art. 13°.

### Registro de Acesso a Aplicações de Internet (art. 5°, VIII)
Conjunto de informações referentes à **data e hora de uso de uma determinada aplicação
de internet** a partir de um determinado endereço IP.

**Quem deve guardar:** Provedores de **aplicações** (SaaS, sites, apps).
**Prazo:** **6 (seis) meses** — art. 15°.

---

## 2. O que Registrar — Detalhamento

### Para Provedores de Conexão (art. 13° + Decreto 8.771, art. 11°)

| Campo | Descrição |
|---|---|
| Endereço IP | IPv4 e/ou IPv6 atribuído ao usuário |
| Data e hora de início | Com fuso horário (UTC recomendado) |
| Data e hora de término | Com fuso horário |
| Duração da conexão | Em segundos |
| Identificador do terminal | Quando disponível |

### Para Provedores de Aplicação (art. 15° + Decreto 8.771, art. 11°)

| Campo | Descrição |
|---|---|
| Endereço IP de origem | IP do usuário no momento do acesso |
| Data e hora do acesso | Com fuso horário |
| Identificador do usuário | ID interno da conta, se autenticado |
| Recurso acessado | URL, endpoint, ação realizada |
| Protocolo utilizado | HTTP, HTTPS, versão |

> ⚠️ O Decreto 8.771/2016 (art. 11°) exige que os registros sejam mantidos em
> **formato interoperável e acessível**, com **padrão de segurança** adequado.

---

## 3. O que É PROIBIDO Guardar (art. 16°)

Esta é uma das disposições mais importantes e menos conhecidas do Marco Civil:

> **Art. 16°:** "Na provisão de aplicações de internet, onerosa ou gratuita, é vedada
> a guarda:
> I – dos registros de acesso a outras aplicações de internet sem o consentimento do titular;
> II – de dados pessoais que sejam excessivos em relação à finalidade."

**Traduzindo para prática:**

```
❌ PROIBIDO guardar sem consentimento:
- Histórico de navegação em outros sites (além do seu)
- URLs visitadas fora da sua aplicação
- Dados de outras aplicações usadas pelo usuário
- Rastreamento cross-site sem consentimento

❌ PROIBIDO guardar em qualquer caso:
- Dados pessoais além do necessário para a finalidade
- Dados de navegação interna além do registro de acesso mínimo
  (ex: quais botões o usuário clicou em profundidade excessiva,
   sem consentimento e finalidade legítima)
```

> ⚠️ Pixels de rastreamento de terceiros, fingerprinting e outras técnicas de
> rastreamento cross-site sem consentimento explícito violam este artigo.

---

## 4. Dados que NÃO são "Registros de Acesso"

O Marco Civil protege especificamente o **conteúdo das comunicações** — que tem regime
mais restritivo que os registros:

| Tipo | Regime | Exemplo |
|---|---|---|
| **Registro de conexão/acesso** | Guardar obrigatório (arts. 13°, 15°) | IP, data/hora de login |
| **Metadados de comunicação** | Zona cinzenta — discussão doutrinária | Com quem conversou, duração |
| **Conteúdo de comunicações** | NÃO guardar para fornecimento — sigilo constitucional | O texto das mensagens, e-mails |

> ⚠️ Provedores de mensageria (WhatsApp, Signal, Telegram) frequentemente invocam
> criptografia ponta-a-ponta como impossibilidade técnica de fornecer conteúdo —
> o STF tem debatido os limites desta proteção.

---

## 5. Tabela Consolidada de Prazos

| Tipo de Dado | Provedor | Prazo Marco Civil | Prazo LGPD | Prazo Fiscal |
|---|---|---|---|---|
| Registro de conexão | ISP/Conexão | **1 ano** | Mínimo necessário | — |
| Registro de acesso à aplicação | App/SaaS | **6 meses** | Mínimo necessário | — |
| Dados cadastrais do usuário | App/SaaS | Não definido | Duração do contrato + obrigação legal | — |
| Dados de transação financeira | App/SaaS | Não definido | — | **5 anos** (CTN) |
| Dados de NF/fiscal | Qualquer | Não definido | — | **5 anos** (CTN) |
| Dados trabalhistas | Empregador | Não definido | — | **5 anos** (CLT + prescrição) |

**Regra prática para sistemas de aplicação:**

```
Logs de acesso (IP, data/hora, endpoint): guardar 6 meses mínimo
Dados da conta: guardar enquanto conta ativa + prazo prescricional (5 anos)
Dados fiscais/transacionais: 5 anos (CTN)
Conteúdo de mensagens privadas: guardar para funcionar o serviço; NÃO guardar para fornecer a terceiros
```

---

## 6. Segurança dos Registros (Decreto 8.771/2016, art. 11° e 15°)

Os registros devem ser mantidos com:

```
□ Rigorosos padrões de segurança (confidencialidade, integridade, disponibilidade)
□ Apenas os funcionários responsáveis pelo tratamento têm acesso
□ Registros de acesso aos próprios registros (meta-log de auditoria)
□ Utilização de medidas de segurança compatíveis com boas práticas
□ Utilização de soluções de gestão dos registros por meio de software desenvolvido 
  com tecnologias que garantam a segurança dos registros
```

**Controles técnicos mínimos esperados:**

| Controle | Implementação |
|---|---|
| Confidencialidade | Logs armazenados com acesso restrito; criptografia em repouso |
| Integridade | Logs imutáveis (append-only); hash de verificação; sem possibilidade de edição por quem os gerou |
| Disponibilidade | Retenção garantida pelo prazo legal; backup com redundância |
| Auditabilidade | Log de quem acessou os logs; quando; para qual finalidade |
| Autenticidade | Timestamp confiável (NTP sincronizado); correlação de registros |

---

## 7. Retenção Além do Prazo Mínimo

O Marco Civil define **prazo mínimo**, não máximo — mas a LGPD entra aqui:

- Guardar além do necessário sem finalidade legítima viola o **princípio da necessidade** (LGPD, art. 6°, III)
- Definir e documentar política de retenção que justifique qualquer prazo além do mínimo legal
- Purge automático ao final do período de retenção

```python
# Exemplo: job de purge agendado
# Executar diariamente — purgar logs de acesso com mais de 180 dias
DELETE FROM access_logs 
WHERE created_at < NOW() - INTERVAL '180 days'
  AND log_type = 'APPLICATION_ACCESS';

# Manter logs de conexão por 365 dias (se for ISP)
DELETE FROM connection_logs
WHERE created_at < NOW() - INTERVAL '365 days';
```

---

## Checklist Rápido — Registros e Retenção

- [ ] Identificado se é provedor de conexão (1 ano) ou aplicação (6 meses)
- [ ] Logs de acesso contêm: IP, data/hora com fuso, identificador de usuário, recurso
- [ ] Logs de acesso NÃO contêm: conteúdo de comunicações, dados de outros sites sem consentimento
- [ ] Logs armazenados com controle de acesso restrito
- [ ] Logs imutáveis (sem possibilidade de edição após criação)
- [ ] Timestamp sincronizado via NTP com precisão de segundos
- [ ] Job de purge automático ao final do prazo de retenção
- [ ] Política de retenção documentada e alinhada com LGPD
- [ ] Meta-log de auditoria: quem acessou os logs e quando
- [ ] Backup dos logs criptografado e testado
