# Fundamentos e Escopo — PCI-DSS v4.0

> PCI-DSS v4.0 — Req. 1, 2 | Glossário PCI SSC

---

## 1. O que é PCI-DSS

O **Payment Card Industry Data Security Standard** é um conjunto de requisitos de segurança
criado pelo **PCI SSC** (Security Standards Council), formado pelas principais bandeiras:
Visa, Mastercard, American Express, Discover e JCB.

**Objetivo:** proteger dados de cartão de pagamento contra compromisso e fraude.

**Quem deve seguir:** qualquer entidade que **armazene, processe ou transmita** dados de
portador de cartão (CHD) ou autenticação sensível (SAD) — independente de tamanho ou volume.

---

## 2. Tipos de Dados e Restrições

### Cardholder Data (CHD)

| Dado | Pode armazenar? | Se armazenar: |
|---|---|---|
| **PAN** (número do cartão) | ✅ Sim, se necessário | Tornar ilegível (criptografia, truncamento, tokenização) |
| **Nome do portador** | ✅ Sim | Proteger com controles de acesso |
| **Data de validade** | ✅ Sim | Proteger com controles de acesso |
| **Código de serviço** | ✅ Sim | Proteger com controles de acesso |

### Sensitive Authentication Data (SAD) — NUNCA armazenar após autorização

| Dado | Armazenamento | Observação |
|---|---|---|
| **Track 1 / Track 2** (dados completos da trilha) | ❌ PROIBIDO | Contém todos os dados do cartão; regra absoluta |
| **CAV2 / CVC2 / CVV2 / CID** (código de segurança) | ❌ PROIBIDO | Mesmo se criptografado — proibido armazenar |
| **PIN / PIN block** | ❌ PROIBIDO | Mesmo se criptografado |

> ⚠️ **CVV é proibido mesmo criptografado.** Não há exceção. Perguntar ao usuário
> o CVV, processar e descartar imediatamente é o único fluxo permitido.
> Qualquer armazenamento, mesmo temporário em log, é violação PCI.

---

## 3. Mascaramento do PAN (Req. 3.3.1)

Quando o PAN precisa ser exibido (recibo, tela de confirmação):

```
Número real:  4111 1111 1111 1111
Truncado:     XXXX XXXX XXXX 1111   ← apenas últimos 4 (padrão mínimo)
Mascarado:    411111XXXXXX1111       ← primeiros 6 + últimos 4 (formato BIN)
```

- **Regra:** exibir no máximo os **primeiros 6 e últimos 4 dígitos**
- Nunca exibir PAN completo em tela, log, e-mail ou relatório
- Em logs: **NUNCA registrar PAN** — nem mascarado, idealmente

---

## 4. Ecossistema de Pagamento — Atores

```
┌──────────┐    ①    ┌──────────┐    ②    ┌──────────────┐
│ Portador │─────────▶│Merchant  │─────────▶│   Gateway /  │
│ de Cartão│         │(Lojista) │         │   PSP        │
└──────────┘         └──────────┘         └──────┬───────┘
                                                  │ ③
                                                  ▼
┌──────────┐    ⑥    ┌──────────┐    ④    ┌──────────────┐
│  Emissor │◀────────│ Bandeira │◀────────│  Adquirente  │
│ (banco   │         │(Visa/MC) │    ⑤    │  (banco do   │
│ do cart.)│─────────▶          │─────────▶   lojista)   │
└──────────┘         └──────────┘         └──────────────┘

① Portador apresenta cartão
② Merchant envia dados ao gateway
③ Gateway repassa à adquirente
④ Adquirente envia à bandeira
⑤ Bandeira encaminha ao emissor
⑥ Emissor aprova/recusa → resposta volta pelo mesmo caminho
```

| Ator | Papel | Escopo PCI |
|---|---|---|
| **Merchant (lojista)** | Aceita pagamentos com cartão | Alto — principal responsável pela experiência |
| **Gateway/PSP** | Processa transações entre merchant e adquirente | Muito alto — toca dados em trânsito |
| **Adquirente** | Banco/processadora do lojista | Alto — certificação própria |
| **Bandeira** | Define regras e intermedia | Define os requisitos PCI |
| **Emissor** | Banco do portador do cartão | Alto — certificação própria |
| **Sub-processador** | Fornecedor de serviços para os atores acima | Pode estar no escopo do merchant |

---

## 5. O que é o CDE (Cardholder Data Environment)

O **CDE** é o ambiente que armazena, processa ou transmite CHD/SAD, incluindo:
- Sistemas que armazenam dados de cartão
- Sistemas que processam transações
- Redes que transmitem dados de cartão
- **Sistemas conectados ao CDE** (mesmo que não toquem dados de cartão)

> ⚠️ Sistemas conectados ao CDE entram no escopo PCI, mesmo sem tocar dados de cartão.
> Um servidor de logs que recebe logs do CDE está no escopo. Um servidor de autenticação
> que valida acesso ao CDE está no escopo.

### Componentes Típicos do CDE

```
DENTRO DO CDE (in-scope):
✓ Servidor de aplicação de checkout
✓ Banco de dados de transações
✓ Servidor de chaves de criptografia (HSM)
✓ Terminal de ponto de venda (POS)
✓ Gateway de pagamento próprio
✓ Servidor de logs do CDE
✓ Servidor de autenticação que acessa CDE
✓ Jump server para acesso ao CDE

FORA DO CDE (out-of-scope) — se adequadamente segmentado:
✗ Servidor de aplicação de catálogo (sem checkout)
✗ CRM sem dados de cartão
✗ Sistemas de BI com dados anonimizados
✗ Infraestrutura de escritório
```

---

## 6. Níveis de Merchant e Volume de Transações

As bandeiras definem níveis com base no volume anual de transações:

### Visa / Mastercard

| Nível | Volume anual | Requisito |
|---|---|---|
| **Nível 1** | > 6 milhões de transações | ROC anual por QSA + scan trimestral ASV |
| **Nível 2** | 1–6 milhões | SAQ anual + scan trimestral ASV |
| **Nível 3** | 20.000–1 milhão (e-commerce) | SAQ anual + scan trimestral ASV |
| **Nível 4** | < 20.000 (e-commerce) ou < 1 milhão (outros) | SAQ anual + scan (recomendado) |

> Volumes e classificações podem variar por bandeira e por adquirente.
> Confirme sempre com seu banco adquirente.

---

## 7. Responsabilidade Compartilhada

Quando usando provedores de cloud ou SaaS no CDE:

```
Provedor Cloud (AWS/GCP/Azure):
  ✅ Segurança física do datacenter (Req. 9)
  ✅ Hypervisor e infraestrutura base
  ❌ NÃO cobre: configuração de instâncias, acesso de usuários, dados

Merchant/Desenvolvedor:
  ✅ Configuração segura de instâncias (Req. 2)
  ✅ Controles de acesso lógico (Req. 7, 8)
  ✅ Criptografia de dados (Req. 3, 4)
  ✅ Monitoramento e logs (Req. 10)
  ✅ Desenvolvimento seguro (Req. 6)
```

Os provedores cloud emitem **Attestations of Compliance (AOC)** para seus serviços —
solicitar e manter cópia é requisito PCI (Req. 12.8).

---

## Checklist Rápido — Fundamentos e Escopo

- [ ] Identificado quais dados de cartão o sistema toca (CHD vs. SAD)
- [ ] SAD nunca armazenado — nem CVV, nem trilha completa
- [ ] PAN exibido apenas com mascaramento (primeiros 6 + últimos 4)
- [ ] CDE mapeado com lista de todos os componentes in-scope
- [ ] Atores do ecossistema identificados (gateway, adquirente, bandeiras)
- [ ] Nível de merchant confirmado com o banco adquirente
- [ ] Responsabilidade compartilhada com provedores cloud documentada
- [ ] AOC de provedores de serviço no CDE obtidas e arquivadas
