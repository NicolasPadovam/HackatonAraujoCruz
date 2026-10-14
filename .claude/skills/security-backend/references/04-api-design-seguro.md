# Design Seguro de APIs — Backend Seguro

> OWASP A04:2021 (Insecure Design) · A10:2021 (SSRF)
> OWASP API Security Top 10 (2023)
> CWE-918, CWE-285, CWE-400

---

## 1. OWASP API Security Top 10 (2023)

| ID | Categoria | Prevenção Principal |
|---|---|---|
| API1 | Broken Object Level Authorization | Verificar propriedade de recurso por request |
| API2 | Broken Authentication | JWT seguro, MFA, rate limiting |
| API3 | Broken Object Property Level Auth | Filtrar campos na resposta por papel |
| API4 | Unrestricted Resource Consumption | Rate limiting, paginação obrigatória |
| API5 | Broken Function Level Authorization | Verificar verbo HTTP + papel na ação |
| API6 | Unrestricted Access to Sensitive Flows | Rate limiting em fluxos críticos |
| API7 | SSRF | Allowlist de URLs, bloqueio de IPs internos |
| API8 | Security Misconfiguration | Hardening, defaults seguros, sem debug em prod |
| API9 | Improper Inventory Management | Documentação, versionamento, deprecação |
| API10 | Unsafe Consumption of APIs | Validar respostas de APIs externas |

---

## 2. HTTP Headers de Segurança

### Headers Obrigatórios em Toda API

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Cache-Control: no-store
Referrer-Policy: no-referrer
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

### Para APIs com resposta HTML
```
Content-Security-Policy: default-src 'self'; ...
```

### Headers a Remover/Desabilitar
```
X-Powered-By       # expõe tecnologia
Server             # expõe versão do servidor
X-AspNet-Version   # expõe framework
```

### CORS — Cross-Origin Resource Sharing

```
# ❌ Nunca em produção
Access-Control-Allow-Origin: *

# ✅ Allowlist explícita
Access-Control-Allow-Origin: https://app.seudominio.com
Access-Control-Allow-Credentials: true   # só se necessário
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
```

- Configurar CORS explicitamente, não depender do default do framework
- Validar Origin server-side antes de refletir em ACAO header
- `null` Origin deve ser rejeitado (sandbox iframes)

---

## 3. Rate Limiting

### Por que é segurança, não apenas performance
- Previne brute force (senhas, tokens, OTPs)
- Previne credential stuffing
- Previne scraping e enumeração de dados
- Previne DoS em endpoints custosos

### Estratégia por Tipo de Endpoint

| Endpoint | Limite sugerido | Janela |
|---|---|---|
| POST /auth/login | 5 por IP | 15 minutos |
| POST /auth/forgot-password | 3 por email | 1 hora |
| POST /auth/verify-mfa | 5 por conta | 10 minutos |
| GET /api/* (autenticado) | 100-500 por usuário | 1 minuto |
| GET /api/* (público) | 30 por IP | 1 minuto |
| POST /api/* (escrita) | 30 por usuário | 1 minuto |
| Upload | 10 por usuário | 10 minutos |

### Implementação
- Rate limit por IP **e** por conta (não apenas um)
- Headers de resposta: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`
- HTTP 429 Too Many Requests com `Retry-After`
- Algoritmos: Token Bucket (bursts) ou Sliding Window (mais preciso)
- Estado distribuído se múltiplas instâncias (Redis, Memcached)

---

## 4. SSRF (Server-Side Request Forgery)

### O que é
O servidor faz uma requisição HTTP para uma URL fornecida pelo usuário — que pode ser interna.

```
# ❌ Endpoint que busca URL do usuário
POST /api/preview
{ "url": "http://169.254.169.254/latest/meta-data/" }  # metadata AWS
{ "url": "http://internal-service/admin" }               # serviço interno
{ "url": "file:///etc/passwd" }                          # filesystem
```

### Mitigações
- **Allowlist** de domínios/IPs para URLs fornecidas por usuários
- Resolver DNS e verificar IP **depois** da resolução (TOCTOU)
- Bloquear ranges de IP internos após resolução:
  - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
  - `127.0.0.0/8` (loopback)
  - `169.254.0.0/16` (link-local / cloud metadata)
  - `::1` (IPv6 loopback)
- Desabilitar redirects ou validar URL de destino após redirect
- Usar schema allowlist: apenas `http://` e `https://` (nunca `file://`, `ftp://`, `gopher://`)

---

## 5. Paginação e Limites de Recursos

- **Nunca** retornar coleção inteira sem paginação
- Definir tamanho máximo de página (ex: max 100 registros)
- Ignorar `pageSize` fornecido pelo usuário acima do máximo
- Timeout em queries longas
- Limitar profundidade de queries GraphQL e complexidade de campos

```
# ❌ Sem limite
GET /api/users?page=1&size=99999

# ✅ Ignorar acima do máximo
GET /api/users?page=1&size=99999  → retorna 100 (máximo configurado)
```

---

## 6. Versionamento e Inventário

- Versionar APIs: `/v1/`, `/v2/`
- Documentar e deprecar versões antigas (não apenas remover)
- Manter inventário atualizado de todos os endpoints
- Desabilitar endpoints de versões antigas após período de deprecação
- Evitar "shadow APIs" — endpoints não documentados em produção
- Auditoria periódica de endpoints expostos vs. documentados

---

## 7. Resposta de Erro Segura

```json
// ❌ Expõe detalhes internos
{
  "error": "NullPointerException at UserService.java:42",
  "sql": "SELECT * FROM users WHERE id = '1' OR '1'='1'"
}

// ✅ Genérico para cliente, detalhado apenas em logs internos
{
  "error": "Recurso não encontrado",
  "errorCode": "RESOURCE_NOT_FOUND",
  "requestId": "abc-123-xyz"
}
```

- Stack traces nunca em produção
- `requestId` correlacionado com log interno para debugging
- Erro genérico para autenticação/autorização: não revelar se usuário existe
- HTTP status codes corretos (não usar 200 para tudo)

---

## 8. Checklist Rápido — API Design

- [ ] Headers de segurança em todas as respostas
- [ ] CORS com allowlist explícita (não `*`)
- [ ] Rate limiting em endpoints de auth e críticos
- [ ] Rate limiting por IP e por conta
- [ ] SSRF: allowlist de URLs, bloqueio de IPs internos
- [ ] Paginação obrigatória com tamanho máximo
- [ ] Erros genéricos para cliente com requestId rastreável
- [ ] Stack traces desabilitados em produção
- [ ] Versionamento de API com processo de deprecação
- [ ] Inventário de endpoints mantido
- [ ] X-Powered-By e Server header removidos
- [ ] HTTP redireciona para HTTPS (não aceitar HTTP em produção)
