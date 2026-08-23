# UniChat

UniChat é uma aplicação corporativa interna para centralização do conhecimento institucional. A consulta acontece somente sobre documentos oficiais cadastrados na base local, com resposta acompanhada de fonte, setor, categoria e versão.

## Como rodar

```bash
npm start
```

Acesse:

```text
http://localhost:3000
```

## Acessos iniciais

Todos usam a senha inicial:

```text
Unichat@2026
```

Usuários:

```text
admin@unimeduberlandia.coop.br
gestor@unimeduberlandia.coop.br
colaborador@unimeduberlandia.coop.br
```

## Perfis

- Colaborador: acessa o chat e avalia respostas.
- Gestor: acompanha consultas por área, tópicos, avaliações e engajamento.
- Admin: gerencia documentos, usuários, perfis, status da base e logs completos.

## Privacidade e nuvem

Esta versão não envia dados para provedores externos. O modo local usa `data/` para testes e demonstração, enquanto a configuração de produção exige `SESSION_SECRET` forte, HTTPS ou proxy seguro, e permite apontar documentos para um repositório interno por `DOCUMENT_REPOSITORY_PATH`.

As variáveis de ambiente estão documentadas em `.env.example`. Orientações de produção estão em `docs/producao.md`.

## Testes

```bash
npm test
```

O teste sobe o servidor em uma porta isolada, autentica, consulta o chat, registra avaliação e valida rotas de gestor e admin.
