# Validação de Entrada e Prevenção de Injeções — Backend Seguro

> OWASP A03:2021 (Injection)
> CWE-20, CWE-89, CWE-78, CWE-77, CWE-943, CWE-917

---

## 1. Princípios de Validação

- **Validar tudo que vem de fora**: query params, path params, body, headers, cookies, arquivos, URLs externas
- **Allowlist > Blocklist**: definir o que é permitido, rejeitar o resto
- **Validar no servidor**: validação no frontend é UX, não segurança
- **Falhar cedo**: rejeitar entrada inválida o mais cedo possível no pipeline
- **Separar validação de sanitização**: primeiro validar estrutura e tipo, depois sanitizar se necessário para output

---

## 2. SQL Injection

A vulnerabilidade mais clássica e ainda presente.

### Causa raiz
Concatenar input do usuário diretamente em queries SQL.

```sql
-- ❌ NUNCA
"SELECT * FROM users WHERE email = '" + email + "'"

-- ✅ SEMPRE: Prepared Statements / Parameterized Queries
"SELECT * FROM users WHERE email = ?"  -- com parâmetro separado
```

### Com ORMs
- ORMs **não são imunes** — raw queries e interpolação de strings ainda são vetores
- Evitar `.rawQuery()`, `.executeNativeQuery()`, `@Query` com concatenação
- Validar que o ORM está gerando queries parametrizadas (ativar SQL logging em dev)

### Blind SQL Injection
- Mesmo sem retornar dados, a resposta (tempo ou erro) pode vazar informação
- Usar respostas genéricas de erro sem detalhe de SQL
- Desabilitar mensagens de erro detalhadas de banco em produção

### Second-Order Injection
- Dados armazenados "limpos" podem ser usados em queries posteriores com concatenação
- Tratar **todo** dado recuperado do banco como untrusted ao usar em queries dinâmicas

---

## 3. Command Injection (OS Injection)

```bash
# ❌
system("ping " + userInput)

# ✅ Usar APIs nativas em vez de shell quando possível
# Se shell for necessário: escapar e usar listas de argumentos, nunca string concatenada
```

- Evitar chamar shell commands com input do usuário
- Se inevitável: usar `ProcessBuilder` (Java), `subprocess` com lista (Python), etc.
- Allowlist de valores permitidos para qualquer parâmetro passado ao SO

---

## 4. LDAP Injection

- Usar bibliotecas que suportam consultas parametrizadas LDAP
- Escapar caracteres especiais: `( ) * \ / NUL`
- Validar formato de DN antes de usar em queries

---

## 5. XML Injection / XXE (XML External Entity)

```xml
<!-- ❌ XXE payload -->
<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root>&xxe;</root>
```

- Desabilitar DTDs (DOCTYPE) no parser XML
- Desabilitar external entities
- Usar parsers com defaults seguros (ex: Jackson com desabilitar features XML externas)
- Preferir JSON quando XML não for estritamente necessário

---

## 6. Template Injection (SSTI)

- Nunca renderizar templates com input do usuário como parte do template
- Usar mecanismo de template com auto-escaping ativo
- Separar dados de template da lógica de template

```python
# ❌
render_template_string("Hello " + user_input)

# ✅
render_template_string("Hello {{ name }}", name=user_input)
```

---

## 7. Path Traversal

```
❌ /api/files?name=../../etc/passwd
```

- Canonicalizar e normalizar o path antes de qualquer operação de filesystem
- Verificar que o path resultante está dentro do diretório permitido
- Usar allowlist de extensões e nomes de arquivo
- Não expor estrutura de diretórios via mensagens de erro

```java
// Java — verificação de path traversal
Path base = Paths.get("/app/uploads").toAbsolutePath().normalize();
Path target = base.resolve(userInput).normalize();
if (!target.startsWith(base)) {
    throw new SecurityException("Path traversal detectado");
}
```

---

## 8. Mass Assignment / Over-posting

- Nunca fazer bind automático de request body em objetos de domínio completos
- Usar DTOs (Data Transfer Objects) explícitos com apenas os campos aceitos
- Blocklist não é suficiente — qualquer campo novo adicionado ao modelo pode virar vetor

```java
// ❌ Bind direto do request no modelo que tem campo "role"
User user = objectMapper.readValue(request, User.class);

// ✅ DTO com apenas campos permitidos
UserCreateRequest dto = objectMapper.readValue(request, UserCreateRequest.class);
User user = new User(dto.getName(), dto.getEmail()); // campos explícitos
```

---

## 9. Header Injection / CRLF Injection

- Validar e sanitizar qualquer valor que vá para headers HTTP de resposta
- Caracteres `\r\n` em headers podem injetar headers adicionais ou split responses
- Nunca refletir headers do request diretamente na response sem sanitização

---

## 10. ReDoS (Regular Expression Denial of Service)

- Evitar regex com backtracking catastrófico em inputs controlados pelo usuário
- Testar regex com ferramentas como `regexploit` ou `reDOS checker`
- Definir timeout para operações de regex quando possível
- Exemplos de padrões problemáticos: `(a+)+`, `([a-zA-Z]+)*`

---

## 11. Regras Gerais de Validação

### Tipos e Formatos
- Validar tipo antes de usar (string, número, booleano, UUID, data)
- Validar formato esperado (email, CPF, CNPJ, telefone) com biblioteca confiável
- Validar tamanho mínimo e máximo de strings
- Rejeitar campos inesperados (strict mode nos deserializadores)

### Encoding
- Definir encoding explicitamente (UTF-8) em parsers e readers
- Normalizar Unicode antes de validar (NFC) — evitar bypass por variações de encoding
- Rejeitar null bytes (`\0`) em inputs de string

### Números
- Validar range (ex: quantidade entre 1 e 1000)
- Cuidado com overflow em linguagens fortemente tipadas
- Validar que IDs não sejam negativos ou zero quando não faz sentido de negócio

---

## 12. Checklist Rápido — Validação e Injeções

- [ ] Todas as queries usam prepared statements / parâmetros
- [ ] DTOs explícitos (sem mass assignment)
- [ ] XML parser com DTD e external entities desabilitados
- [ ] Path de arquivos canonicalizado e verificado contra diretório base
- [ ] Validação de tipo, formato, tamanho em todos os inputs externos
- [ ] Shell commands evitados; se necessários, argumentos em lista, não string
- [ ] Regex revisadas para backtracking catastrófico
- [ ] Mensagens de erro não expõem detalhes de SQL/stack trace
- [ ] Templates com auto-escaping; input não usado como template em si
- [ ] Headers de resposta não refletem headers de request sem sanitização
