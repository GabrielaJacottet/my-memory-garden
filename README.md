# My Memory Garden

Um jardim onde cada memória vira uma flor. Você planta um momento, escolhe como ele fez você se sentir e vê a semente brotar e florescer. A privacidade é decidida **memória por memória**: o jardim é seu, e cada flor decide se pode ser vista por visitantes.

**[Ver o site →](https://gabrielajacottet.github.io/my-memory-garden/)**

## Funcionalidades

- **Jardim em vista 3/4**, no estilo Stardew Valley: o chão é visto de cima e as flores ficam em pé, com profundidade pela posição. Dá para arrastar e dar zoom com o mouse ou com pinça no celular. Uma vista lateral continua disponível na Ajuda.
- **Crescimento animado**: semente → broto → flor. Cada emoção (alegria, amor, calma, tristeza, crescimento, encanto) tem sua própria flor, que balança ao vento.
- **Quatro estações**, que mudam as cores das plantas, as partículas do céu e trazem neve no inverno.
- **Contas com e-mail e senha**, com recuperação de senha. Seu jardim fica salvo na nuvem e você pode dar um nome a ele.
- **Privacidade por memória**: toda memória nasce privada, e você abre ou fecha cada uma individualmente.
- **Visitar jardins**: a página inicial lista os jardins que têm memórias públicas, com busca pelo nome do jardim ou de quem cuida dele. Passando o mouse sobre uma flor aparece um balão com o início da memória.
- **Três idiomas**: português (padrão), inglês e espanhol.
- **Acessibilidade**: navegação por teclado nos formulários, foco visível, rótulos para leitores de tela e respeito à preferência de movimento reduzido.

## Como a privacidade funciona

A regra não fica só na interface: ela é garantida pelo banco. Em [`firestore.rules`](firestore.rules):

- uma memória só pode ser lida pelo dono ou, se estiver marcada como pública, por qualquer pessoa;
- um jardim sem nenhuma memória pública não aparece para visitantes, nem pelo nome;
- o resumo público de cada jardim conta apenas as memórias públicas, então ninguém descobre quantas memórias privadas existem;
- todo dado gravado é validado (campos permitidos, tamanhos e tipos).

## Tecnologias

- **React 19 + TypeScript**, com Vite
- **Phaser 3** para o jardim (cenário, sprites, câmera, animações)
- **Firebase**: Authentication (e-mail/senha) e Cloud Firestore
- **GitHub Actions + GitHub Pages** para o deploy
- **Playwright** para testes de navegador

Toda a arte (cenário, flores, ilustrações da página inicial) é desenhada em código, com Canvas2D e SVG. Não há imagens prontas.

## Estrutura

```
src/
  Root.tsx              rotas por hash (#/, #/login, #/garden, #/garden/<id>)
  App.tsx               tela do jardim: cabeçalho, diálogos, plantar, compartilhar
  i18n.tsx              dicionários pt/en/es e seletor de idioma
  components/
    Home.tsx            página inicial e busca de jardins
    AuthPage.tsx        entrar, criar conta, recuperar senha
    GardenPage.tsx      carrega o jardim antes de abrir o canvas
  garden/
    FieldScene.ts       vista 3/4: campo, câmera, profundidade, balão de prévia
    GardenScene.ts      vista lateral
    plant-art.ts        flores desenhadas em Canvas2D e animação de vento
    field-art.ts        chão procedural e posições em espiral
    landscape.ts        cenário da vista lateral
    seasons.ts          paletas e partículas de cada estação
  services/
    firebase.ts         inicialização a partir das variáveis de ambiente
    auth.tsx            sessão e ações de conta
    gardens.ts          leitura e gravação no Firestore, busca
    public-gardens.ts   jardins de exemplo exibidos ao lado dos reais
firestore.rules         regras de segurança
firestore.indexes.json  índice usado pela busca
```

## Rodar localmente

Requer Node.js 22.12+.

```bash
npm install
cp .env.example .env.local   # preencha com a configuração do seu app Web no Firebase
npm run dev                  # http://127.0.0.1:5173
```

Sem o `.env.local`, a página inicial e os jardins de exemplo funcionam, e a tela de login avisa que o Firebase não está configurado.

### Configurar o Firebase

1. Crie um projeto no [console do Firebase](https://console.firebase.google.com).
2. Em **Authentication**, ative o provedor **E-mail/senha**.
3. Crie o banco **Firestore** (edição Standard, ID `(default)`, modo de produção).
4. Registre um app Web e copie a configuração para o `.env.local`.
5. Publique as regras e o índice:
   ```bash
   npx firebase-tools login
   npx firebase-tools use --add
   npx firebase-tools deploy --only firestore:rules,firestore:indexes
   ```

## Deploy

Cada push na branch `main` dispara [o workflow](.github/workflows/deploy.yml), que compila o site e publica no GitHub Pages. Para funcionar:

- em **Settings → Pages**, a fonte precisa ser **GitHub Actions**;
- as seis chaves do `.env.example` precisam estar cadastradas em **Settings → Secrets and variables → Actions → Variables**;
- o domínio `<usuário>.github.io` precisa estar em **Firebase → Authentication → Settings → Authorized domains**.

A configuração Web do Firebase é pública por natureza. Quem protege os dados são as regras do Firestore.

## Estado atual

- Os testes Playwright em `e2e/` foram escritos antes das contas existirem e ainda precisam rodar contra o Firebase Emulator para cobrir o login.
- Testado em Chrome no desktop e em celular emulado; Safari e dispositivos físicos ainda não foram testados.

## Créditos

Fontes [Caveat](https://fonts.google.com/specimen/Caveat) e [Quicksand](https://fonts.google.com/specimen/Quicksand) (licença OFL, em `public/fonts/`), além de Fraunces e DM Sans, via Google Fonts.
