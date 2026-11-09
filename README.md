# VerificaAI

Extensão para Google Chrome que usa inteligência artificial (Google Gemini) para ajudar a identificar **possíveis** fake news.

A pessoa cola um texto ou notícia, clica em **Analisar notícia** e recebe:

- uma classificação: **Possivelmente verdadeira**, **Possivelmente falsa** ou **Não foi possível verificar**;
- um nível de confiança aproximado da análise;
- uma explicação curta e simples;
- pontos que ela mesma deve conferir (em uma lista que pode ser marcada);
- as fontes que a IA consultou na busca do Google, quando houver.

> **A IA não decide o que é verdade.** O resultado é um apoio à verificação. Por isso a interface nunca diz
> "esta notícia é falsa" ou "é verdadeira", só "possivelmente", e o aviso aparece em todas as telas.

Este é um **MVP**: sem login, banco de dados, histórico, painel administrativo ou pagamentos.

---

## Como funciona

```
Popup da extensão  ──►  Backend local (Node)  ──►  API do Gemini (Google)
 (cola o texto)          guarda a chave da API       1) pesquisa no Google
      ▲                        │                     2) classifica em JSON
      └──── resultado ◄────────┘
```

A chave da API **nunca** fica no código da extensão (qualquer pessoa consegue ler o código de uma extensão).
Ela fica no backend, em um arquivo `.env` que só existe na sua máquina.

A análise acontece em até duas chamadas à IA, porque a API do Gemini não permite combinar a busca no Google
com uma resposta em JSON estrito na mesma chamada:

1. **Pesquisa** (opcional, liga/desliga com `USE_WEB_SEARCH`): o Gemini usa a busca do Google para confrontar
   as afirmações do texto com fontes confiáveis e devolve um resumo do que encontrou.
2. **Classificação**: o Gemini recebe o texto original e esse resumo, e devolve só a classificação, a
   confiança, a explicação e os pontos para verificar, em um JSON com formato garantido (`responseSchema`).

### Estrutura do projeto

```
verificaai/
├── extension/                    ← a extensão (o que você carrega no Chrome)
│   ├── manifest.json             ← configurações da extensão (Manifest V3)
│   ├── popup.html                ← tela do popup
│   ├── icons/                    ← ícones 16, 48 e 128 px
│   └── src/
│       ├── popup.js              ← controla as telas (formulário, carregando, resultado)
│       ├── config.js             ← endereço do backend, limites de texto, tempo máximo
│       ├── services/aiService.js ← comunicação com o backend/IA e tratamento de erros
│       ├── components/           ← resultCard.js (resultado), errorBox.js (erro), dom.js
│       └── styles/popup.css      ← visual
└── backend/                      ← servidor mínimo
    ├── .env.example              ← modelo de configuração
    ├── src/
    │   ├── server.js             ← rotas, validação, proteção de origem e limite de uso
    │   ├── aiService.js          ← chamadas ao Gemini (pesquisa + classificação)
    │   ├── prompt.js              ← instruções dadas à IA (regras de linguagem e formato)
    │   ├── normalize.js          ← valida e padroniza a resposta da IA
    │   ├── mock.js                ← modo demonstração (sem API)
    │   ├── rateLimit.js          ← limite de análises por minuto
    │   └── config.js             ← variáveis de ambiente
    └── test/normalize.test.js    ← testes automáticos
```

---

## 1. Pré-requisitos

- [Node.js](https://nodejs.org) versão 18 ou superior (`node --version` para conferir)
- Google Chrome
- Uma chave de API do Gemini (gratuita — veja o passo 3). Para só ver a interface funcionando, dá para usar o modo demonstração, sem chave.

## 2. Instalar as dependências

Só o backend tem dependências. A extensão é HTML, CSS e JavaScript puros e **não precisa de build**.

```bash
cd backend
npm install
```

## 3. Configurar a API do Gemini

1. Acesse **https://aistudio.google.com/app/apikey** e faça login com uma conta Google.
2. Clique em **Create API key** e copie a chave gerada (começa com `AIza...`). A camada gratuita do Gemini
   não pede cartão de crédito.
3. No diretório `backend`, copie o arquivo de exemplo:
   ```bash
   cp .env.example .env
   ```
   (no Windows: `copy .env.example .env`)
4. Abra o `.env` e troque `cole-sua-chave-aqui` pela sua chave:
   ```
   GEMINI_API_KEY=sua-chave
   ```

Opções extras no mesmo arquivo:

| Variável | Padrão | Para que serve |
|---|---|---|
| `GEMINI_MODEL` | `gemini-flash-latest` | Alias que sempre aponta para o Gemini Flash estável mais recente |
| `USE_WEB_SEARCH` | `true` | A IA pesquisa no Google para conferir as afirmações e devolve as fontes. Use `false` para desligar (resposta mais rápida, só com o que o modelo já sabe) |
| `MOCK_MODE` | `false` | `true` = respostas **simuladas**, sem chamar a API (só para testar a interface) |
| `PORT` | `3000` | Porta do servidor. Se mudar, ajuste também `extension/src/config.js` e `host_permissions` no `manifest.json` |
| `ALLOWED_EXTENSION_ID` | vazio | ID da sua extensão. Se preenchido, só ela pode usar o backend |

> Nunca envie o arquivo `.env` para o GitHub nem compartilhe a chave. O `.gitignore` do backend já o ignora.

## 4. Executar o backend

```bash
cd backend
npm start
```

Você deve ver algo como:

```
VerificaAI backend em http://localhost:3000
Modelo: gemini-flash-latest | Pesquisa na web: ligada
```

Deixe esse terminal aberto enquanto usa a extensão. Para testar sem chave, rode com `MOCK_MODE=true npm start`
(no Windows PowerShell: `$env:MOCK_MODE="true"; npm start`).

## 5. Carregar a extensão no Chrome

1. Abra `chrome://extensions`.
2. Ative o **Modo do desenvolvedor** (canto superior direito).
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta **`extension`** deste projeto.
5. Clique no ícone de quebra-cabeça da barra do Chrome e **fixe** o VerificaAI para deixá-lo sempre visível.

Se você alterar algum arquivo da extensão, clique no botão de recarregar do cartão dela em `chrome://extensions`.

## 6. Testar a aplicação

Com o backend rodando e a extensão carregada, clique no ícone do VerificaAI e cole um dos textos abaixo.
Todos são **fictícios**, criados só para teste.

**Deve tender a "Possivelmente falsa"** (urgência, promessa milagrosa, sem fonte):
> URGENTE! Água morna com limão cura o diabetes e os médicos escondem isso de você. Compartilhe antes que apaguem!

**Deve tender a "Possivelmente verdadeira"** (fato conhecido e verificável):
> A Terra leva cerca de 365 dias para dar uma volta ao redor do Sol, por isso a cada quatro anos existe um ano bissexto com 366 dias.

**Deve tender a "Não foi possível verificar"** (sem confirmação e sem fontes):
> Fontes ligadas ao governo afirmam que um novo pacote de medidas será anunciado em breve, mas ninguém quis confirmar oficialmente.

O que conferir:

- [ ] O botão **Analisar notícia** fica desabilitado até haver pelo menos 30 caracteres.
- [ ] Aparece o indicador de carregamento enquanto a IA analisa.
- [ ] O resultado mostra classificação, confiança, explicação, pontos para verificar e, se houver, as fontes.
- [ ] **Nova análise** limpa tudo e volta ao formulário.
- [ ] **Erro:** pare o backend (`Ctrl+C`), tente analisar e veja a mensagem de erro. O texto colado é mantido para você tentar de novo.

Outras verificações:

```bash
# o servidor está de pé? (mostra também se a chave está configurada)
curl http://localhost:3000/api/health

# testes automáticos da validação da resposta da IA
cd backend && npm test
```

O modo demonstração (`MOCK_MODE=true`) responde por palavras-chave, **não é IA**, e a explicação vem marcada como simulada.

---

## Decisões técnicas (e por quê)

- **JavaScript puro, sem React nem build.** A interface é pequena; assim não há `npm install` nem compilação na extensão, e qualquer pessoa entende o código.
- **Backend Node + Express, com só o essencial.** É o mínimo para esconder a chave da API. Sem banco de dados, sem sessão.
- **Gemini com busca no Google.** Uma IA que só lê o texto não consegue conferir fatos. Com a busca ela confronta as afirmações com fontes e devolve os links usados.
- **Duas chamadas em vez de uma.** A API do Gemini recusa combinar a ferramenta de busca com saída em JSON estrito na mesma chamada (erro `Tool use with a response mime type: 'application/json' is unsupported`). Por isso a pesquisa roda separada da classificação — mais confiável do que tentar as duas coisas de uma vez.
- **A IA responde em JSON e o backend valida.** `normalize.js` garante que a extensão sempre receba uma das três classificações e uma confiança entre 0 e 100. Se a IA responder algo inesperado, o resultado cai em "Não foi possível verificar", a opção mais prudente.
- **Confiança = segurança da análise, não chance de ser verdade.** O prompt limita a confiança a 70% quando não há resumo de pesquisa (ou seja, quando `USE_WEB_SEARCH=false`).
- **O texto do usuário é tratado como dado, não como instrução.** O prompt isola o texto colado e manda ignorar ordens escritas dentro dele (proteção contra "prompt injection").
- **Backend só em `127.0.0.1` e só para a extensão.** Outros dispositivos da rede e outros sites não conseguem usá-lo (nem gastar sua cota gratuita). Há também um limite de 10 análises por minuto.
- **Resultado sempre desenhado como texto.** Nada vindo da IA é inserido como HTML, o que evita injeção de código no popup.

## Limitações conhecidas

- O popup do Chrome fecha ao clicar fora dele. Se isso acontecer durante uma análise, ela se perde e é preciso colar de novo.
- A IA pode errar, principalmente com fatos muito recentes ou textos ambíguos. Use sempre como apoio.
- A camada gratuita do Gemini tem um limite de requisições por dia/minuto. Se ele for atingido, a extensão mostra uma mensagem pedindo para tentar de novo em instantes.
- O backend roda na sua máquina. Para distribuir a extensão a outras pessoas, seria preciso hospedá-lo (com autenticação) e trocar `API_BASE_URL` e `host_permissions`.

## Solução de problemas

| Sintoma | O que fazer |
|---|---|
| "Não consegui falar com o serviço de análise" | O backend não está rodando. Execute `npm start` em `backend/`. |
| "O servidor ainda não tem uma chave de API configurada" | Crie o `.env` com `GEMINI_API_KEY` (passo 3) e reinicie o backend. |
| "A chave de API foi recusada" | A chave está incorreta, foi revogada ou ainda não foi ativada. Confira em aistudio.google.com/app/apikey. |
| "O limite de uso gratuito da API de IA foi atingido" | Você bateu no limite diário/por minuto da camada gratuita. Espere um pouco ou acompanhe sua cota em aistudio.google.com. |
| "O modelo configurado não foi encontrado" | O valor de `GEMINI_MODEL` no `.env` não existe (ou foi descontinuado). Volte para o padrão `gemini-flash-latest` ou confira o nome em ai.google.dev/gemini-api/docs/models. |
| "Origem não permitida" | O `ALLOWED_EXTENSION_ID` não bate com o ID da extensão em `chrome://extensions`. |
| Mudei a porta e nada funciona | Atualize `API_BASE_URL` em `extension/src/config.js` e `host_permissions` no `manifest.json`, depois recarregue a extensão. |
