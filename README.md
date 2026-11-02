# Painel DW

Site privado que exibe os dados de uma planilha do Google Sheets, com acesso restrito a e-mails autorizados via login do Google.

## Como funciona

```
[Usuário acessa o site]
        ↓
[Login com Google → servidor valida e-mail contra a lista autorizada]
        ↓
[Servidor lê a planilha via Google Sheets API (conta de serviço)]
        ↓
[Tabela com os dados é exibida]
```

- O site **não escreve** na planilha — apenas lê.
- A planilha continua sendo o local de edição (você edita no Sheets; o site reflete ao recarregar).
- Quem não está na lista de e-mails autorizados é bloqueado mesmo com o link do site.

## Stack

- **Next.js 14** (App Router)
- **Vercel** (hospedagem, plano Hobby — gratuito para uso pessoal)
- **Google Sheets API v4** (leitura via conta de serviço)
- **Google Identity Services** (login com Google)
- **Autenticação por cookie de sessão assinado (HMAC-SHA256)**, válido por 7 dias

## Estrutura do projeto

```
DW/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.js    ← valida o token do Google e cria sessão
│   │   │   └── logout/route.js   ← apaga o cookie de sessão
│   │   └── dados/route.js        ← lê a planilha (exige sessão válida)
│   ├── layout.js
│   └── page.jsx                  ← tela de login + tabela de dados
├── lib/
│   ├── session.js                ← assinatura/verificação do cookie de sessão
│   └── sheets.js                 ← cliente da Google Sheets API (somente leitura)
├── .env.example
├── jsconfig.json
└── package.json
```

## Configuração (feita uma vez)

### 1. Google Cloud

- **Projeto**: aquele onde está a conta de serviço `planilha-bot@...iam.gserviceaccount.com`.
- **APIs ativadas**: Google Sheets API.
- **Conta de serviço**: usada pelo código para ler a planilha. A chave JSON (`client_email` + `private_key`) fica nas variáveis de ambiente do Vercel.
- **OAuth consent screen**: modo "Teste", com os e-mails autorizados em **Usuários de teste**.
- **OAuth Client ID** (Web application): com a URL do site em **Origens JavaScript autorizadas**.
  - Se mudar o domínio do site, **precisa atualizar essa URL** no Google Cloud, senão o login para de funcionar com erro `origin_mismatch`.

### 2. Google Sheets

- A planilha é privada. Compartilhada apenas com:
  - **Você** (proprietário)
  - **A conta de serviço** (`planilha-bot@...iam.gserviceaccount.com`) com permissão de **Leitor** ou **Editor**
- Nome da aba precisa bater **exatamente** com a variável `SHEET_NAME` (incluindo acentos e maiúsculas).

### 3. Vercel

- Projeto importado do GitHub (deploy automático a cada `push`).
- Variáveis de ambiente (ver `.env.example`).

## Variáveis de ambiente

Todas configuradas em **Vercel → Settings → Environment Variables**. Nenhuma delas fica no código.

| Variável | O que é | Onde pegar |
| :--- | :--- | :--- |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | E-mail da conta de serviço | Campo `client_email` do JSON da conta de serviço |
| `GOOGLE_PRIVATE_KEY` | Chave privada da conta de serviço | Campo `private_key` do JSON (com `\n` literais) |
| `SPREADSHEET_ID` | ID da planilha | URL do Sheets, entre `/d/` e `/edit` |
| `SHEET_NAME` | Nome exato da aba | Etiqueta da aba no Sheets |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID do OAuth | Google Cloud → Credenciais → OAuth Client ID |
| `SESSION_SECRET` | Chave para assinar o cookie de sessão | Gerada com `crypto.randomUUID() + crypto.randomUUID()` |
| `EMAILS_PERMITIDOS` | Lista de e-mails autorizados, separados por vírgula, sem espaços | — |

⚠️ **Se mudar qualquer uma dessas variáveis, é preciso fazer Redeploy** no Vercel (Deployments → ⋯ → Redeploy). Variáveis só são lidas no momento do build.

## Como adicionar ou remover usuários

Para **autorizar** um novo e-mail:

1. **Google Cloud** → APIs e serviços → Tela de permissão OAuth → Usuários de teste → **Add users** → adicionar o e-mail.
2. **Vercel** → Settings → Environment Variables → `EMAILS_PERMITIDOS` → **Edit** → adicionar o e-mail à lista (separado por vírgula, sem espaços).
3. **Redeploy** no Vercel.

Para **revogar** um acesso: remover dos dois lugares acima e refazer o Redeploy. Isso invalida o acesso no próximo carregamento da página. Se a pessoa tiver sessão ativa (cookie de 7 dias), ela continua logada até o cookie expirar — para revogar imediatamente, é preciso trocar o `SESSION_SECRET` (o que desloga **todos**, incluindo você).

## Como fazer deploy

- **Automático**: qualquer `push`/commit no GitHub dispara um deploy no Vercel em ~1 min.
- **Manual**: Vercel → Deployments → ⋯ → Redeploy.

## Como testar localmente (opcional)

```bash
git clone https://github.com/SEU-USUARIO/DW.git
cd DW
npm install
# criar .env.local com as mesmas variáveis do Vercel
npm run dev
```

Acesse `http://localhost:3000`. Para o login funcionar localmente, adicione `http://localhost:3000` às **Origens JavaScript autorizadas** do OAuth Client ID no Google Cloud.

## Segurança — pontos de atenção

- **2FA obrigatório** na conta Google (proprietária da planilha) e na conta Vercel. Sem isso, o esquema de pseudonimização/login cai se a senha vazar.
- **Nunca** comite `.env`, `.env.local` ou o JSON da conta de serviço no GitHub.
- **Nunca** compartilhe a planilha com mais ninguém além da conta de serviço.
- **Não** desative a "Tela de permissão OAuth" no modo Teste sem antes revisar quem está em `EMAILS_PERMITIDOS`.
- Se suspeitar de vazamento: troque `SESSION_SECRET`, `GOOGLE_PRIVATE_KEY` e a senha do Google, nessa ordem.

## Limitações conhecidas

- **Não há paginação nem busca** na tabela — todas as linhas são carregadas de uma vez. Se a planilha crescer muito (>5000 linhas), pode ficar lenta.
- **A tabela exibe todas as colunas** da planilha. Para ocultar colunas sensíveis (CPF, telefone), é preciso alterar `app/page.jsx`.
- **Sessão de 7 dias**: não há refresh automático. Depois de 7 dias, é preciso logar de novo.

## Problemas comuns

| Sintoma | Causa provável | Solução |
| :--- | :--- | :--- |
| "Acesso restrito" sem botão do Google | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` ausente ou Redeploy não feito | Configurar variável + Redeploy |
| Erro `origin_mismatch` ao clicar no botão | URL do site não está nas Origens autorizadas do OAuth | Atualizar no Google Cloud |
| "E-mail não autorizado" | E-mail fora de `EMAILS_PERMITIDOS` | Adicionar e Redeploy |
| "Erro ao ler dados" / `Unable to parse range` | `SHEET_NAME` diferente do nome real da aba | Corrigir + Redeploy |
| "Erro ao ler dados" / `403` | Conta de serviço sem acesso à planilha | Compartilhar a planilha com o `client_email` |
| Login funciona mas tabela vazia | Planilha vazia ou só cabeçalhos | Verificar no Sheets |

## Contato / responsável

- **Responsável**: (seu nome)
- **E-mail**: (seu e-mail institucional)
- **Última atualização**: 2026-11-02
