# My Memory Garden

Prova visual em React + TypeScript + Phaser 3, seguindo as referências fornecidas: céu pastel, colinas verdes, pétalas, borboletas e interface manuscrita.

```bash
npm install
npm run dev       # http://127.0.0.1:5173
npm run build     # TypeScript + produção
npm test          # Chrome desktop e celular emulado
```

Requer Node.js 22.12+ e Google Chrome instalado para os testes. Para usar Chromium, remova `launchOptions.channel` de `playwright.config.ts` e execute `npx playwright install chromium`.

**Plant a Memory** abre o formulário visual. Escreva um momento, escolha a emoção e a importância, e selecione **Plant it**. A semente cresce em aproximadamente três segundos. Clique ou toque na flor para consultar a lembrança; **Pluck** a remove. O botão de estação alterna Spring → Summer → Autumn → Winter e mostra o ícone atual. As plantas acompanham a estação com folhas e flores em tons sazonais e neve no inverno, preservando suas memórias e posições. O controle de movimento reduzido fica na ajuda (**?**), também respeitando a preferência do sistema.

As lembranças existem apenas na sessão: atualizar a página inicia um jardim vazio. Não há banco de dados, conta ou integração com IA.

## Organização

- `src/garden/landscape.ts`: cenário vetorial responsivo e paleta.
- `src/garden/seasons.ts`: estações, paletas e partículas sazonais.
- `src/garden/plant-art.ts`: sprites orgânicos, espécies e frames de animação.
- `src/garden/GardenScene.ts`: crescimento, seleção e efeitos.
- `src/garden/PhaserGarden.ts`: ciclo de vida do Phaser no React.
- `src/components/`: janelas e formulário da prova visual.
- `src/styles.css`: interface e responsividade.
- `public/fonts/`: Caveat e Quicksand locais, com licenças OFL.
- `e2e/`: testes de navegador.

O cenário e os sprites são desenhados localmente com Canvas2D e utilizados pelo Phaser. As ilustrações pixel art da primeira direção não são utilizadas nesta versão. Consulte [a direção visual](docs/art-direction.md).

Validação executada: build de produção aprovado e 12 testes Playwright aprovados no Chrome, em desktop 1288×720 e celular emulado 390×844. Incluem troca das quatro estações preservando as memórias, formulário, crescimento, clique/toque, remoção, foco, movimento reduzido e reinício sem persistência. Sem erros de JavaScript ou recursos de rede. As capturas estão em `artifacts/reference-*.png`. Dispositivos físicos e Safari não foram testados.
