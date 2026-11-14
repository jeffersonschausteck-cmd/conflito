# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 19 - Mapas e Cenários

Versão: 1.0

---

# Objetivo

Para o jogo não ter sempre o mesmo cenário, cada modo de partida tem **5 mapas diferentes**. Como existem 3 tamanhos de tabuleiro (documento 04, seção 19), o jogo tem **15 mapas** no total: cada um dos 5 cenários existe nos 3 tamanhos.

Os mapas só mudam o terreno e o visual. As regras de movimento, combate, neblina e vitória são as mesmas em todos (documento 04).

---

# Os 5 cenários

Todos seguem o tema de monarquia: reino medieval, castelos, muralhas, vilas e campos.

| Cenário | Terreno | Visual |
|---------|---------|--------|
| **Planície Real** | Lago no centro, estrada, florestas e montanhas | Tarde dourada, o cenário clássico do jogo |
| **Vale do Rio** | Rio no meio do campo, atravessado por pontes, com povoados nas margens | Manhã clara, grama de primavera, moinhos e casas |
| **Bosque Real** | Floresta densa com corredores estreitos e rochedos | Fim de tarde alaranjado, grama escura, muitas árvores |
| **Passo da Montanha** | Cordilheira no meio com passagens, rochedos nos lados | Céu frio e prateado, grama acinzentada, colinas e pedras |
| **Fosso do Castelo** | Uma torre no centro cercada por um fosso, com travessias | Pôr do sol avermelhado, torres e muralhas ao redor |

Cada cenário tem o seu céu, a cor da luz e da névoa, a cor da grama e do mar, os modelos de árvores, montanhas, rochedos e povoados e os enfeites do terreno que cerca o tabuleiro. Os modelos vêm dos pacotes de arte já usados no jogo (documento 11).

---

# Regras de todo mapa

Todo mapa, em qualquer tamanho, cumpre estas regras (verificadas por teste automático):

- **Tamanho:** o do modo (12 × 18, 10 × 14 ou 8 × 12).
- **Zonas de posicionamento livres:** as colunas de cada ponta (3 ou 4) são terreno livre, para o exército inteiro caber sem sobras.
- **Justo para os dois lados:** o terreno que bloqueia é espelhado entre a esquerda e a direita; nenhum lado começa com vantagem de terreno.
- **Sem lado isolado:** todas as casas livres se conectam; sempre existe caminho entre os dois exércitos.
- **Campo aberto:** pelo menos 70% das casas do mapa continuam livres.

## Tipos de terreno

| Terreno | Bloqueia? | Observação |
|---------|-----------|------------|
| Planície, estrada | Não | Casas livres |
| Floresta, água, montanha | Sim | Nenhuma peça entra nem atravessa |
| **Rochedo** | Sim | Novo: pedras grandes (Bosque Real e Passo da Montanha) |
| **Povoado** | Sim | Novo: moinhos, casas e torres (Vale do Rio e Fosso do Castelo) |

As pontes e as passagens são casas de estrada sobre o rio ou entre as montanhas.

---

# Escolha do mapa

## Contra o computador (Campanha)

Ao escolher o modo, o jogador vê uma **roleta de mapas**: uma barra com os 5 mapas daquele modo gira e para num deles, sorteado ao acaso, que será o mapa da partida. A roleta não pede nenhuma decisão do jogador. Cada partida contra o computador sorteia de novo.

## No online

**Quem cria a sala escolhe o mapa**, junto com o modo, na tela de criar sala. A escolha vale para os dois jogadores; quem entra joga no mapa da sala e vê qual é na sala de espera. O servidor confere a escolha: um mapa que não existe para o modo escolhido vira o primeiro mapa daquele modo.

A ranqueada continua separada só por modo (documento 16); o mapa não cria um ranking novo.

---

# Imagens de prévia

Cada mapa aparece na roleta e na escolha da sala com uma prévia pequena desenhada a partir do próprio terreno (casas coloridas por tipo), junto com o nome do cenário.

---

# Histórico

- Criação do documento: 5 cenários em 3 tamanhos (15 mapas), roleta na Campanha e escolha do mapa pelo anfitrião no online.

## Sem casas de base nos cantos

Os mapas não têm mais as casas coloridas com uma bandeirinha nos quatro cantos do tabuleiro: essas casas agora são grama igual às demais. Não mudava nenhuma regra.
