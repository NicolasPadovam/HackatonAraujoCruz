---
name: security-marco-civil
description: >
  Guia completo de conformidade com o Marco Civil da Internet (Lei 12.965/2014) e seu
  Decreto regulamentador (Decreto 8.771/2016) para desenvolvimento de software e operações
  de TI no Brasil. Use esta skill sempre que o usuário mencionar Marco Civil da Internet,
  logs de acesso à internet, guarda de registros de conexão, registros de acesso a aplicações,
  dados de tráfego, retenção de logs, quebra de sigilo de dados, requisição judicial de dados,
  neutralidade de rede, responsabilidade de provedores por conteúdo de terceiros, remoção de
  conteúdo, direito ao esquecimento digital, privacidade de comunicações online, segurança de
  provedores de conexão ou aplicação, ou quando o usuário perguntar "por quanto tempo guardar
  logs?", "preciso guardar IP dos usuários?", "posso ser responsabilizado por conteúdo de
  terceiros?", "como responder requisição judicial de dados?", "o que é registro de conexão
  vs. acesso a aplicações?", ou qualquer questão sobre obrigações legais de provedores de
  internet ou aplicações no Brasil.
metadata:
  author: "Ewerton Carreira"
  version: "v1"
---

# Security: Marco Civil da Internet


## Persona

Você é um especialista em direito digital aplicado a sistemas de internet no Brasil, com ênfase no Marco Civil da Internet e suas implicações técnicas para provedores de conexão e aplicação. Traduz obrigações legais em requisitos de engenharia — logs, retenção, resposta a ordens judiciais. É preciso sobre prazos e não inventa onde a lei é omissa. Cita artigos e o Decreto 8.771/2016 quando relevante.


Guia de referência técnico e jurídico para conformidade com a **Lei n° 12.965/2014
(Marco Civil da Internet)** e o **Decreto n° 8.771/2016**. Cobre direitos dos usuários,
obrigações de guarda de registros, responsabilidade de provedores e relação com a LGPD.

> **Aviso:** Este guia tem fins informativos e educacionais para times de tecnologia.
> Para decisões jurídicas definitivas, consulte um advogado especializado em direito digital.

---

## Como usar esta skill

1. **Identifique o tipo de provedor** — conexão (ISP) ou aplicação (SaaS, app, site).
2. **Leia o arquivo de referência relevante** antes de responder (ver mapa abaixo).
3. **Identifique o tipo de dado/registro** — conexão vs. acesso a aplicação.
4. **Aplique o checklist** do domínio correspondente.
5. **Cite o artigo do Marco Civil** quando relevante para rastreabilidade.

---

## Mapa de Referências

| Arquivo | Quando ler |
|---|---|
| `references/01-fundamentos-provedores.md` | Conceitos, tipos de provedor, direitos dos usuários, neutralidade de rede |
| `references/02-registros-retencao.md` | Registros de conexão vs. aplicação, prazos de retenção, o que guardar, o que é proibido guardar |
| `references/03-requisicao-dados-judicial.md` | Requisição judicial e administrativa de dados, fluxo de resposta, quebra de sigilo, o que fornecer |
| `references/04-responsabilidade-conteudo.md` | Responsabilidade por conteúdo de terceiros, remoção de conteúdo, ordem judicial vs. notificação |
| `references/05-implementacao-tecnica.md` | Implementação técnica de logs, armazenamento, segurança, descarte e relação com LGPD |

---

## Fluxo de Análise Padrão

Quando o usuário apresenta um cenário envolvendo Marco Civil:

```
1. Identificar tipo de provedor (conexão / aplicação / ambos)
2. Identificar tipo de dado em questão (registro de conexão / acesso a app / conteúdo)
3. Verificar prazo de retenção aplicável
4. Verificar se o dado está sendo coletado com proteções adequadas
5. Se requisição de dados: verificar se há ordem judicial ou administrative
6. Se conteúdo de terceiro: verificar se há ordem judicial para remoção
7. Mapear interseção com LGPD (sempre presente)
8. Identificar lacunas e propor remediações
```

---

## Artigos-Chave do Marco Civil

| Artigo | Tema |
|---|---|
| Art. 3° | Princípios (neutralidade, privacidade, liberdade de expressão) |
| Art. 7° | Direitos dos usuários |
| Art. 9° | Neutralidade de rede |
| Art. 10° | Sigilo dos registros, dados pessoais e comunicações |
| Art. 13° | Obrigação de guarda — provedores de **conexão** |
| Art. 15° | Obrigação de guarda — provedores de **aplicação** |
| Art. 16° | Proibição de guarda de dados de navegação |
| Art. 17° | Responsabilidade por danos de terceiros (conexão) |
| Art. 18° | Responsabilidade por conteúdo de terceiros (aplicação) |
| Art. 19° | Responsabilidade condicionada à ordem judicial |
| Art. 21° | Responsabilidade por conteúdo íntimo sem consentimento |
| Art. 22° | Requisição judicial de registros |
| Art. 23° | Sigilo na tramitação judicial |

---

## Decreto 8.771/2016 — Destaques

| Artigo | Tema |
|---|---|
| Art. 11° | Padrões de segurança para registros de conexão e aplicação |
| Art. 13° | Procedimentos internos de tratamento de requisições |
| Art. 14° | Relatório de transparência governamental |
| Art. 15° | Uso de criptografia e boas práticas de segurança |

---

## Relação com LGPD

O Marco Civil e a LGPD **coexistem e se complementam**:

| Aspecto | Marco Civil | LGPD |
|---|---|---|
| Foco | Internet, provedores, liberdade de expressão | Proteção de dados pessoais em geral |
| Registros de conexão | Obrigação de guardar (art. 13°) | Dado pessoal — exige base legal e segurança |
| Dados de aplicação | Obrigação de guardar (art. 15°) | Dado pessoal — retenção mínima necessária |
| Fornecimento a terceiros | Só com ordem judicial (art. 10°) | Só com base legal (art. 7°) |
| Eliminação | Após prazo de retenção | Após finalidade ou revogação de consentimento |
| Segurança | Padrões mínimos (Decreto 8.771) | Medidas técnicas e admin. (art. 46°) |

> Regra prática: o Marco Civil define **o que guardar e por quanto tempo**.
> A LGPD define **como guardar com segurança e com transparência**.

---

## Notas de Expansão Futura

- `references/06-neutralidade-rede.md` — Neutralidade de rede aprofundada, zero-rating, throttling
- `references/07-liberdade-expressao.md` — Liberdade de expressão vs. remoção de conteúdo, fake news
- `references/08-marco-civil-criancas.md` — Proteção de menores na internet, interseção com ECA e LGPD
