# Autenticação e Autorização — Backend Seguro

> OWASP A01:2021 (Broken Access Control) · A07:2021 (Authentication Failures)
> CWE-287, CWE-306, CWE-862, CWE-863

---

## 1. Autenticação

### 1.1 Senhas

- **NUNCA** armazenar senha em texto plano ou com MD5/SHA1/SHA256 simples
- Usar algoritmos modernos de hashing com salt:
  - `bcrypt` (fator de custo ≥ 12)
  - `Argon2id` (preferível — vencedor do Password Hashing Competition)
  - `scrypt`
  - `PBKDF2` com HMAC-SHA256 e ≥ 600.000 iterações (NIST SP 800-63B)
- Validar força de senha com zxcvbn ou similar (não apenas regex)
- Implementar proteção contra enumeração de usuários (mesma resposta para usuário não encontrado e senha errada)
- Rate limiting em endpoint de login (ex: max 5 tentativas por 15 min por IP/conta)
- Suportar senhas de até 64–128 caracteres (não truncar silenciosamente)

```
❌ $password = md5($input);
✅ $hash = password_hash($input, PASSWORD_ARGON2ID);
```

### 1.2 JWT (JSON Web Tokens)

**Problemas comuns:**
- Algoritmo `none` aceito pelo servidor
- Chave secreta fraca (ex: `"secret"`, `"123456"`)
- Token sem expiração (`exp` ausente)
- Informações sensíveis no payload (JWT é apenas codificado, não cifrado)
- Refresh token sem rotação

**Boas práticas:**
- Especificar algoritmo explicitamente no servidor (`HS256` mínimo, `RS256`/`ES256` recomendado)
- `exp` máximo de 15 minutos para access token
- Refresh token com rotação e reuse detection
- Armazenar refresh token no banco com hash (não o valor bruto)
- Invalidação via blocklist ou família de tokens (para logout seguro)
- Não armazenar JWT em `localStorage` — preferir `httpOnly` cookie

### 1.3 OAuth2 / OpenID Connect

- Sempre validar `state` para prevenir CSRF no fluxo de autorização
- Usar `PKCE` (Proof Key for Code Exchange) mesmo em backends confidenciais
- Validar `aud` (audience) e `iss` (issuer) do token
- Não confiar em tokens sem validação de assinatura
- Usar `nonce` em flows com id_token

### 1.4 MFA (Multi-Factor Authentication)

- Suportar TOTP (RFC 6238) — Google Authenticator, Authy
- Backup codes: gerar 8-10, armazenar com hash, expirar após uso
- Não enviar OTP por SMS como único fator (SIM swapping)
- Rate limit em tentativas de MFA separado do login

### 1.5 Sessões

- ID de sessão gerado com CSPRNG (Cryptographically Secure Pseudo-Random Number Generator)
- Mínimo 128 bits de entropia
- Regenerar ID após login (session fixation)
- Timeout: inatividade (ex: 30 min) + absoluto (ex: 8h)
- `Secure`, `HttpOnly`, `SameSite=Strict` nos cookies de sessão
- Invalidar sessão no logout (server-side)

---

## 2. Autorização

### 2.1 RBAC (Role-Based Access Control)

- Definir papéis no nível mais restritivo possível (least privilege)
- Validar autorização em **cada** endpoint — não confiar apenas no frontend
- Nunca expor IDs internos sem verificar se o caller tem acesso ao recurso

```
❌ GET /api/users/{id}  → retorna qualquer usuário se autenticado
✅ GET /api/users/{id}  → verifica se {id} == caller.userId OU caller.role == ADMIN
```

### 2.2 ABAC (Attribute-Based Access Control)

- Para regras mais granulares: considerar ABAC (ex: "usuário pode ver prontuário apenas do paciente vinculado à sua clínica")
- Implementar via policy engine (ex: OPA — Open Policy Agent) para regras complexas

### 2.3 IDOR (Insecure Direct Object Reference)

- **IDOR é a vulnerabilidade mais comum em APIs REST**
- Nunca usar IDs sequenciais para recursos sensíveis — usar UUIDs v4
- Sempre verificar se o recurso pertence ao contexto do usuário autenticado
- Testes obrigatórios: autenticar como UserA, tentar acessar recurso do UserB

### 2.4 Privilege Escalation

- Parâmetros de role/permission nunca devem vir do request body do cliente
- Mudança de papéis deve exigir reautenticação ou aprovação adicional
- Endpoints administrativos em path separado com middleware dedicado

### 2.5 Multi-tenancy

- Filtrar **sempre** por `tenantId` antes de qualquer query
- Verificar `tenantId` no JWT, não apenas no path
- Nunca fazer query sem o filtro de tenant em ambiente multi-tenant
- Testes cross-tenant são obrigatórios no CI

---

## 3. Checklist Rápido — Auth & Authz

- [ ] Senhas com Argon2id ou bcrypt (custo ≥ 12)
- [ ] JWT com algoritmo explícito, `exp` curto, refresh com rotação
- [ ] Rate limiting em login, MFA e recuperação de senha
- [ ] Proteção contra enumeração de usuário
- [ ] Session fixation prevenido (regenerar ID após login)
- [ ] Cookies com `Secure`, `HttpOnly`, `SameSite`
- [ ] Autorização verificada em cada endpoint (não só autenticação)
- [ ] IDOR prevenido: UUID + verificação de propriedade
- [ ] Filtro de tenantId em todos os queries (se multi-tenant)
- [ ] Endpoints admin com middleware separado
- [ ] Logout invalida sessão server-side
- [ ] MFA com TOTP + backup codes hasheados
