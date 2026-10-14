# CSRF e Clickjacking — Frontend Seguro

> OWASP A01, A04 · CWE-352, CWE-1021

---

## 1. CSRF (Cross-Site Request Forgery)

Atacante induz vítima autenticada a fazer request não-intencional.

### Mitigações Principais

**SameSite Cookie** (mais efetivo):
```
Set-Cookie: session=abc123; SameSite=Strict; Secure; HttpOnly
# Strict: cookie nunca enviado em requests cross-site
# Lax: cookie enviado apenas em navegação top-level (GET)
# None: sempre enviado — exige Secure e CORS correto
```

**CSRF Token**:
```javascript
// Token gerado no servidor, enviado no HTML ou em cookie separado legível pelo JS
// Enviado de volta em header customizado ou campo de formulário
fetch('/api/action', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': getCsrfToken(), // lido do cookie ou meta tag
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

**Double Submit Cookie** (stateless):
- Servidor gera token aleatório, envia como cookie + campo no body
- Servidor verifica que ambos são iguais

### Quando JWT em Header é Suficiente
APIs que autenticam **apenas** via `Authorization: Bearer <token>` header (não cookies)
são naturalmente imunes a CSRF — browsers não enviam headers customizados em requests
cross-origin sem CORS explícito.

---

## 2. Clickjacking

Atacante coloca o site da vítima em iframe transparente sobreposto ao próprio site.

```
# Headers no servidor
X-Frame-Options: DENY          # nunca pode ser iframado
X-Frame-Options: SAMEORIGIN   # apenas pelo próprio domínio

# Mais flexível via CSP
Content-Security-Policy: frame-ancestors 'none';
Content-Security-Policy: frame-ancestors 'self' https://trusted.com;
```

Frame-busting JavaScript (legado, evitar — pode ser bypassado):
```javascript
// Fraco — não confiar nisto isoladamente
if (window.top !== window.self) { window.top.location = window.self.location; }
```

---

# Armazenamento no Browser — Frontend Seguro

> CWE-312, CWE-359

---

## Comparação de Mecanismos

| Mecanismo | XSS-safe | CSRF-safe | Acessível por JS | Persistência | Uso adequado |
|---|---|---|---|---|---|
| `httpOnly` Cookie | ✅ | ❌ (precisa SameSite) | ❌ | Configurável | Tokens de sessão/auth |
| Cookie normal | ❌ | ❌ | ✅ | Configurável | CSRF token (legível pelo JS) |
| `localStorage` | ❌ | ✅ | ✅ | Permanente | Dados não-sensíveis |
| `sessionStorage` | ❌ | ✅ | ✅ | Por aba | Dados temporários não-sensíveis |
| Memory (variável JS) | ❌* | ✅ | ✅ | Por SPA session | Access tokens |

*Memory não persiste XSS entre sessões, mas XSS ativo na página ainda acessa.

## Recomendação para Tokens de Autenticação

**Access Token** (curta duração: 5-15 min):
- Armazenar em memória (variável de módulo JS/Redux store)
- Nunca em localStorage (exposto a qualquer XSS)
- Perdido ao recarregar página — re-obtido via refresh token

**Refresh Token** (longa duração):
- Armazenar em `httpOnly; Secure; SameSite=Strict` cookie
- Não acessível por JavaScript
- Enviado automaticamente em requests para /auth/refresh

```javascript
// ❌ Access token em localStorage
localStorage.setItem('access_token', token);

// ✅ Access token em memória
let accessToken = null; // módulo singleton
export const setToken = (t) => { accessToken = t; };
export const getToken = () => accessToken;
```

## O que Nunca Armazenar no Browser

- Chaves privadas
- Dados completos de cartão
- Senhas em qualquer forma
- Dados pessoais sensíveis além do necessário para UX
- Secrets de API que dão acesso a recursos backend

---

# Content Security Policy e Headers — Frontend Seguro

> OWASP A05 · CWE-693, CWE-358

---

## Content Security Policy (CSP)

CSP é a defesa mais efetiva contra XSS — limita de onde scripts, estilos e recursos podem ser carregados.

### CSP Básico para SPA

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.seudominio.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### Nonce-based CSP (mais seguro que 'unsafe-inline')

```html
<!-- Servidor gera nonce único por request -->
<script nonce="{{server_generated_nonce}}">
  // seu código inline
</script>
```
```
Content-Security-Policy: script-src 'self' 'nonce-{nonce}';
```

### O que Evitar

- `'unsafe-inline'` em `script-src` — permite XSS inline
- `'unsafe-eval'` — permite eval()
- `script-src *` — permite qualquer origem

### Implementar em Report-Only Primeiro

```
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

Monitore violações antes de aplicar como bloqueio real.

---

## Headers de Segurança Essenciais (Frontend / CDN / Server)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

**`X-Content-Type-Options: nosniff`** — impede browser de "adivinhar" MIME type e executar como script.

**`Cross-Origin-Opener-Policy: same-origin`** — previne acesso ao `window.opener` de outros contextos.

---

# Autenticação no Frontend — Frontend Seguro

> CWE-287, CWE-384

---

## OAuth 2.0 / OIDC no Browser

**Fluxo correto para SPA: Authorization Code + PKCE**

```javascript
// 1. Gerar code_verifier e code_challenge
const codeVerifier = generateRandomString(64); // 43-128 chars
const codeChallenge = base64URLEncode(sha256(codeVerifier));

// 2. Redirecionar para authorization endpoint
const params = new URLSearchParams({
  response_type: 'code',
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT_URI,
  scope: 'openid profile email',
  state: generateRandomString(32), // anti-CSRF
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
});
window.location = `${AUTH_ENDPOINT}?${params}`;

// 3. No redirect, verificar state antes de trocar code por token
const returnedState = params.get('state');
if (returnedState !== storedState) throw new Error('State mismatch');
```

**Nunca usar Implicit Flow** — depreciado, token exposto na URL.

## Logout Seguro

```javascript
async function logout() {
  // 1. Limpar token da memória
  setAccessToken(null);
  
  // 2. Invalidar refresh token no servidor
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  
  // 3. Limpar qualquer dado sensível do sessionStorage/localStorage
  sessionStorage.clear();
  localStorage.removeItem('user_preferences'); // apenas o não-sensível
  
  // 4. Redirecionar para login
  window.location.href = '/login';
}
```

---

# Dependências Frontend — Frontend Seguro

> OWASP A06:2021 · CWE-1104

---

## Gerenciamento de Riscos em npm/yarn

```bash
# Auditar vulnerabilidades
npm audit
yarn audit

# Atualizar com limites de severidade no CI
npm audit --audit-level=high  # falhar build se high ou crítico

# Visualizar dependências transitivas
npm ls <pacote>
```

## Subresource Integrity (SRI)

Garante que scripts/estilos de CDN não foram adulterados:

```html
<script
  src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"
  integrity="sha384-[hash-aqui]"
  crossorigin="anonymous">
</script>
```

Gerar hash:
```bash
curl -s https://cdn.example.com/lib.js | openssl dgst -sha384 -binary | openssl base64 -A
```

## Práticas de Supply Chain

- Usar lockfile (`package-lock.json` ou `yarn.lock`) e commitar no repo
- Não usar `*` ou `latest` em versões de produção
- Revisar dependências novas antes de instalar (verificar autor, downloads, idade)
- Ferramentas de análise: `npm audit`, `Snyk`, `Socket.dev`, `Dependabot`
- Monitoramento contínuo de CVEs em dependências

---

# Formulários e Dados Sensíveis — Frontend Seguro

---

## Campos de Senha

```html
<!-- ✅ -->
<input
  type="password"
  name="password"
  autocomplete="current-password"
  autocorrect="off"
  autocapitalize="off"
  spellcheck="false"
/>

<!-- Para campos de login — permitir autocomplete do password manager -->
<!-- Para campos de criação de senha -->
<input type="password" autocomplete="new-password" />
```

## Dados Sensíveis em Formulários

- `autocomplete="off"` em campos de dados sensíveis (ex: CVV) — browsers podem ignorar
- `spellcheck="false"` em campos de dado pessoal (evitar envio para serviço de spell check)
- Não exibir dados sensíveis em texto puro quando mascarado é suficiente
- Limpar campos de senha após submit

## Validação Client-Side

- Validação client-side é **UX**, não segurança — sempre validar no servidor
- Não desabilitar validação HTML5 (`novalidate`) sem substituir por validação equivalente
- Não confiar em `maxlength` do HTML para limite de dados — servidor define o limite real

## Console e DevTools

```javascript
// ❌ Dados sensíveis em logs que ficam no browser
console.log('User data:', { cpf: user.cpf, token: accessToken });

// ✅ Em produção, desabilitar ou minimizar console.log
// webpack/vite: remover console em build de produção
```

---

# Checklist de Deploy Web — Frontend Seguro

---

## Pré-Deploy

- [ ] CSP configurado e testado (começar com Report-Only)
- [ ] Headers de segurança configurados no servidor/CDN
- [ ] `X-Frame-Options: DENY` ou `frame-ancestors 'none'` no CSP
- [ ] HSTS habilitado
- [ ] Source maps não expostos publicamente em produção
- [ ] `console.log` sensíveis removidos do bundle de produção
- [ ] `npm audit` sem CVEs críticos ou altos
- [ ] Dependências com lockfile commitado

## Build e Assets

- [ ] SRI em todos os scripts externos de CDN
- [ ] Assets servidos via HTTPS
- [ ] Nenhuma chave/secret no bundle JavaScript (visível via DevTools)
- [ ] `robots.txt` não expõe rotas administrativas
- [ ] Versão de bibliotecas não exposta em headers ou comentários HTML

## Verificações Pós-Deploy

- [ ] SecurityHeaders.com: nota mínima A
- [ ] Mozilla Observatory: nota mínima B+
- [ ] CSP sem violações nos primeiros dias (monitorar report-uri)
- [ ] Verificar que source maps não são acessíveis publicamente
- [ ] Verificar headers de segurança com curl:
```bash
curl -I https://seudominio.com
```

## Ferramentas de Verificação

| Ferramenta | URL | O que verifica |
|---|---|---|
| SecurityHeaders.com | https://securityheaders.com | Headers HTTP |
| Mozilla Observatory | https://observatory.mozilla.org | Headers + CSP + cookies |
| CSP Evaluator | https://csp-evaluator.withgoogle.com | Qualidade do CSP |
| SSL Labs | https://ssllabs.com/ssltest | TLS/SSL |
| Snyk | https://snyk.io | Dependências |
