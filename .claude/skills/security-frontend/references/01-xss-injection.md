# XSS e Injection — Frontend Seguro

> OWASP A03:2021 (Injection)
> CWE-79, CWE-80, CWE-116

---

## 1. O que é XSS

Cross-Site Scripting (XSS) ocorre quando código JavaScript malicioso é injetado e executado
no contexto do browser da vítima. Pode roubar cookies, tokens, redirecionar usuário,
executar ações em nome da vítima, capturar keystrokes.

### Tipos

| Tipo | Como ocorre | Exemplo |
|---|---|---|
| **Reflected** | Input refletido na resposta sem sanitização | Parâmetro de busca inserido diretamente no HTML |
| **Stored/Persistent** | Payload salvo no banco e renderizado para outros | Comentário com `<script>` em fórum |
| **DOM-based** | Manipulação do DOM com dados de fontes não-confiáveis | `location.hash` inserido via `innerHTML` |

---

## 2. Fontes de Dados Não-Confiáveis no Frontend

Qualquer dado vindo dessas fontes deve ser tratado como potencialmente malicioso:

- `location.href`, `location.search`, `location.hash`
- `document.referrer`
- `document.cookie` (se manipulável pelo usuário)
- `window.name`
- `postMessage` recebido
- Dados de APIs externas
- Input do usuário em formulários
- Parâmetros de rota/URL

---

## 3. Sinks Perigosos (onde XSS se manifesta)

Nunca inserir dados não-confiáveis nesses locais sem sanitização rigorosa:

```javascript
// ❌ PERIGOSOS — executam HTML/JS
element.innerHTML = userInput;
element.outerHTML = userInput;
document.write(userInput);
document.writeln(userInput);
eval(userInput);
setTimeout(userInput);      // se string, não função
setInterval(userInput);
new Function(userInput);

// Atributos perigosos
element.setAttribute('onclick', userInput);
element.setAttribute('href', 'javascript:' + userInput);
element.src = userInput;    // pode ser javascript:
```

```javascript
// ✅ SEGUROS — textContent não interpreta HTML
element.textContent = userInput;
element.innerText = userInput;
element.setAttribute('data-value', userInput); // atributos de dados
```

---

## 4. React

React escapa automaticamente na maioria dos casos — **mas há exceções**:

```jsx
// ❌ Bypass do escape automático — evitar ao máximo
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ Usar dangerouslySetInnerHTML apenas com conteúdo sanitizado
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />

// ❌ Links com href controlado pelo usuário
<a href={userProvidedUrl}>click</a>  // pode ser javascript:alert(1)

// ✅ Validar schema do link
const safeUrl = /^https?:\/\//.test(userUrl) ? userUrl : '#';
<a href={safeUrl}>click</a>

// ❌ Atributos dinâmicos perigosos
<img onError={userInput} />
```

---

## 5. Angular

- Angular usa sanitização automática em binding de templates `{{ }}`
- `[innerHTML]` sanitiza automaticamente (exceto se bypass explícito)
- `DomSanitizer.bypassSecurityTrust*()` desabilita sanitização — **usar com extrema cautela**

```typescript
// ❌ Bypass sem necessidade
this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(userInput);

// ✅ Quando necessário, sanitizar com DOMPurify antes
import DOMPurify from 'dompurify';
this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(
  DOMPurify.sanitize(userInput)
);
```

---

## 6. Sanitização com DOMPurify

Biblioteca mais consolidada para sanitização de HTML no browser:

```javascript
import DOMPurify from 'dompurify';

// Uso básico
const clean = DOMPurify.sanitize(dirtyHTML);

// Apenas texto — remove todo HTML
const textOnly = DOMPurify.sanitize(dirtyHTML, { ALLOWED_TAGS: [] });

// Permitir apenas tags específicas
const limited = DOMPurify.sanitize(dirtyHTML, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'title', 'target'],
  ALLOW_DATA_ATTR: false,
  FORBID_ATTR: ['style', 'onerror', 'onload'],
});

// Forçar links abrirem em nova aba com rel seguro
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});
```

---

## 7. Links Externos e `target="_blank"`

```html
<!-- ❌ Sem rel — página destino pode acessar window.opener -->
<a href="https://external.com" target="_blank">Link</a>

<!-- ✅ -->
<a href="https://external.com" target="_blank" rel="noopener noreferrer">Link</a>
```

- `noopener` — impede acesso ao `window.opener`
- `noreferrer` — impede envio do Referrer header (privacidade)
- Browsers modernos aplicam `noopener` automaticamente, mas manter explícito é boa prática

---

## 8. postMessage

```javascript
// ❌ Aceitar mensagens de qualquer origem
window.addEventListener('message', (event) => {
  doSomethingWith(event.data); // perigoso
});

// ✅ Verificar origem antes de processar
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://trusted-origin.com') return;
  // processar event.data
});
```

---

## 9. URL e Redirect Aberto (Open Redirect)

```javascript
// ❌ Redirecionar para URL fornecida pelo usuário
const redirectTo = new URLSearchParams(location.search).get('next');
window.location.href = redirectTo; // pode ser javascript: ou phishing

// ✅ Allowlist de destinos OU verificar que é path relativo
const isRelativePath = /^\/[^/]/.test(redirectTo);
if (isRelativePath) {
  window.location.href = redirectTo;
} else {
  window.location.href = '/dashboard'; // fallback seguro
}
```

---

## 10. Checklist Rápido — XSS e Injection

- [ ] `innerHTML` / `outerHTML` nunca usados com dados não-confiáveis sem DOMPurify
- [ ] `dangerouslySetInnerHTML` (React) apenas com DOMPurify aplicado
- [ ] `bypassSecurityTrust*` (Angular) apenas com sanitização adicional
- [ ] `textContent` / `innerText` preferido ao invés de `innerHTML`
- [ ] `eval()`, `setTimeout(string)` ausentes no código de produção
- [ ] Links com `href` controlado pelo usuário validam schema (`http://`, `https://`)
- [ ] `target="_blank"` sempre com `rel="noopener noreferrer"`
- [ ] `postMessage` verifica `event.origin` antes de processar
- [ ] Open redirect: validar que destino é path relativo ou allowlisted
- [ ] DOMPurify instalado e atualizado se houver renderização de HTML rico
