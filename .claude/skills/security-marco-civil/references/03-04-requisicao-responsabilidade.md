# Requisição Judicial de Dados — Marco Civil da Internet

> Lei n° 12.965/2014 — Arts. 10°, 22°, 23° | Decreto 8.771/2016 — Art. 13°

---

## 1. Princípio Geral — Só com Ordem Judicial

O Marco Civil é claro:

> **Art. 10°, §1°:** "O provedor responsável pela guarda somente será obrigado a
> disponibilizar os registros [...] mediante ordem judicial."

**Regra de ouro:** registros de conexão, registros de acesso a aplicações e dados pessoais
**NUNCA** devem ser fornecidos a:
- Policiais sem mandado
- Ministério Público sem ordem judicial
- Autoridades administrativas (exceto exceções abaixo)
- Particulares (empresas, advogados)
- Outros usuários

---

## 2. Quem Pode Requerer e Como

### Autoridades com Legitimidade para Requisição

| Autoridade | Base | Tipo de dado que pode obter | Requisito |
|---|---|---|---|
| **Juiz** | Art. 22° MCI | Registros de conexão e aplicação | Ordem judicial fundamentada |
| **Ministério Público** | Art. 22° MCI | Registros de conexão e aplicação | Via representação ao juiz → ordem judicial |
| **Delegado de Polícia** | Lei 12.830/2013 | Dados cadastrais básicos (nome, CPF, endereço) | Requisição administrativa — sem ordem judicial (dados cadastrais apenas) |
| **ANPD** | LGPD art. 55-J | Dados em investigação de conformidade | Intimação administrativa |
| **CPI (Comissão Parlamentar)** | CF art. 58, §3° | Discutido — jurisprudência variada | Deliberação da CPI |

> ⚠️ **Dados cadastrais básicos** (nome, CPF, e-mail, endereço) podem ser fornecidos
> por requisição policial **sem ordem judicial** — entendimento pacificado pelo STJ
> (RHC 131.263/RS). Mas **registros de acesso** exigem ordem judicial mesmo para polícia.

### O que Consta em uma Ordem Judicial Válida

```
Uma ordem judicial para fornecimento de dados deve conter:
□ Número do processo
□ Identificação do juízo competente
□ Fundamento legal (art. 22° Marco Civil + outros)
□ Identificação do alvo (IP, usuário, conta, período)
□ Período dos dados solicitados
□ Prazo para cumprimento
□ Assinatura do juiz
□ Autenticação digital (TRF/TJSP etc.) ou original com carimbo
```

---

## 3. Fluxo Interno de Resposta a Requisição

```
RECEBIMENTO DA REQUISIÇÃO
          │
          ▼
┌─────────────────────────────────┐
│ 1. Registro e triagem           │
│    □ Protocolar com data/hora   │
│    □ Identificar tipo e origem  │
│    □ Verificar prazo de resposta│
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│ 2. Validação jurídica           │
│    □ É ordem judicial válida?   │
│    □ O juízo é competente?      │
│    □ Os dados solicitados estão │
│      dentro do nosso escopo?    │
│    □ O período ainda está na    │
│      janela de retenção?        │
└──────────────┬──────────────────┘
               │
          ┌────┴─────┐
          │          │
       Inválida    Válida
          │          │
          ▼          ▼
    Comunicar    3. Extração
    ao juízo     dos dados
    com          □ Extrair apenas
    justificativa  o solicitado
                 □ Não incluir
                   dados além
                   do pedido
                    │
                    ▼
             4. Sigilo no
             fornecimento
             (art. 23°)
             □ Não notificar
               o investigado
             □ Protocolo sigiloso
                    │
                    ▼
             5. Registro interno
             □ Registrar o
               fornecimento
             □ Guardar cópia da
               ordem judicial
             □ Registrar o que
               foi fornecido
```

---

## 4. Sigilo da Tramitação (art. 23°)

> **Art. 23°:** "Cabe ao juiz tomar as providências necessárias à garantia do sigilo das
> informações recebidas e à preservação da intimidade, da vida privada, da honra e da
> imagem do usuário."

**Implicações práticas:**
- O provedor **não deve notificar o usuário** sobre a ordem judicial (a menos que o juiz determine)
- O processo pode correr em segredo de justiça
- Internamente, o conhecimento da requisição deve ser restrito (necessidade de conhecer)
- Não postar em redes sociais, não comentar em canais públicos da empresa

---

## 5. Preservação de Dados por Ordem Judicial (Freezing)

Em alguns casos, o juiz pode determinar a **preservação preventiva** de dados que seriam
purgados pelo prazo de retenção:

```
Exemplo: dados de acesso com 5 meses (no limite dos 6 meses do Marco Civil)
→ Juiz pode determinar congelamento para investigação em andamento

Procedimento:
□ Receber ordem de preservação
□ Marcar os dados como "em hold jurídico" — suspender purge automático
□ Documentar internamente a ordem e seu escopo
□ Aguardar ordem definitiva de fornecimento ou liberação
□ Não eliminar enquanto hold estiver vigente
```

---

## 6. Prazo de Resposta

O Marco Civil não define prazo fixo — a ordem judicial especifica. Práticas de mercado:

| Urgência | Prazo típico em ordem judicial |
|---|---|
| Urgente / Plantão | 24-48 horas |
| Padrão | 5-15 dias úteis |
| Complexo (muitos dados) | 30 dias |

> O Decreto 8.771/2016 (art. 13°) exige que os provedores mantenham procedimentos internos
> para atendimento de requisições — ter um SLA interno documentado é boa prática.

---

## 7. Transparência Governamental (Decreto 8.771/2016, art. 14°)

Provedores de aplicação com sede ou representação no Brasil são **encorajados** (mas não
obrigados pela lei) a publicar relatórios de transparência com:
- Número de requisições recebidas
- Número de requisições atendidas/recusadas
- Tipos de dados fornecidos
- Autoridades requisitantes (por categoria)

**Referências:** Google Transparency Report, Meta Transparency Center, Apple Law Enforcement Guidelines — modelo internacional que grandes empresas já adotam.

---

## 8. Dados Cadastrais vs. Registros — Distinção Prática

| Dado | Requisição policial (sem judicial) | Ordem judicial |
|---|---|---|
| Nome completo | ✅ | ✅ |
| CPF | ✅ | ✅ |
| E-mail cadastrado | ✅ | ✅ |
| Endereço | ✅ | ✅ |
| Telefone | ✅ | ✅ |
| IP de acesso (log) | ❌ | ✅ |
| Data/hora de login | ❌ | ✅ |
| Histórico de ações | ❌ | ✅ |
| Conteúdo de mensagens | ❌ | ✅ (com restrições constitucionais) |
| Dados financeiros/transações | ❌ | ✅ |

---

## Checklist Rápido — Requisição de Dados

- [ ] Procedimento interno documentado para recebimento de requisições
- [ ] Equipe jurídica ou ponto focal definido para validação de ordens
- [ ] Validação: ordem judicial tem todos os elementos formais necessários
- [ ] Extração de dados limitada ao solicitado (não incluir dados além do pedido)
- [ ] Sigilo mantido — usuário não notificado salvo ordem expressa do juiz
- [ ] Registro interno de toda requisição recebida e respondida
- [ ] Cópia da ordem judicial arquivada
- [ ] Mecanismo de hold/freeze para dados em investigação ativa
- [ ] SLA interno de resposta documentado
- [ ] Dados cadastrais separados dos registros de acesso no sistema (facilita extração proporcional)

---
---

# Responsabilidade por Conteúdo de Terceiros — Marco Civil da Internet

> Lei n° 12.965/2014 — Arts. 17°, 18°, 19°, 21°

---

## 1. O Regime Brasileiro vs. EUA

| País | Regime | Base |
|---|---|---|
| **Brasil** | Responsabilidade após **descumprimento de ordem judicial** | Art. 19° MCI |
| **EUA** | Safe harbor amplo para conteúdo de terceiros | Section 230, CDA |
| **União Europeia** | Safe harbor + obrigações de notice-and-takedown (DSA) | DSA 2022 |

O Brasil adota um **regime intermediário**: provedores **não são responsáveis automaticamente**
por conteúdo de terceiros, mas podem ser responsabilizados se **descumprirem ordem judicial** de remoção.

---

## 2. Responsabilidade de Provedores de Conexão (art. 17°)

> "Ressalvadas as hipóteses previstas nesta Lei, o provedor de conexão à internet não será
> responsabilizado civilmente por danos decorrentes de conteúdo gerado por terceiros."

ISPs têm **isenção ampla** — não são responsáveis pelo que os usuários fazem na internet.

---

## 3. Responsabilidade de Provedores de Aplicação (arts. 18° e 19°)

### Regra Geral (art. 18°)
O provedor de aplicações **não é responsável** por danos causados por conteúdo gerado por terceiros.

### Exceção — Descumprimento de Ordem Judicial (art. 19°)
O provedor **passa a ser responsável** se, após **notificado por ordem judicial**, não tomar
providências para tornar indisponível o conteúdo.

```
Resumo do art. 19°:
1. Usuário A publica conteúdo ofensivo/ilegal na plataforma
2. Usuário B (ou Ministério Público) obtém ORDEM JUDICIAL para remoção
3. Provedor é NOTIFICADO da ordem judicial
4. Provedor tem prazo para REMOVER o conteúdo
5. Se provedor NÃO remover → responsabilidade civil pelos danos
```

> ⚠️ **Notificação extrajudicial (e-mail, carta do advogado)** NÃO gera responsabilidade
> automática para o provedor — exceto em casos específicos (nudez/conteúdo sexual, art. 21°).

### Exceção ao Art. 19° — Conteúdo Sexual Sem Consentimento (art. 21°)

Para **nudez ou atos sexuais de caráter privado** divulgados sem consentimento:
- A responsabilidade do provedor é acionada por **notificação do participante** (não precisa de ordem judicial)
- Prazo para remoção após notificação: **não especificado** — "de forma diligente"
- Cobre: revenge porn, deepfakes íntimos, vazamento de fotos privadas

---

## 4. Conteúdo que Deve Ser Removido com Ordem Judicial

| Tipo de Conteúdo | Regime |
|---|---|
| Discurso de ódio | Ordem judicial → remoção obrigatória |
| Difamação/calúnia | Ordem judicial → remoção obrigatória |
| Conteúdo ilegal (drogas, armas) | Ordem judicial → remoção obrigatória |
| Violação de direitos autorais | Notificação (DMCA-like) — legislação específica |
| Nudez sem consentimento | Notificação do participante já obriga remoção (art. 21°) |
| CSAM (conteúdo de abuso sexual infantil) | Remoção imediata — sem necessidade de ordem — obrigação legal (ECA) |

---

## 5. Procedimento de Remoção de Conteúdo

```
RECEBIMENTO DE SOLICITAÇÃO DE REMOÇÃO
              │
    ┌─────────┴─────────┐
    │                   │
  Extrajudicial      Ordem
  (e-mail, carta)    Judicial
    │                   │
    ▼                   ▼
Verificar se é       Validar a
nudez/conteúdo       ordem judicial
sexual s/ consent.   (elementos formais)
    │                   │
  ┌─┴──┐              ┌─┴──┐
  │    │              │    │
 Sim  Não           Válida Inválida
  │    │              │       │
  ▼    ▼              ▼       ▼
Remover Registrar  Remover  Comunicar
(art.21) e aguardar no prazo  ao juízo
          ordem    determinado
          judicial
```

---

## 6. Conteúdo de Crianças e Adolescentes — Regime Especial

O ECA (Lei 8.069/1990) e a Lei 13.431/2017 impõem obrigações adicionais:
- CSAM (imagens de abuso sexual infantil): **remoção imediata e obrigatória**, independente de ordem judicial
- Denúncia às autoridades competentes (Polícia Federal, SaferNet, NCMEC)
- Provedores que operam no Brasil devem reportar ao **Ministério da Justiça**

---

## Checklist Rápido — Responsabilidade por Conteúdo

- [ ] Política de conteúdo proibido clara e pública (Terms of Service)
- [ ] Canal de denúncia de conteúdo impróprio para usuários
- [ ] Procedimento documentado para ordens judiciais de remoção
- [ ] Procedimento para notificações de nudez sem consentimento (art. 21°)
- [ ] Remoção imediata de CSAM com denúncia automática às autoridades
- [ ] SLA de resposta a ordens judiciais de remoção documentado
- [ ] Registro interno de solicitações de remoção recebidas e ações tomadas
- [ ] Equipe de Trust & Safety ou ponto focal para moderação de conteúdo
