# Análise Interna — Time SbD

> Documento de uso interno — não destinado ao cliente diretamente.

---

## 1. Estrutura da Análise Interna

Após coletar informações e analisar todas as dimensões (refs. 01 a 05), consolidar em:

```
ANÁLISE INTERNA DE MCP
═══════════════════════════════════════════════════════════

MCP Avaliado:        [nome + versão]
Data da Análise:     [data]
Analista(s):         [nome(s)]
Solicitante:         [cliente + área]
Versão do Documento: 1.0

───────────────────────────────────────────────────────────
1. RESUMO EXECUTIVO INTERNO
───────────────────────────────────────────────────────────
[2-4 frases: o que é o MCP, qual risco principal identificado,
qual o veredicto e por quê]

───────────────────────────────────────────────────────────
2. INFORMAÇÕES DO MCP
───────────────────────────────────────────────────────────
Publisher:           [nome + tipo: oficial/terceiro/desconhecido]
Repositório:         [URL]
Versão analisada:    [versão]
Último commit:       [data]
Licença:             [MIT/Apache/proprietária/etc.]
Linguagem:           [Node.js/Python/Go/etc.]

───────────────────────────────────────────────────────────
3. CAPABILITIES MAPEADAS
───────────────────────────────────────────────────────────
| Tool/Capability     | Acesso          | Risco Inerente |
|---------------------|-----------------|----------------|
| [tool_name]         | [o que acessa]  | 🔴/🟠/🟡/🟢   |
| ...                 | ...             | ...            |

───────────────────────────────────────────────────────────
4. ACHADOS DE SEGURANÇA
───────────────────────────────────────────────────────────
[Para cada achado:]

[ID] [SEVERIDADE] — [TÍTULO CURTO]
Descrição: [o que foi encontrado]
Evidência: [onde no código/docs/comportamento]
Impacto:   [o que pode acontecer se explorado]
Mitigação: [o que o cliente ou publisher deve fazer]

───────────────────────────────────────────────────────────
5. MATRIZ DE RISCO CONSOLIDADA
───────────────────────────────────────────────────────────
| Dimensão              | Classificação  | Justificativa         |
|-----------------------|----------------|-----------------------|
| Superfície de ataque  | 🔴/🟠/🟡/🟢  | [breve justificativa] |
| Autenticação/Confiança| 🔴/🟠/🟡/🟢  | [breve justificativa] |
| Fluxo de dados/LGPD   | 🔴/🟠/🟡/🟢  | [breve justificativa] |
| Supply chain/CVEs     | 🔴/🟠/🟡/🟢  | [breve justificativa] |
| Publisher             | 🔴/🟠/🟡/🟢  | [breve justificativa] |

RISCO GERAL: 🔴 CRÍTICO / 🟠 ALTO / 🟡 MÉDIO / 🟢 BAIXO

───────────────────────────────────────────────────────────
6. VEREDICTO INTERNO
───────────────────────────────────────────────────────────
[ ] REPROVAR — não liberar. Motivo: [...]
[ ] APROVAR COM REMEDIAÇÕES OBRIGATÓRIAS — liberar apenas após:
    - [ação 1]
    - [ação 2]
[ ] APROVAR COM RESSALVAS — liberar com monitoramento:
    - [ressalva 1]
[ ] APROVAR — liberar com condições padrão

───────────────────────────────────────────────────────────
7. CONDIÇÕES PADRÃO DE APROVAÇÃO (quando aplicável)
───────────────────────────────────────────────────────────
Independente do veredicto, se aprovado com qualquer nível:

□ Monitorar releases do MCP — reavaliar a cada versão major
□ Revogar acesso imediatamente se CVE crítico publicado
□ Cliente deve assinar termo de ciência de riscos
□ Revisar em 6 meses ou após mudança significativa de escopo
□ [condições específicas deste MCP]

───────────────────────────────────────────────────────────
8. REFERÊNCIAS E EVIDÊNCIAS
───────────────────────────────────────────────────────────
[Links, screenshots de issues, output de npm audit, etc.]
```

---

## 2. Classificação do Risco Geral

**Regra de elevação:** o risco geral é o **maior risco individual** encontrado nas dimensões,
exceto quando há múltiplos riscos MÉDIO que juntos justificam elevar para ALTO.

```
Se qualquer dimensão for CRÍTICO → Risco Geral = CRÍTICO
Se qualquer dimensão for ALTO    → Risco Geral = ALTO (mínimo)
Se 3+ dimensões forem MÉDIO      → Considerar elevar para ALTO
Caso contrário                   → Média ponderada das dimensões
```

---
---

# Template de Parecer Técnico — Cliente

> Documento formal para apresentar ao cliente. Linguagem clara, sem jargão excessivo,
> com veredicto inequívoco e condições bem definidas.

---

## 3. Template do Parecer Técnico

```markdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PARECER TÉCNICO DE SEGURANÇA — MCP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MCP Avaliado:    [Nome do MCP] v[versão]
Finalidade:      [Para que o cliente quer usar]
Data:            [data]
Elaborado por:   [Nome / Time de Security by Design — VOLL]
Destinatário:    [Cliente / Área]
Classificação:   [Uso Interno / Confidencial]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. OBJETIVO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Este documento apresenta a avaliação técnica de segurança do MCP
[Nome], solicitado por [cliente/área] para uso em [contexto de uso].
A avaliação segue o framework de Security by Design aplicado a
integrações de Model Context Protocol (MCP).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. DESCRIÇÃO DO MCP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Nome] é um MCP desenvolvido por [publisher] que permite a agentes
de IA [descrição funcional em linguagem de negócio].

Versão avaliada:  [versão]
Publicado por:    [publisher — oficial do produto / terceiro]
Repositório:      [URL ou "código proprietário"]
Última atualização: [data]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PERMISSÕES E ACESSOS SOLICITADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
O MCP solicita as seguintes permissões para operar:

[Listar em linguagem clara, sem termos técnicos de API:]
• Leitura de [recurso] — para [finalidade]
• Criação de [recurso] — para [finalidade]
• Envio de [ação] em nome do usuário — para [finalidade]

[Se houver permissão excessiva:]
⚠️  Atenção: o MCP também solicita permissão para [ação], que
não é necessária para a finalidade declarada. Recomendamos
[ação específica].

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. ANÁLISE DE RISCOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Para cada risco relevante — máximo 5, do mais ao menos grave:]

RISCO [N] — [TÍTULO] [🔴/🟠/🟡/🟢]
Descrição: [o que pode acontecer, em linguagem de negócio]
Probabilidade: [Alta / Média / Baixa]
Impacto: [Alto / Médio / Baixo]
Mitigação recomendada: [o que fazer]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. CONFORMIDADE REGULATÓRIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Incluir apenas as seções aplicáveis:]

LGPD (Lei 13.709/2018):
[✅ Em conformidade / ⚠️ Atenção necessária / 🔴 Risco de não-conformidade]
[Descrição do status e ação necessária]

PCI-DSS [se aplicável]:
[status e ação]

Marco Civil da Internet [se aplicável]:
[status e ação]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. VEREDICTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────┐
│                                                     │
│   🔴 REPROVADO                                      │
│   🟠 APROVADO COM CONDIÇÕES OBRIGATÓRIAS            │
│   🟡 APROVADO COM RESSALVAS                         │
│   🟢 APROVADO                                       │
│                                                     │
│   [Marcar apenas um]                                │
└─────────────────────────────────────────────────────┘

[Justificativa do veredicto em 2-3 frases objetivas]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. CONDIÇÕES [se aprovado com condições]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A liberação do MCP está condicionada ao cumprimento de:

CONDIÇÕES OBRIGATÓRIAS (devem ser atendidas antes do uso):
□ [condição 1 — responsável — prazo]
□ [condição 2 — responsável — prazo]

CONDIÇÕES DE MONITORAMENTO (devem ser mantidas durante o uso):
□ [condição 1]
□ [condição 2]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. RECOMENDAÇÕES GERAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Independente do veredicto, recomendamos:

• Monitorar atualizações do MCP e reavaliar a cada versão major
• Revogar o acesso imediatamente em caso de incidente de segurança
  envolvendo o publisher ou o MCP
• Revisar este parecer em [prazo — geralmente 6 meses]
• [recomendação específica deste MCP]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. VALIDADE E REVISÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Este parecer é válido para a versão [versão] avaliada na data
[data]. Novas versões do MCP devem ser reavaliadas.

Este parecer caduca automaticamente em [data + 6 meses] ou
antes, caso ocorra:
• Publicação de CVE crítico ou alto no MCP ou suas dependências
• Mudança de publisher ou transferência de propriedade
• Alteração significativa nas permissões solicitadas
• Incidente de segurança envolvendo o publisher

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Elaborado por: _______________________ Data: ___/___/____
[Nome / Cargo / Time SbD]

Aprovado por:  _______________________ Data: ___/___/____
[Nome / Cargo]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 4. Exemplos de Veredicto por Perfil de Risco

### Perfil A — MCP de Ferramenta de Criação/Produtividade (publisher oficial, sem dados pessoais)

```
Veredicto esperado: 🟡 APROVADO COM RESSALVAS

Características típicas:
✅ Publisher oficial e verificável do produto
✅ Não processa dados pessoais de usuários — processa artefatos (arquivos, documentos)
⚠️  Acesso a filesystem do usuário (arquivos locais)
⚠️  Autenticação via token OAuth — escopo a verificar
⚠️  Dados processados pela infraestrutura do publisher (possivelmente fora do Brasil)

Condição típica: verificar se os artefatos processados contêm dados pessoais embutidos
```

### Perfil B — MCP de Automação/Integração com Dependências Desatualizadas

```
Veredicto esperado: 🟠 APROVADO COM CONDIÇÕES OBRIGATÓRIAS ou 🔴 REPROVADO

Características típicas:
🔴 CVEs conhecidos em versão em uso
🔴 Capability de executar ações arbitrárias (workflows, scripts, chamadas HTTP livres)
🟠 Acesso a credenciais de sistemas integrados
🟠 Sem allowlist de destinos de chamadas externas

Condição obrigatória: versão sem CVEs críticos/altos antes de qualquer aprovação
Condição adicional: restringir capabilities ao mínimo necessário para o caso de uso
```

### Perfil C — MCP de Acesso a Dados com Escopo Irrestrito

```
Veredicto esperado: 🔴 REPROVADO (sem mitigação) ou 🟠 com mitigação forte

Características típicas:
🔴 Capability de query/leitura sem restrição de escopo (tabelas, coleções, índices)
🔴 LLM pode ser induzido a gerar operações destrutivas (prompt injection)
🔴 Dados pessoais acessíveis — LGPD aplicável
🔴 Sem controle granular de quais operações são permitidas

Condição para reconsiderar:
  - Usuário de banco read-only, sem DROP/DELETE/TRUNCATE
  - Allowlist de tabelas/collections acessíveis
  - Sanitização de queries geradas pelo LLM antes de execução
```

### Perfil D — MCP de Publisher Desconhecido com Capabilities Elevadas

```
Veredicto esperado: 🔴 REPROVADO até revisão completa de código

Características típicas:
🔴 Publisher sem histórico verificável
🔴 Capabilities de alto risco (filesystem write, shell, credenciais)
🔴 Sem SECURITY.md ou canal de disclosure
🔴 Código não revisado por comunidade (baixo número de stars/forks/issues)

Ação: revisão linha a linha do código-fonte antes de qualquer aprovação
      Reprovar imediatamente se encontrado networking não documentado ou eval/exec
```

---

## 5. Checklist Final Antes de Emitir o Parecer

```
Análise interna completa:
□ Coleta de informações executada (ref. 01)
□ Superfície de ataque mapeada (ref. 02)
□ Autenticação e confiança avaliadas (ref. 03)
□ Fluxo de dados e LGPD verificados (ref. 04)
□ Supply chain e CVEs verificados (ref. 05)
□ Skills de domínio consultadas quando aplicável
□ Achados documentados com evidências
□ Risco geral classificado com justificativa

Parecer para cliente:
□ Linguagem clara — sem jargão técnico excessivo
□ Permissões explicadas em termos de negócio
□ Veredicto inequívoco (uma única opção marcada)
□ Condições específicas, mensuráveis e com responsável
□ Data de validade e gatilhos de re-avaliação definidos
□ Revisão por segundo analista antes de emitir
```
