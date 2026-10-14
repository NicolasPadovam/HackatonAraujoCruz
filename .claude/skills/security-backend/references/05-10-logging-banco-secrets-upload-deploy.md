# Logging e Monitoramento Seguro — Backend

> OWASP A09:2021 (Security Logging and Monitoring Failures)
> CWE-117, CWE-223, CWE-532

---

## 1. O que DEVE ser Logado

| Evento | Campos obrigatórios |
|---|---|
| Tentativa de login (sucesso/falha) | timestamp, userId ou email, IP, user-agent, resultado |
| Logout | timestamp, userId, IP, sessionId |
| Falha de autorização | timestamp, userId, recurso tentado, método HTTP |
| Criação/edição/exclusão de dados sensíveis | timestamp, userId, entidade, ID do recurso, campos alterados |
| Mudança de papel/permissão | timestamp, adminId, targetUserId, papel anterior, novo papel |
| Operações administrativas | timestamp, adminId, ação, parâmetros |
| Rate limit atingido | timestamp, IP, endpoint, contagem |
| Erro de validação de token/JWT | timestamp, IP, token truncado, motivo |
| Reinicialização de serviço | timestamp, versão, ambiente |

## 2. O que NUNCA Deve Aparecer em Logs

- Senhas (incluindo tentativas erradas)
- Tokens completos (JWT, API keys, tokens de sessão)
- Números de cartão completos (PAN)
- CVV/CVC
- Chaves privadas / secrets
- Dados de saúde completos (em logs de acesso)
- CPF, RG completos em logs de debug
- Respostas completas de autenticação

```java
// ❌
log.info("Login attempt: user={} password={}", email, password);

// ✅
log.info("Login attempt: user={} ip={} result={}", email, clientIp, result);
```

## 3. Estrutura de Log Recomendada

Formato estruturado (JSON) facilita ingestão em SIEM:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "WARN",
  "event": "AUTH_FAILURE",
  "userId": null,
  "email": "u***@example.com",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "requestId": "abc-123",
  "tenantId": "tenant-xyz",
  "message": "Login failed: invalid credentials"
}
```

## 4. Proteção dos Logs

- Logs não devem ser alteráveis por quem os gerou (imutabilidade)
- Enviar logs para sistema centralizado em tempo real (não apenas arquivo local)
- Retenção mínima conforme regulação: 6 meses online + 2 anos archived (recomendação geral)
- Acesso aos logs restrito (não desenvolvedores por padrão em produção)
- Alertas automáticos para eventos críticos (X falhas de login em Y minutos)

## 5. Auditoria vs. Log Operacional

| Tipo | Finalidade | Retenção | Quem acessa |
|---|---|---|---|
| Audit log | Conformidade, forense | Longa (2-5 anos) | Compliance, Security |
| Access log | Debugging, análise | Média (90-180 dias) | Dev, Ops |
| Error log | Debugging | Curta (30-90 dias) | Dev |
| Security log | SOC, SIEM | Longa (1-2 anos) | Security |

---
---

# Banco de Dados — Backend Seguro

> OWASP A03:2021 (Injection) · A05:2021 (Security Misconfiguration)
> CWE-89, CWE-250, CWE-312

## 1. Permissões e Acesso

- Usuário da aplicação com **mínimas permissões necessárias**
  - Apenas SELECT, INSERT, UPDATE, DELETE nas tabelas necessárias
  - Nunca DROP, CREATE, ALTER para o usuário da aplicação
  - Nunca conectar como `root` ou `sa`
- Usuário separado para migrations (permissões maiores, usado apenas em deploy)
- Usuário separado para leitura analítica (somente SELECT)
- Rotação de senha do banco em processo de rotação de secrets

## 2. Configuração Segura

- Desabilitar login remoto do root
- Remover bancos e usuários de exemplo/demo
- Bind apenas em interfaces necessárias (não `0.0.0.0` sem firewall)
- TLS na conexão application → database
- Audit log habilitado no banco para operações DDL e DML em dados sensíveis
- Backups cifrados e testados periodicamente

## 3. Migrations Seguras

- Migrations em controle de versão, jamais aplicadas manualmente em produção
- Rollback planejado para cada migration crítica
- Testar migration em staging antes de produção
- Migration não deve conter dados sensíveis em texto plano

## 4. Dados Sensíveis no Banco

- Colunas com dados pessoais identificadas e documentadas
- Considerar criptografia em nível de coluna para dados de alta sensibilidade
- Mascaramento de dados em ambientes não-produção
- Procedimentos de purge para dados além do período de retenção

---
---

# Gerenciamento de Secrets — Backend Seguro

> OWASP A05:2021 (Security Misconfiguration)
> CWE-798, CWE-259, CWE-321

## 1. Regras Absolutas

- **NUNCA** commitar secrets no repositório de código (chaves, tokens, senhas, certificados)
- **NUNCA** hardcodar secrets em código-fonte
- **NUNCA** logar secrets (ver referência de logging)
- **NUNCA** passar secrets via query parameter de URL

## 2. Estratégia por Ambiente

| Ambiente | Estratégia |
|---|---|
| Desenvolvimento local | `.env` local (no `.gitignore`) + valores fictícios |
| CI/CD | Secrets nativos da plataforma (GitHub Actions Secrets, GitLab CI Variables) |
| Staging/Prod | Vault (HashiCorp / AWS Secrets Manager / GCP Secret Manager) |

## 3. Prevenção de Leak em Repositório

- `.gitignore` abrangente desde o início do projeto
- Pre-commit hook: `git-secrets`, `truffleHog`, `detect-secrets`
- Scan automático no CI: `Gitleaks`, `truffleHog`
- Configurar alertas de secret scanning no GitHub/GitLab

## 4. Rotação de Secrets

- Toda chave/secret deve ter data de validade definida
- Processo documentado de rotação sem downtime (dual key period)
- Rotação imediata ao detectar leak suspeito
- Auditoria de quem tem acesso a quais secrets

---
---

# Upload de Arquivos — Backend Seguro

> OWASP A04, A05 · CWE-434, CWE-22

## 1. Validações Obrigatórias

- Validar MIME type via magic bytes (não apenas extensão ou header Content-Type do cliente)
- Allowlist de extensões e tipos MIME aceitos
- Tamanho máximo por arquivo e total por request
- Não confiar no nome de arquivo do cliente — gerar nome interno UUID
- Escanear com antivírus/antimalware se arquivos são compartilhados

## 2. Armazenamento

- Nunca armazenar uploads em diretório web-acessível diretamente
- Servir arquivos via endpoint autenticado que valida permissão
- Armazenar em object storage (S3, GCS) preferencialmente fora do servidor da aplicação
- URLs assinadas (presigned URLs) com expiração para downloads
- Path traversal: canonicalizar e verificar caminho final (ver ref. validação)

## 3. Execução de Conteúdo

- Desabilitar execução de scripts no diretório de uploads
- Não servir arquivos de upload com `Content-Type` indevido (forçar download ou tipo correto)
- Sanitizar SVGs (podem conter JavaScript)
- Reprocessar imagens (strip EXIF, re-encode) para remover conteúdo embutido

---
---

# Checklist de Deploy — Backend Seguro

> OWASP A05:2021 (Security Misconfiguration)

## Pré-Deploy

- [ ] Variáveis de ambiente de produção configuradas em vault/secrets manager
- [ ] Nenhum secret em variável de ambiente de texto plano no manifesto
- [ ] Debug mode desabilitado (`DEBUG=false`, `spring.profiles.active=prod`)
- [ ] Stack traces não expostos em respostas de API
- [ ] Banco de dados com usuário de produção (sem root, sem permissões excessivas)
- [ ] Migrations testadas em staging
- [ ] Dependências atualizadas — sem CVEs conhecidos críticos/altos (rodar `npm audit`, `mvn dependency-check`, `trivy`)
- [ ] Scan de secrets no código-fonte (`gitleaks`, `truffleHog`)

## Configuração de Produção

- [ ] HTTPS obrigatório (redirect de HTTP)
- [ ] HSTS habilitado
- [ ] Headers de segurança configurados
- [ ] CORS com allowlist explícita
- [ ] Rate limiting ativo
- [ ] Logs centralizados e funcionando
- [ ] Alertas de segurança configurados
- [ ] Timeout de conexão de banco configurado
- [ ] Connection pool com limites adequados

## Infraestrutura

- [ ] Portas de banco de dados não expostas publicamente
- [ ] SSH com chave pública (sem senha), root login desabilitado
- [ ] Firewall/Security Groups configurados (princípio de least privilege)
- [ ] Imagem Docker sem usuário root (USER não-root no Dockerfile)
- [ ] Imagem Docker sem pacotes desnecessários
- [ ] `latest` tag não usada em produção — versões fixas
- [ ] Scan de vulnerabilidades na imagem Docker (Trivy, Grype)
- [ ] Kubernetes: PodSecurityContext, NetworkPolicy configurados

## Pós-Deploy

- [ ] Smoke tests de funcionalidade crítica
- [ ] Verificar headers de segurança em produção (SecurityHeaders.com)
- [ ] Verificar SSL/TLS (SSLLabs.com)
- [ ] Health check respondendo
- [ ] Métricas e alertas operacionais funcionando
