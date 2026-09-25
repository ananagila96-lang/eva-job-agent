# EVA-01 Job Agent

Agente local de carreira para organizar vagas, calcular compatibilidade com o perfil profissional, gerar cartas de apresentacao, acompanhar candidaturas e auxiliar o fluxo no LinkedIn pelo navegador.

## O que esta funcionando

- Dashboard web em `http://localhost:3000`
- Perfil profissional estruturado em `config/profile.json`
- Cadastro e importacao de vagas
- Matching automatico por competencias, cargo, idioma, localizacao e senioridade
- Geracao de carta de apresentacao em PT/EN
- Fila de candidaturas e status
- Extensao local do Chrome para importar vagas visiveis no LinkedIn
- Preenchimento assistido de campos basicos sob comando da usuaria
- Smoke test automatico no GitHub Actions

## Rodar no Windows / VS Code

```powershell
git clone https://github.com/ananagila96-lang/eva-job-agent.git
cd eva-job-agent
npm install
npm start
```

Abra:

`http://localhost:3000`

## Instalar a extensao EVA-01 no Chrome

1. Abra `chrome://extensions`.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactacao**.
4. Selecione a pasta `extension` deste projeto.
5. Fixe **EVA-01 Job Assistant** na barra do Chrome.

## Usar com LinkedIn

1. Deixe `npm start` rodando.
2. Entre normalmente no LinkedIn no seu Chrome.
3. Abra uma pagina de resultados de vagas.
4. Clique na extensao EVA-01.
5. Use **Importar vagas visiveis** para mandar as oportunidades para o dashboard local.
6. Abra uma candidatura e use **Preencher campos basicos** quando quiser preencher os campos suportados.
7. Revise os dados antes de qualquer envio.

O EVA-01 nao armazena senha do LinkedIn no repositorio. Email e telefone usados pela extensao ficam no armazenamento local do Chrome e nao sao enviados ao GitHub.

## Estrutura

```text
config/profile.json       perfil profissional
data/jobs.json            vagas salvas
data/applications.json    candidaturas
src/matcher.js            motor de compatibilidade
src/coverLetter.js        gerador de carta
src/store.js              persistencia local
public/                    dashboard
extension/                 extensao Chrome
server.js                  API e servidor
```

## Teste

```powershell
npm run check
```

## Proximas evolucoes

- Importacao de curriculo PDF pela interface
- Conectores adicionais de vagas
- Respostas padrao configuraveis para perguntas de candidatura
- Relatorios de entrevistas e follow-up

