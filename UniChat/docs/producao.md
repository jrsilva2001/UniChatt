# Configuração Para Produção

## Requisitos antes de produção

- Configurar `NODE_ENV=production`.
- Definir `SESSION_SECRET` com uma chave forte e exclusiva.
- Habilitar `HTTPS_ENABLED=true` com certificado e chave, ou `TRUST_PROXY=true` quando houver proxy corporativo com HTTPS.
- Manter `ALLOW_JSON_STORAGE_IN_PRODUCTION=false` até conectar um banco corporativo privado.
- Configurar SSO corporativo por proxy autenticado quando disponível.
- Definir `DOCUMENT_REPOSITORY_PATH` apontando para um volume ou repositório interno com controle de acesso.

## SSO Corporativo

O pacote suporta SSO por cabeçalho confiável, comum quando um proxy corporativo autentica o usuário antes da aplicação.

Variáveis:

```text
SSO_ENABLED=true
SSO_MODE=trusted-header
SSO_EMAIL_HEADER=x-authenticated-email
LOCAL_LOGIN_ENABLED=false
TRUST_PROXY=true
```

O proxy deve enviar o e-mail corporativo já validado no cabeçalho definido em `SSO_EMAIL_HEADER`.

## Banco Corporativo

O armazenamento atual continua em JSON para desenvolvimento local. Em produção, o sistema bloqueia o uso desse armazenamento por padrão quando `NODE_ENV=production`.

Para ligar um banco corporativo, substitua as funções `readJson` e `writeJson` por um adaptador interno com as mesmas entidades:

- `users`
- `documents`
- `logs`

O restante do código já concentra os acessos nesses pontos, facilitando a troca sem alterar as telas.

## Documentos

Quando `DOCUMENT_REPOSITORY_PATH` estiver definido, o conteúdo dos novos documentos passa a ser gravado no caminho informado, e o cadastro guarda apenas a referência do arquivo. Use um caminho em volume privado, com backup e controle de acesso corporativo.
