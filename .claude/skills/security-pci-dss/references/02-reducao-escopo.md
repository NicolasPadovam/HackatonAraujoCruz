# Redução de Escopo PCI — Tokenização, iFrame e P2PE

> PCI-DSS v4.0 — Req. 3 | PCI P2PE Standard | PCI Token Standard

---

## 1. Por que Reduzir o Escopo é a Melhor Estratégia

O escopo PCI define o custo e a complexidade da conformidade. Cada sistema no CDE:
- Requer hardening e configuração segura
- Requer controles de acesso rigorosos
- Requer monitoramento e logging
- Aumenta a superfície de auditoria

**Melhor abordagem:** nunca tocar dados de cartão — deixar o problema para quem já é certificado.

---

## 2. iFrame Hospedado (Hosted Payment Page / HPP)

A abordagem mais simples para e-commerce — o formulário de cartão é hospedado pelo gateway.

### Como Funciona

```
Browser do cliente
        │
        │  Sua página de checkout carrega...
        ▼
┌───────────────────────────────────────────┐
│ SEU SITE (fora do CDE)                    │
│                                           │
│  [Resumo do pedido]        [botão comprar]│
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │  iFrame do Gateway (CDE do gateway) │  │
│  │                                     │  │
│  │  Número do cartão: [______________] │  │
│  │  Validade: [____]  CVV: [___]       │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
└───────────────────────────────────────────┘
        │
        │ Dados de cartão vão DIRETO ao gateway
        │ Seu servidor NUNCA vê o PAN ou CVV
        ▼
    Gateway certificado PCI-DSS
```

### Impacto no Escopo

- **Seu servidor:** fora do CDE — redução enorme de escopo
- **Seu frontend JS:** ainda no escopo se puder modificar o iFrame (ver SAQ A vs A-EP)
- **Gateway:** no CDE — mas já certificado

### Cuidados com iFrame

```javascript
// ✅ Carregar iFrame apenas via HTTPS
<iframe
  src="https://gateway-certificado.com/checkout/frame"
  sandbox="allow-forms allow-scripts allow-same-origin"
  title="Formulário de pagamento seguro"
/>

// ❌ NÃO interceptar dados do iFrame
// NÃO ter JavaScript no seu domínio que acesse o conteúdo do iFrame
// NÃO usar postMessage para receber dados de cartão do iFrame
// NÃO ter campos de cartão na sua própria página (mesmo que "passem pelo gateway")
```

---

## 3. Tokenização

Substituição do PAN por um token sem valor para atacantes.

### Tipos de Token

| Tipo | Descrição | Uso |
|---|---|---|
| **Network Token** | Emitido pela bandeira (Visa Token Service, Mastercard MDES) | Pagamentos online, recorrentes |
| **Acquirer/Gateway Token** | Emitido pelo gateway/adquirente | Cobrança recorrente sem armazenar PAN |
| **Vault Token** | Emitido por vault próprio (ex: Stripe, Braintree) | Quando há vault externo certificado |

### Fluxo de Tokenização

```
1. PRIMEIRA COMPRA:
   Browser → PAN inserido no iFrame do gateway
   Gateway → armazena PAN no vault certificado
   Gateway → retorna TOKEN ao seu sistema
   Seu sistema → armazena TOKEN (fora do CDE)

2. COMPRAS RECORRENTES:
   Seu sistema → envia TOKEN ao gateway
   Gateway → recupera PAN do vault (CDE do gateway)
   Gateway → processa transação
   Seu sistema → nunca vê o PAN novamente

Token exemplo: "tok_4a8f2b9c1d3e5f7a"  ← sem valor se roubado
PAN real:      "4111111111111111"         ← fica no vault do gateway
```

### Principais Gateways com Tokenização no Brasil

| Gateway | Tokenização | Observação |
|---|---|---|
| **Stripe** | ✅ Stripe.js + tokens | Muito usado, documentação excelente |
| **PagSeguro/PagBank** | ✅ SDK próprio | Amplo no Brasil |
| **Cielo** | ✅ Cielo E-Commerce API | Adquirente + gateway |
| **Rede** | ✅ e.Rede | Adquirente + gateway |
| **Stone** | ✅ SDK + tokens | Popular entre fintechs |
| **Adyen** | ✅ Tokenização avançada | Internacional + Brasil |
| **Braintree (PayPal)** | ✅ Drop-in UI | Internacional |
| **Mercado Pago** | ✅ Checkout Pro/Transparente | Marketplace |

---

## 4. P2PE — Point-to-Point Encryption

Para ambientes físicos (POS, PDV) — dados cifrados no terminal antes de sair.

### Como Funciona

```
Terminal POS (P2PE)
    │
    │ Dados cifrados imediatamente na leitura
    │ (chave de cifragem NÃO está no terminal)
    ▼
Rede do lojista  ← dados ainda cifrados
    │
    ▼
Gateway/Processadora ← decripta aqui (com HSM)
```

### Impacto no Escopo com P2PE

Com solução P2PE **validada pelo PCI SSC**:
- Terminais e sistemas do merchant quase completamente fora do CDE
- Redes por onde trafega o dado cifrado também fora do escopo
- Redução dramática de controles necessários

> ⚠️ Apenas soluções **P2PE listadas pelo PCI SSC** geram redução de escopo formal.
> Criptografia própria no terminal NÃO conta como P2PE para fins de escopo.

---

## 5. SDK / JavaScript de Gateway (Abordagem Recomendada para Web)

Para máxima redução de escopo sem iFrame visível:

```javascript
// Exemplo conceitual com Stripe Elements
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe('pk_live_sua_chave_publica');
const elements = stripe.elements();

// Campo de cartão renderizado pelo SDK do Stripe (no domínio do Stripe)
const cardElement = elements.create('card', {
  style: { base: { fontSize: '16px' } }
});
cardElement.mount('#card-element');

// No submit — PAN vai direto para Stripe, você recebe apenas um token
const { paymentMethod, error } = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
});

// paymentMethod.id é o token — envie este ao seu backend
// Seu backend usa o token para cobrar via API do Stripe
// Seu backend NUNCA viu o PAN
await fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify({ paymentMethodId: paymentMethod.id, amount: 1000 })
});
```

---

## 6. O que Nunca Fazer (Antipadrões que Aumentam Escopo)

```
❌ Criar formulário HTML próprio com campos de cartão
   → Seu servidor recebe o PAN no POST → entra no CDE

❌ Usar JavaScript próprio no mesmo domínio para capturar campos
   → Mesmo que passe para gateway, você processou o dado

❌ Logar dados de request que incluem cartão
   → Log entra no CDE (e viola Req. 3 — SAD nos logs)

❌ Passar PAN via URL/query string
   → Aparece em logs de servidor, browser history, referrer headers

❌ Armazenar CVV "temporariamente" em cache/session
   → Proibido absolutamente — qualquer armazenamento de SAD viola PCI

❌ Proxy reverso que termina TLS antes do gateway
   → Seu proxy vê os dados em claro → entra no CDE

❌ Usar gateway não certificado PCI-DSS
   → Responsabilidade cai sobre você
```

---

## 7. Decisão: Qual Abordagem Usar?

```
Tem pagamento online (e-commerce)?
    │
    ▼
Pode usar iFrame/SDK do gateway certificado?
    ├── SIM → Use iFrame ou SDK (menor escopo — SAQ A)
    └── NÃO (necessidade de customização total)
              ↓
        Aceita escopo maior e certificação formal?
            ├── SIM → Gateway API + tokenização (SAQ D ou ROC)
            └── NÃO → Reconsidere o modelo de negócio

Tem pagamento físico (POS)?
    │
    ▼
Usa terminal alugado/gerenciado pelo adquirente?
    ├── SIM → Menor escopo — adquirente cobre o terminal
    └── NÃO (terminal próprio)
              ↓
        Solução P2PE validada pelo PCI SSC?
            ├── SIM → Redução de escopo significativa (SAQ P2PE)
            └── NÃO → Escopo total para o ambiente de terminal
```

---

## Checklist Rápido — Redução de Escopo

- [ ] Estratégia de redução de escopo definida antes de desenvolver
- [ ] iFrame ou SDK do gateway usado (dados de cartão nunca chegam ao seu servidor)
- [ ] Nenhum campo HTML próprio para número de cartão, validade ou CVV
- [ ] Gateway/PSP selecionado é PCI-DSS certificado (solicitar AOC)
- [ ] Token armazenado no banco (não o PAN)
- [ ] Logs do servidor não contêm PAN, CVV ou trilha
- [ ] Para POS: solução P2PE validada pelo PCI SSC (se aplicável)
- [ ] Ambientes de desenvolvimento/staging não usam PANs reais (usar PANs de teste)
- [ ] SAQ adequado ao modelo escolhido confirmado com o adquirente
