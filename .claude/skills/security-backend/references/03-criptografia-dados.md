# Criptografia e Proteção de Dados — Backend Seguro

> OWASP A02:2021 (Cryptographic Failures)
> CWE-311, CWE-326, CWE-327, CWE-328, CWE-330

---

## 1. Dados em Trânsito (TLS)

### TLS — Mínimos Aceitáveis
- **TLS 1.2** mínimo; **TLS 1.3** preferencial
- Desabilitar SSL 2.0, SSL 3.0, TLS 1.0, TLS 1.1
- Cipher suites: apenas com Perfect Forward Secrecy (ECDHE, DHE)
- Certificados: mínimo RSA 2048 bits ou ECC 256 bits
- HSTS habilitado com `max-age` ≥ 1 ano e `includeSubDomains`
- Certificate pinning para apps mobile de alta criticidade
- OCSP Stapling habilitado

### Verificar com:
```bash
# testssl.sh — ferramenta de linha de comando
testssl.sh https://seudominio.com

# SSL Labs online
https://www.ssllabs.com/ssltest/
```

### Erros Comuns
- Verificação de certificado desabilitada em código (`trustAllCerts`, `InsecureSkipVerify`)
- HTTP ainda ativo sem redirect para HTTPS
- Comunicação interna entre serviços sem TLS ("é rede interna")

---

## 2. Criptografia em Repouso

### Quando Usar
- Dados pessoais sensíveis (CPF, RG, dados de saúde, financeiros)
- Secrets e chaves de API
- Backups de banco de dados
- Discos de servidores com dados regulados

### Algoritmos Recomendados

| Caso de uso | Algoritmo | Observação |
|---|---|---|
| Criptografia simétrica | AES-256-GCM | Autenticado (AEAD) — preferencial |
| Criptografia simétrica | AES-256-CBC | Usar apenas com HMAC |
| Criptografia assimétrica | RSA-OAEP (2048+) | Para troca de chaves |
| Criptografia assimétrica | ECDH (P-256/P-384) | Para troca de chaves |
| Assinatura digital | ECDSA (P-256) ou RSA-PSS | Não usar RSA-PKCS1v1.5 |
| Hash geral | SHA-256 / SHA-3 | Não usar MD5, SHA-1 |
| Hash de senhas | Argon2id, bcrypt, scrypt | Ver referência de auth |

### Erros Críticos
- Usar ECB mode (Electronic Codebook) — mesmos blocos de dado = mesmos blocos cifrados
- IV/nonce fixo ou reutilizado com o mesmo key
- Derivar chave diretamente de senha sem KDF (usar PBKDF2, Argon2, scrypt)
- Armazenar chave no mesmo lugar que os dados cifrados

---

## 3. Geração de Números Aleatórios

- **SEMPRE** usar CSPRNG para valores de segurança:
  - IDs de sessão, tokens de reset de senha, API keys, nonces, IVs
- Fontes confiáveis por linguagem:
  - Java: `java.security.SecureRandom`
  - Python: `secrets` module (`secrets.token_urlsafe()`)
  - Node.js: `crypto.randomBytes()`
  - Go: `crypto/rand`
- **NUNCA** usar `Math.random()`, `Random()`, `rand()` para fins de segurança

---

## 4. Hashing (Não Senhas)

### Para integridade e identificação (não reversível)
- SHA-256 ou SHA-3 para fins gerais
- HMAC-SHA256 quando integridade com autenticação for necessária
- SHA-1 e MD5 apenas para checksums não-segurança (ex: cache busting)

### Para tokens de reset / links mágicos
- Gerar token com CSPRNG (≥ 32 bytes)
- Armazenar **hash** do token no banco (SHA-256 é suficiente aqui, pois o token já tem alta entropia)
- Token com expiração curta (15-60 min)
- Token de uso único (invalidar após uso)

---

## 5. Gerenciamento de Chaves

### Princípios
- Separação: chave não deve estar no mesmo repositório que o código
- Rotação: toda chave deve ter ciclo de vida definido e processo de rotação
- Acesso mínimo: apenas os serviços que precisam descriptografar têm acesso à chave
- Auditoria: acessos às chaves devem ser logados

### Ferramentas Recomendadas
- **HashiCorp Vault** — self-hosted, open source
- **AWS KMS** / **GCP KMS** / **Azure Key Vault** — cloud managed
- **AWS Secrets Manager** / **GCP Secret Manager** — para secrets em geral

### Envelope Encryption
Padrão recomendado para dados em repouso em escala:
1. Gerar Data Encryption Key (DEK) localmente por registro/tenant
2. Cifrar DEK com Key Encryption Key (KEK) armazenada no KMS
3. Armazenar DEK cifrada junto ao dado — rotacionar KEK sem re-cifrar todos os dados

---

## 6. Dados Pessoais — Considerações de Criptografia

- Tokenização para dados de cartão (não armazenar PAN em claro)
- Pseudonimização: substituir identificadores diretos por tokens irreversíveis
- Anonimização: quando não houver necessidade de reverter (análises, logs)
- Campo-nível de criptografia para dados de alta sensibilidade (ex: diagnósticos médicos)

---

## 7. Checklist Rápido — Criptografia

- [ ] TLS 1.2+ em todas as comunicações (incluindo internas)
- [ ] Verificação de certificado nunca desabilitada em código
- [ ] HSTS habilitado
- [ ] AES-256-GCM para criptografia simétrica em repouso
- [ ] IV/nonce único por operação de cifragem
- [ ] CSPRNG para todos os valores de segurança (tokens, IDs de sessão, nonces)
- [ ] Chaves nunca no repositório de código
- [ ] Rotação de chaves documentada e implementável
- [ ] Tokens de reset hasheados antes de armazenar
- [ ] MD5 e SHA-1 ausentes de qualquer uso de segurança
- [ ] ECB mode nunca usado
