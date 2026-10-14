# Autenticação e Cadeia de Confiança — Análise de MCP

> PCI-DSS Req. 8 · LGPD art. 46° · OWASP A07

---

## 1. Como o MCP Autentica — Modos Possíveis

| Modo | Risco | O que verificar |
|---|---|---|
| **Sem autenticação** | 🔴 Crítico | Qualquer processo local pode invocar o MCP? Isolamento de processo? |
| **API Key estática** | 🟠 Alto | Onde a key é armazenada? Em plaintext no config? Rotação possível? |
| **OAuth 2.0 com escopos** | 🟡 Médio | Escopos são mínimos necessários? Token armazenado com segurança? Refresh token expira? |
| **mTLS (certificados mútuos)** | 🟢 Baixo | Certificados válidos? Rotação documentada? |
| **Token efêmero por sessão** | 🟢 Baixo | TTL adequado? Revogação possível? |

---

## 2. Armazenamento de Credenciais pelo MCP

```
Verificar no código/docs onde o MCP armazena credentials:

❌ Problemático:
  - Credenciais em arquivo de configuração plaintext (config.json, .env commitado)
  - Credenciais em variáveis de ambiente sem proteção adicional
  - Credenciais hardcoded no código
  - Credenciais em logs de debug

✅ Aceitável:
  - Uso do keychain do SO (macOS Keychain, Windows Credential Manager)
  - Integração com vault (HashiCorp Vault, AWS Secrets Manager)
  - Variáveis de ambiente (sem commit) com instrução explícita ao usuário
  - Token OAuth com escopo mínimo e revogação simples
```

---

## 3. Cadeia de Confiança do Publisher

A pergunta central: **"Por que devo confiar que este MCP faz o que diz?"**

```
NÍVEL 1 — Publisher oficial do produto
  Exemplo: MCP do Slack publicado pela Slack Inc.
  Verificar: é o repositório oficial? (checar org GitHub, domínio, assinaturas)
  Risco base: Baixo — mas ainda verificar permissões e código

NÍVEL 2 — Publisher conhecido e reputado (não o dono do produto)
  Exemplo: MCP para Jira publicado por empresa de ferramentas DevOps conhecida
  Verificar: histórico da empresa, outros projetos, responsividade a issues
  Risco base: Médio — due diligence mais aprofundada necessária

NÍVEL 3 — Publisher pessoa física com histórico verificável
  Exemplo: dev com histórico público, outros projetos, perfil ativo
  Verificar: atividade no GitHub, contribuições, issues respondidas
  Risco base: Médio-Alto — código aberto facilita revisão

NÍVEL 4 — Publisher desconhecido ou anônimo
  Exemplo: MCP publicado há 2 semanas por conta nova sem histórico
  Verificar: código linha a linha antes de qualquer aprovação
  Risco base: Alto — assumir risco elevado até prova em contrário
```

---

## 4. Revogação e Gestão de Acesso

```
□ É possível revogar o acesso do MCP sem reinstalar?
□ Tokens/chaves têm expiração configurável?
□ Há log de quando o MCP foi usado e por quem?
□ Ao desinstalar o MCP, as credenciais são removidas?
□ Em caso de comprometimento: qual o plano de resposta?
   (revogar token, qual impacto, como detectar uso indevido?)
```

---

## 5. Checklist — Autenticação e Confiança

```
□ Modo de autenticação identificado e avaliado
□ Armazenamento de credenciais seguro (não plaintext, não hardcoded)
□ Nível de confiança do publisher classificado (1 a 4)
□ Publisher verificado como legítimo (não typosquatting, não imitação)
□ Escopos OAuth mínimos e proporcionais à função
□ Mecanismo de revogação de acesso existente e documentado
□ Tokens com TTL e expiração adequados
```

---
---

# Fluxo de Dados e Privacidade — Análise de MCP

> LGPD arts. 5°, 6°, 46° · Marco Civil art. 10° · PCI-DSS Req. 3, 4

---

## 6. Mapeamento do Fluxo de Dados

Para cada tool do MCP, mapear:

```
ENTRADA: o que chega ao MCP?
  - Parâmetros enviados pelo LLM/agente
  - Dados do ambiente local (arquivos, variáveis, banco)
  - Dados de APIs conectadas

PROCESSAMENTO: o que o MCP faz com os dados?
  - Transforma? Armazena temporariamente? Loga?

SAÍDA: para onde os dados vão?
  - Retorna ao LLM (contexto da conversa)
  - Envia para API externa do publisher
  - Armazena localmente
  - Envia para serviços de telemetria/analytics
```

**Perguntas críticas:**
```
□ O MCP envia qualquer dado para servidores do publisher ou terceiros?
□ Há telemetria, analytics ou logging remoto?
□ Os dados processados passam por infraestrutura fora do ambiente do cliente?
□ Se sim: onde estão os servidores? (país, provedor, certificações)
□ O publisher tem política de privacidade que cobre esses dados?
□ Os dados são usados para treinar modelos? (prática de alguns SaaS)
```

---

## 7. Classificação dos Dados em Trânsito

Identificar a sensibilidade dos dados que o MCP processa:

| Categoria | Exemplos | Framework aplicável | Ação |
|---|---|---|---|
| Dados pessoais | Nome, e-mail, CPF, endereço | **LGPD** | Consultar `security-lgpd` |
| Dados sensíveis | Saúde, biometria, religião, raça | **LGPD art. 11°** | Consultar `security-lgpd` — base legal restrita |
| Dados de cartão | PAN, CVV, trilha | **PCI-DSS** | Consultar `security-pci-dss` — proibido em muitos casos |
| Segredos/credenciais | Senhas, API keys, tokens | **Qualquer** | Risco crítico — ver ref. 03 |
| Dados de negócio confidenciais | Contratos, preços, estratégia | **Contratual** | Verificar NDA e ToS do MCP |
| Dados públicos/não sensíveis | Configs genéricas, templates | — | Risco baixo |

---

## 8. Transmissão de Dados — Segurança em Trânsito

```
Se o MCP faz chamadas HTTP para serviços externos:

□ TLS 1.2+ obrigatório em todas as chamadas externas
□ Verificação de certificado não desabilitada no código
□ Dados sensíveis nunca em query parameters (ficam em logs de servidor)
□ Autenticação nas APIs externas via header Authorization (não URL)
□ Timeout configurado para chamadas externas (evitar hanging)
□ Retry com backoff — não vazar dados em tentativas excessivas
```

---

## 9. LGPD e MCPs — Quando Aplicar

Consultar `security-lgpd` em profundidade se:

```
O MCP acessa dados de usuários identificados ou identificáveis
  → Identificar base legal para o tratamento
  → Verificar se o publisher é operador (precisa de DPA)
  → Verificar se dados saem do Brasil (transferência internacional)

O MCP envia dados para servidores do publisher
  → Publisher vira operador sob a LGPD
  → Verificar termos de serviço e política de privacidade do publisher
  → Verificar se há DPA disponível para assinar

O MCP processa dados de categorias sensíveis
  → Base legal restrita (art. 11°)
  → Medidas de segurança reforçadas obrigatórias
```

---

## 10. Checklist — Fluxo de Dados e Privacidade

```
□ Fluxo de dados mapeado: entrada → processamento → saída para cada tool
□ Identificado se dados saem do ambiente do cliente
□ Classificação de sensibilidade dos dados processados
□ Telemetria/analytics remoto identificado e avaliado
□ TLS verificado em todas as chamadas externas
□ LGPD aplicada se dados pessoais presentes
□ PCI-DSS verificado se dados de cartão possíveis
□ ToS e Política de Privacidade do publisher revisados
□ Servidores do publisher localizados (país/região)
```

---
---

# Supply Chain e Vulnerabilidades — Análise de MCP

> OWASP A06:2021 · CVE/NVD · CWE-1104

---

## 11. Análise de Dependências

MCPs têm dependências — que podem ter CVEs mesmo que o MCP em si seja seguro.

```bash
# Para MCPs em Node.js
npm audit --audit-level=high
npx snyk test

# Para MCPs em Python
pip-audit
safety check

# Para MCPs em Go
govulncheck ./...

# Verificação manual em bases de CVE
# https://nvd.nist.gov/vuln/search
# https://osv.dev/
# https://github.com/advisories
# https://snyk.io/advisor/
```

### O que Fazer com os Resultados

```
CVE CRÍTICO (CVSS ≥ 9.0):
  → Risco CRÍTICO imediato
  → Verificar se há versão corrigida
  → Se sem correção: REPROVAR

CVE ALTO (CVSS 7.0–8.9):
  → Risco ALTO
  → Verificar se a vulnerability é exploitável no contexto de uso
  → Verificar prazo de correção do publisher
  → Recomendar aguardar versão corrigida

CVE MÉDIO (CVSS 4.0–6.9):
  → Risco MÉDIO
  → Avaliar contexto de uso
  → Recomendar atualização e monitoramento

CVE BAIXO (CVSS < 4.0):
  → Risco BAIXO / Informativo
  → Registrar, monitorar
```

---

## 12. Análise do Código-Fonte

Para MCPs de publisher desconhecido ou com capabilities de alto risco — leitura do código é obrigatória:

```
Verificações prioritárias no código:

NETWORKING — o MCP faz chamadas não documentadas?
  grep -r "fetch\|axios\|http\|request\|urllib\|socket" src/
  → Identificar todos os domínios de destino
  → Verificar se estão documentados

EXECUÇÃO DE CÓDIGO — o MCP executa strings como código?
  grep -r "eval\|exec\|spawn\|subprocess\|child_process\|os.system" src/
  → Cada ocorrência é um risco crítico em potencial

CREDENCIAIS — onde o MCP armazena secrets?
  grep -r "password\|secret\|key\|token\|credential" src/
  → Verificar se estão sendo logados, transmitidos ou hardcoded

LOGGING — o que o MCP loga?
  grep -r "console.log\|logger\|logging\|print\|fmt.Print" src/
  → Dados sensíveis nos logs?

VARIÁVEIS DE AMBIENTE — quais o MCP lê?
  grep -r "process.env\|os.environ\|getenv" src/
  → Quais env vars são necessárias? São documentadas?
```

---

## 13. Saúde do Projeto

```
Indicadores de saúde — verificar no repositório:

✅ Sinais positivos:
  - Commits regulares (últimos 3 meses)
  - Issues respondidas pelo maintainer
  - SECURITY.md com canal de disclosure
  - Releases com notas de changelog
  - Testes automatizados no CI
  - Dependabot ou equivalente habilitado
  - Múltiplos contribuidores (não bus factor 1)

⚠️  Sinais de atenção:
  - Último commit > 6 meses
  - Issues acumuladas sem resposta
  - Sem testes
  - Dependências muito desatualizadas

🔴 Sinais de alerta:
  - Repositório arquivado ou deletado
  - Sem SECURITY.md e sem resposta a reports
  - Fork de projeto famoso com modificações não-documentadas
  - Aumento súbito de downloads sem histórico (possível supply chain attack)
```

---

## 14. Checklist — Supply Chain e Vulnerabilidades

```
□ Scan de dependências executado (npm audit / pip-audit / govulncheck)
□ CVEs encontrados classificados por severidade
□ CVEs críticos/altos: verificado se versão corrigida existe
□ Código-fonte revisado para capabilities de alto risco
□ Chamadas de rede não documentadas verificadas
□ Execução de código (eval/exec/shell) identificada e avaliada
□ Armazenamento de credenciais no código verificado
□ Saúde do projeto avaliada (commits, issues, mantenedores)
□ SECURITY.md e canal de disclosure verificados
```
