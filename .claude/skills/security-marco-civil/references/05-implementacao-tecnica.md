# Implementação Técnica — Marco Civil da Internet

> Decreto 8.771/2016 — Arts. 11°, 13°, 15° | Lei 12.965/2014 — Arts. 13°, 15°, 16°

---

## 1. Arquitetura de Logs Conforme Marco Civil

### Separação Obrigatória de Categorias

```
┌─────────────────────────────────────────────────────────┐
│                  SISTEMA DE LOGS                        │
├───────────────────┬─────────────────────────────────────┤
│  ACCESS LOGS      │  APPLICATION LOGS                   │
│  (Marco Civil)    │  (Debug/Operacional)                │
│                   │                                     │
│  IP de origem     │  Stack traces                       │
│  Data/hora        │  Erros de negócio                   │
│  Usuário (se auth)│  Performance metrics                │
│  Endpoint acessado│  ❌ NÃO incluir IP aqui             │
│  Protocolo        │  ❌ NÃO incluir dados pessoais      │
│                   │                                     │
│  Retenção: 6m     │  Retenção: 30-90 dias              │
│  Acesso: restrito │  Acesso: dev/ops                   │
│  Imutável: sim    │  Imutável: preferível              │
└───────────────────┴─────────────────────────────────────┘
```

**Por que separar?**
- Facilita extração precisa em caso de ordem judicial (só o necessário)
- Evita incluir dados de debug sensíveis em resposta a requisição judicial
- Permite retenções diferentes (6 meses para MCI vs. 30 dias para debug)
- Controle de acesso diferenciado

---

## 2. Estrutura Recomendada do Access Log

### Formato JSON Estruturado

```json
{
  "timestamp": "2024-03-15T14:22:31.000Z",
  "type": "ACCESS_LOG",
  "ip": "203.0.113.42",
  "ip_version": "IPv4",
  "user_id": "usr_abc123",
  "session_id": "sess_xyz789",
  "method": "POST",
  "endpoint": "/api/v1/orders",
  "status_code": 201,
  "bytes_sent": 1024,
  "user_agent": "Mozilla/5.0 (Linux; Android 13) ...",
  "referer": "https://app.example.com/cart",
  "response_time_ms": 245,
  "request_id": "req_def456"
}
```

### O que NÃO incluir no Access Log

```json
// ❌ NÃO incluir — vaza dado sensível desnecessariamente
{
  "timestamp": "...",
  "ip": "...",
  "user_id": "...",
  "endpoint": "/api/v1/orders",
  
  // ❌ NUNCA nos access logs:
  "request_body": "{ \"cpf\": \"123.456.789-00\", \"cartao\": \"4111...\" }",
  "password": "...",
  "token": "eyJ...",
  "credit_card": "...",
  "full_ssn": "..."
}
```

---

## 3. Timestamp — Requisito de Precisão e Fuso Horário

O Decreto 8.771/2016 não especifica fuso, mas a interoperabilidade com autoridades exige:

```
✅ Boas práticas:
- UTC (Universal Coordinated Time) como padrão de armazenamento
- Precisão mínima: segundos (recomendado: milissegundos)
- Formato ISO 8601: "2024-03-15T14:22:31.000Z"
- NTP sincronizado — máximo 1 segundo de drift
- Monotônico: garantir que não haja saltos ou retrocessos de tempo

❌ Problemas comuns:
- Usar horário local sem fuso explícito (BRT, BRST variam com horário de verão)
- Timestamps em epoch sem documentar a precisão (segundos vs. milissegundos)
- Servidor com relógio desincronizado (inviabiliza uso forense)
```

---

## 4. Imutabilidade dos Logs

Uma das exigências do Decreto 8.771 é que os registros sejam confiáveis — o que implica imutabilidade:

### Abordagens por Infraestrutura

```
OPÇÃO 1 — Banco de dados com append-only
  - Tabela sem UPDATE/DELETE para o role da aplicação
  - Particionamento por data para facilitar purge por período
  - Exemplos: TimescaleDB, particionamento PostgreSQL

OPÇÃO 2 — Objeto de armazenamento imutável
  - AWS S3 Object Lock (Compliance Mode)
  - GCS Object Retention
  - Azure Immutable Blob Storage
  - Logs rotacionados e enviados para bucket com retenção bloqueada

OPÇÃO 3 — SIEM / Log Management dedicado
  - Elasticsearch + Logstash + Kibana (ELK)
  - Splunk
  - Datadog Logs
  - Graylog
  → Configurar sem permissão de exclusão para o pipeline de ingestão

OPÇÃO 4 — Combinação (recomendada para sistemas críticos)
  - Logs em banco local (hot — acesso rápido, 6 meses)
  - Exportar para object storage imutável (cold — arquivo, 2+ anos)
```

---

## 5. Controle de Acesso aos Logs

```
Princípio: log de acesso é dado pessoal — acesso deve ser justificado e auditado.

Níveis de acesso recomendados:

NÍVEL 1 — Operações/SRE:
  ✅ Logs operacionais (erros, performance, infraestrutura)
  ❌ Access logs com IP e dados de usuário

NÍVEL 2 — Segurança/SOC:
  ✅ Access logs completos para investigação de incidentes
  ✅ Logs de autenticação e autorização
  ✅ Meta-logs de auditoria

NÍVEL 3 — Compliance/Jurídico:
  ✅ Extração para resposta a ordens judiciais
  ✅ Relatórios de transparência

NÍVEL 4 — Gestão:
  ✅ Relatórios agregados e anonimizados
  ❌ Dados individuais sem necessidade específica

Meta-log de auditoria:
Registrar toda consulta aos access logs:
{
  "who": "user_operacional_x",
  "when": "2024-03-15T10:00:00Z",
  "what": "QUERY access_logs WHERE user_id = 'abc'",
  "justification": "Investigação de incidente #4521",
  "period_queried": "2024-03-01 a 2024-03-15"
}
```

---

## 6. Purge Automatizado — Implementação

```sql
-- PostgreSQL: particionamento por mês para purge eficiente
CREATE TABLE access_logs (
    id          BIGSERIAL,
    timestamp   TIMESTAMPTZ NOT NULL,
    ip          INET NOT NULL,
    user_id     UUID,
    endpoint    TEXT NOT NULL,
    method      VARCHAR(10),
    status_code SMALLINT,
    request_id  UUID
) PARTITION BY RANGE (timestamp);

-- Criar partição para cada mês
CREATE TABLE access_logs_2024_03
  PARTITION OF access_logs
  FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

-- Purge eficiente: DROP PARTITION (instantâneo vs. DELETE em milhões de linhas)
-- Job mensal (rodar no 1° do mês, 7 meses após a partição)
DROP TABLE IF EXISTS access_logs_2023_08; -- 7 meses atrás (6 meses de retenção + buffer)
```

```python
# Job de purge em Python — com verificação de hold jurídico
def purge_old_logs():
    cutoff_date = datetime.now() - timedelta(days=180)  # 6 meses
    
    # Verificar se há holds jurídicos no período
    holds = get_active_legal_holds()
    protected_periods = [(h.start_date, h.end_date) for h in holds]
    
    # Não purgar períodos com hold ativo
    for start, end in protected_periods:
        if start <= cutoff_date <= end:
            logger.warning(f"Hold jurídico ativo para período {start}-{end}, purge suspenso")
            return
    
    # Executar purge
    deleted = db.execute(
        "DELETE FROM access_logs WHERE timestamp < %s AND legal_hold = FALSE",
        (cutoff_date,)
    )
    logger.info(f"Purge executado: {deleted} registros removidos (corte: {cutoff_date})")
    audit_log("PURGE_EXECUTED", deleted_count=deleted, cutoff=cutoff_date)
```

---

## 7. IPv6 — Considerações

```
O Marco Civil se aplica a IPv6 da mesma forma que IPv4.

Desafios específicos de IPv6:
- Endereços IPv6 são mais longos (128 bits vs. 32 bits)
- Um único prefixo /64 pode mascarar milhões de endereços
- CGN (Carrier-Grade NAT) menos comum em IPv6 — cada cliente pode ter IP fixo
- Armazenar endereço completo (não truncar como às vezes se faz com IPv4 para GDPR)
  pois o Marco Civil exige o dado completo para identificação em investigações

Armazenar: endereço IPv6 completo + eventual porta de origem (para NAT64)
Exemplo: "2804:14d:5c80:8800:1:2:3:4"
```

---

## 8. Relação Marco Civil + LGPD na Prática

| Situação | Marco Civil diz | LGPD diz | O que fazer |
|---|---|---|---|
| Logs de acesso | Guardar 6 meses (obrigação) | Dado pessoal — minimizar | Guardar exatamente 6 meses, depois purgar |
| Conteúdo de mensagens | Não guardar para fornecer a terceiros | Finalidade: só para funcionar o serviço | Guardar só o necessário para funcionamento; nunca para vender/usar em ads |
| Fornecer dados à polícia | Só com ordem judicial | Obrigação legal como base (art. 7°, II) | Exigir ordem judicial para registros; fornecer com base na obrigação legal |
| IP nos logs | Parte do registro obrigatório | Dado pessoal — proteger | Armazenar com controle de acesso, criptografia, acesso auditado |
| Transparência governamental | Relatório encorajado | Responsabilização (demonstrar conformidade) | Publicar relatório anual de transparência |

---

## 9. Relatório de Transparência (Boa Prática)

```markdown
## Relatório de Transparência — 1° Semestre 2024

### Requisições de Dados Governamentais
- Total de requisições recebidas: 42
- Requisições atendidas integralmente: 35
- Requisições atendidas parcialmente: 4
- Requisições recusadas (inválidas): 3

### Por Tipo de Autoridade
- Ordens judiciais (Poder Judiciário): 38
- Ministério Público (via judicial): 4

### Por Tipo de Dado Fornecido
- Dados cadastrais: 40
- Registros de acesso: 30
- Conteúdo de comunicações: 0

### Remoção de Conteúdo
- Ordens judiciais de remoção recebidas: 12
- Conteúdo removido por ordem judicial: 11
- Conteúdo removido (art. 21° — nudez sem consentimento): 8
- CSAM reportado e removido: 2
```

---

## Checklist Rápido — Implementação Técnica

- [ ] Access logs separados dos logs operacionais/debug
- [ ] Access logs contêm: IP, timestamp UTC com precisão de segundos, user_id, endpoint, método, status
- [ ] Access logs NÃO contêm: corpo de requests, senhas, tokens, dados de cartão
- [ ] NTP configurado e sincronizado (drift < 1s)
- [ ] Logs armazenados de forma imutável (sem UPDATE/DELETE pelo usuário da aplicação)
- [ ] Controle de acesso aos logs com auditoria (meta-log)
- [ ] Purge automatizado ao final de 6 meses (ou 1 ano para ISP)
- [ ] Mecanismo de hold jurídico para suspender purge em investigações ativas
- [ ] IPv6 armazenado completo (128 bits)
- [ ] Procedimento documentado para extração em resposta a ordens judiciais
- [ ] Relatório de transparência publicado ou processo para publicação
- [ ] Backup dos access logs criptografado e separado dos backups de dados de aplicação
