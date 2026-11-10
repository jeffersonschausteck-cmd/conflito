# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 08 - Interface do Usuário

**Projeto:** Conflito

**Versão:** 1.0

**Status:** Aprovado

**Última atualização:** Julho de 2026

---

# Objetivo

Este documento define a arquitetura, os princípios e os padrões da Interface do Usuário (UI) do Conflito.

A Interface é responsável por permitir que o jogador interaja com o jogo, apresentando todas as informações de maneira clara, organizada e intuitiva.

A Interface nunca deverá implementar regras do jogo, sendo responsável apenas pela apresentação visual e pela interação do jogador.

---

# Responsabilidades

A Interface do Usuário deverá ser responsável por:

- Exibir todas as telas do jogo.
- Exibir o tabuleiro.
- Exibir as peças.
- Receber ações do jogador.
- Exibir animações.
- Exibir mensagens do sistema.
- Exibir informações da partida.
- Exibir menus e configurações.

Toda a lógica da partida pertence exclusivamente ao Motor do Jogo.

---

# Princípios

Toda Interface do Conflito deverá seguir os seguintes princípios:

- Clareza.
- Simplicidade.
- Consistência.
- Responsividade.
- Acessibilidade.
- Alto desempenho.
- Identidade visual única.

---

# Comunicação com o Motor

Toda interação seguirá obrigatoriamente o seguinte fluxo:

Jogador

↓

Interface

↓

Motor do Jogo

↓

Interface

↓

Jogador

A Interface nunca poderá alterar diretamente o estado da partida.

---

# Estrutura da Interface

A Interface será organizada em telas independentes.

As principais telas da versão 1.0 são:

- Tela Inicial.
- Menu Principal.
- Configurações.
- Seleção de Facção.
- Posicionamento das Peças.
- Partida.
- Resultado.
- Créditos.

Cada tela deverá possuir apenas uma responsabilidade.

---

# Interface da Partida

Durante a partida a Interface deverá apresentar:

- Tabuleiro.
- Peças.
- Jogador da vez.
- Turno atual.
- Informações da partida.
- Mensagens do sistema.
- Controles disponíveis.

Somente informações permitidas pelas regras poderão ser exibidas.

---

# Tabuleiro

O tabuleiro representa a área principal da partida.

A Interface deverá:

- Exibir corretamente todas as casas.
- Atualizar movimentações.
- Atualizar combates.
- Atualizar peças eliminadas.
- Atualizar peças reveladas.

Todas essas informações serão fornecidas pelo Motor do Jogo.

---

# Peças

Cada peça deverá possuir representação visual própria.

A Interface deverá indicar visualmente:

- Peça selecionada.
- Peça disponível para movimentação.
- Peça revelada.
- Peça eliminada.
- Peça pertencente ao jogador.
- Peça pertencente ao adversário.

---

# Feedback Visual

Toda ação do jogador deverá produzir um retorno visual.

Exemplos:

- Seleção.
- Movimento.
- Combate.
- Vitória.
- Derrota.
- Movimento inválido.

O objetivo é informar claramente o resultado de cada ação.

---

# Informações Ocultas

A Interface deverá respeitar completamente o sistema de informação oculta.

Nunca poderá revelar:

- A força de peças inimigas ocultas.
- A identidade de peças não reveladas.
- Informações não descobertas durante a partida.

---

# Responsividade

A Interface deverá adaptar-se automaticamente a diferentes resoluções.

Plataformas suportadas:

- Desktop.
- Tablet.
- Smartphone.

Todos os elementos deverão permanecer utilizáveis independentemente do tamanho da tela.

---

# Identidade Visual

A Interface seguirá a identidade oficial do Conflito.

Os principais elementos visuais incluem:

- Estilo militar futurista.
- Paleta oficial de cores.
- Ícones padronizados.
- Tipografia consistente.
- Efeitos visuais discretos.
- Interface limpa.

---

# Acessibilidade

A Interface deverá priorizar:

- Boa legibilidade.
- Alto contraste.
- Ícones intuitivos.
- Navegação simples.
- Fácil utilização em dispositivos móveis.

---

# Desempenho

A Interface deverá priorizar:

- Carregamento rápido.
- Baixo consumo de recursos.
- Atualizações suaves.
- Boa experiência em qualquer dispositivo.

---

# Visão para a Versão 1.0

Na versão 1.0 a Interface deverá:

- Ser totalmente responsiva.
- Funcionar em desktop, tablet e smartphone.
- Possuir identidade visual consistente.
- Integrar-se completamente ao Motor do Jogo.
- Oferecer excelente experiência de uso.
- Seguir integralmente os princípios definidos neste documento.

---

# Oficina do Exército

O menu principal possui uma tela chamada Oficina, onde o jogador escolhe a aparência dos seus personagens e salva o resultado. A Oficina é somente estética e não pode ser acessada para alterar o visual durante a partida.

A especificação completa está no documento 17 - Oficina do Exército.

---

# Histórico de Alterações

## Versão 1.0

- Criação do documento oficial da Interface do Usuário.
- Definição das responsabilidades da Interface.
- Definição dos princípios de usabilidade.
- Definição da comunicação com o Motor do Jogo.
- Definição das diretrizes de responsividade.

## Versão 1.1

- Inclusão da seção sobre a Oficina do Exército (documento 17).

---

# Escolha do Modo de Jogo

A escolha do modo é uma tela própria, entre o Centro de Operações e o Posicionamento, com três cartões: Partida Rápida, Partida Normal e Partida Intensa (do menor para o maior).

- Cada cartão mostra só o que muda entre os modos: a quantidade de peças e o tamanho do tabuleiro (documento 04, seção 19). Não há tempo estimado nem tempo de partida.
- A barra superior da partida mostra o cronômetro corrido de sempre. Não existe relógio por jogador, tempo por jogada nem limite de rodadas em nenhum modo.

---

# Movimento e Combate na Partida 3D

- **Caminhada:** ao se mover, a peça caminha até a casa de destino (animação de andar, virada para a direção do movimento) em vez de aparecer lá. Quanto mais longe a casa, mais longa a caminhada.
- **Combate na casa do alvo:** quando uma peça se move para uma casa com peça inimiga, ela caminha até lá e a luta acontece naquela casa: as duas peças atacam, o impacto aparece no ponto do encontro e quem perde cai ali mesmo. A peça vencedora fica na casa. O resultado das regras (documento 04) é o mesmo de sempre; só a apresentação muda.
- **Captura da Bandeira:** quem captura a Bandeira caminha até ela, se abaixa e a pega, e a Bandeira desce pela haste até embaixo. Só depois dessa animação (cerca de 2 segundos depois de a peça chegar) aparece a tela de vitória ou derrota. As regras não mudam: a partida já está encerrada no instante da captura; só a tela final espera a animação terminar.
- **Ordem da luta, sem pressa:** (1) o atacante caminha até colar no alvo; (2) as duas peças atacam; (3) quem perdeu cai e fica caído um instante; (4) se o atacante venceu, ele dá o último passo, caminhando, até a casa do alvo. Nada pula de uma posição para a outra.
- A identidade de uma peça inimiga que ainda estava oculta só é mostrada quando as peças se encontram.
- **Sem bases sob as peças:** as peças ficam direto no tabuleiro, sem a plataforma colorida embaixo. O time é identificado pela cor da roupa: o Azul veste azul e o Vermelho veste vermelho (a cor escolhida na Oficina do Exército continua valendo para as peças do jogador).
- **Bandeira sempre à mostra:** a Bandeira nunca vira silhueta, nem durante a luta ou a captura (regra de visibilidade da seção 7 do documento 04).
- **Castelos:** o castelo azul e o castelo vermelho ficam nas pontas esquerda e direita do tabuleiro, logo atrás das muralhas laterais (na altura do portão), apoiados num chão de grama para não flutuar na água. Ficam fora do campo, sem cobrir peças nem casas. No menu e nas telas de fundo eles seguem ao fundo do cenário.
