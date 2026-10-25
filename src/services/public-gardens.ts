import type { EmotionId, GardenMemory } from '../garden/types'

export interface PublicGarden {
  id: string
  name: string
  owner: string
  blurb: string
  /** Built-in sample garden, shown so the gate is never empty. */
  example?: boolean
  /** Only the memories their gardener chose to share. */
  memories: GardenMemory[]
}

type SeedMemory = [EmotionId, number, string, string, boolean]

// Sample gardeners shown next to the real ones. Their private memories are dropped right below,
// just as firestore.rules keeps real private memories from ever reaching a visitor.
const GARDENS: (Omit<PublicGarden, 'memories'> & { memories: SeedMemory[] })[] = [
  {
    id: 'marina', name: 'Canteiro de verões', owner: 'Marina Alves', blurb: 'Pequenas alegrias de muitos verões na casa de praia.',
    memories: [
      ['love', 5, '2024-12-28', 'Vovó ensinando a fazer picolé de manga na cozinha da casa de praia.', true],
      ['joy', 4, '2025-01-12', 'Primeiro mergulho do ano: a água gelada e todo mundo rindo na beira.', true],
      ['calm', 3, '2025-01-30', 'Rede na varanda, chuva de fim de tarde e um livro pela metade.', true],
      ['wonder', 4, '2025-02-05', 'O mar brilhando à noite, como se as estrelas tivessem caído na água.', true],
      ['sad', 3, '2025-02-20', 'O último verão antes da mudança.', false],
    ],
  },
  {
    id: 'tiago', name: 'Receitas que contam histórias', owner: 'Tiago Rocha', blurb: 'Pratos que guardam pessoas dentro.',
    memories: [
      ['love', 5, '2024-10-02', 'O bolo de fubá da minha mãe, que nunca fica igual quando eu faço.', true],
      ['joy', 3, '2025-03-14', 'O primeiro pão de fermentação natural que cresceu de verdade.', true],
      ['sad', 4, '2025-05-09', 'Fechando o caderno de receitas do meu avô pela última vez.', true],
      ['growth', 2, '2025-06-01', 'Algo que estou guardando só para mim.', false],
      ['calm', 3, '2025-07-20', 'Domingo de feijoada: panela no fogo desde cedo e a casa cheia.', true],
    ],
  },
  {
    id: 'lia', name: 'Cidades onde morei', owner: 'Lia Moreno', blurb: 'O que quero lembrar de cada endereço.',
    memories: [
      ['wonder', 5, '2025-01-09', 'Vi neve pela primeira vez e esqueci que estava atrasada para a aula.', true],
      ['love', 4, '2025-02-02', 'Uma carta da minha mãe escondida dentro do dicionário.', true],
      ['joy', 3, '2025-03-30', 'A cozinha minúscula do alojamento: seis idiomas e uma panqueca queimada.', true],
      ['sad', 2, '2025-04-18', 'A despedida no aeroporto que ainda repito na cabeça.', false],
      ['growth', 5, '2025-06-12', 'Apresentei minha tese e minhas mãos não tremeram.', true],
      ['calm', 3, '2025-06-30', 'A biblioteca na hora de fechar, as luzes apagando uma por uma.', true],
    ],
  },
  {
    // Everything here is private, so this garden never appears to visitors.
    id: 'ana', name: 'Jardim escondido', owner: 'Ana Lima', blurb: 'Só para mim.',
    memories: [['love', 5, '2025-08-01', 'O dia em que adotamos o Biscoito.', false]],
  },
]

export const EXAMPLE_GARDENS: PublicGarden[] = GARDENS
  .map(({ memories, ...garden }) => ({
    ...garden,
    id: `example-${garden.id}`,
    example: true,
    memories: memories
      .map(([emotion, importance, date, description, isPublic], index) => ({
        id: `${garden.id}-${index}`, emotion, importance, description, isPublic,
        createdAt: new Date(`${date}T12:00:00`).toISOString(), position: { x: 0, y: 0 },
      }))
      .filter((memory) => memory.isPublic),
  }))
  .filter((garden) => garden.memories.length > 0)
