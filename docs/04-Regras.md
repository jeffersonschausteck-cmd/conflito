# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 04 - Regras Oficiais

**Projeto:** Conflito

**Versão:** 1.0

**Status:** Aprovado

**Última atualização:** Julho de 2026

---

# Objetivo

Este documento estabelece todas as regras oficiais do Conflito.

Toda partida deverá seguir exatamente as regras aqui descritas.

Sempre que houver divergência entre a implementação e este documento, a implementação deverá ser corrigida ou este documento revisado.

---

# 1. Objetivo da Partida

O objetivo principal é localizar e capturar a Bandeira adversária.

No momento em que a Bandeira é capturada, a partida termina imediatamente.

---

# 2. Jogadores

Cada partida possui exatamente dois jogadores.

Cada jogador controla um exército composto por quarenta peças.

Os jogadores são identificados pelas cores oficiais:

- Azul
- Vermelho

Ambos possuem exatamente as mesmas peças e as mesmas condições de vitória.

---

# 3. Preparação

Antes do início da partida:

- O tabuleiro é inicializado.
- Cada jogador recebe seu conjunto completo de peças.
- Os jogadores posicionam suas peças na área permitida do tabuleiro.
- Após confirmarem o posicionamento, a partida é iniciada.

---

# 4. Posicionamento Inicial

Durante a preparação:

- Apenas o próprio jogador poderá visualizar suas peças.
- O adversário não poderá conhecer a posição das peças inimigas.
- Após iniciar a partida, o posicionamento não poderá mais ser alterado.

---

# 5. Início da Partida

Após a confirmação do posicionamento:

- O jogo define o jogador que iniciará a partida.
- O primeiro turno é iniciado.
- As peças permanecem ocultas para o adversário.

---

# 6. Sistema de Turnos

A partida ocorre em turnos alternados.

Durante seu turno o jogador poderá realizar apenas uma ação principal.

Após concluir uma ação válida, o turno será encerrado automaticamente.

---

# 7. Informações Ocultas

Durante toda a partida:

- Cada jogador conhece apenas suas próprias peças.
- As peças adversárias permanecem ocultas.
- Uma peça somente é revelada quando ocorre um combate.
- Exceção: o Batedor que se move mais de uma casa em uma única ação é revelado para ambos os jogadores. Mover uma única casa não revela o Batedor.
- Exceção: a Bandeira é sempre visível para os dois jogadores, desde o início da partida. Saber onde ela está não dá a ela proteção: quem a defende precisa cercá-la com Armadilhas e peças. Na tela, ela é desenhada bem alta (cerca de duas vezes a altura anterior), com haste longa e o pano ao vento, para ser vista de longe.

Após revelada, sua identidade passa a ser conhecida por ambos os jogadores.

---

# 8. Regras de Movimentação

Uma movimentação somente será considerada válida quando:

- Respeitar as características da peça.
- Permanecer dentro dos limites do tabuleiro.
- Não atravessar outras peças.
- Não ocupar uma casa contendo uma peça da mesma equipe.

Caso a casa de destino contenha uma peça inimiga, inicia-se imediatamente um combate.

---

# 9. Peças Imóveis

As seguintes peças não podem ser movimentadas após o início da partida:

- Armadilha
- Bandeira

Qualquer tentativa de movimentação deverá ser considerada inválida.

---

# 10. Combate

Sempre que uma peça entrar em uma casa ocupada por uma peça adversária ocorrerá um combate.

As seguintes regras serão aplicadas:

- A peça de maior força vence.
- A peça derrotada é removida do tabuleiro.
- Caso ambas possuam a mesma força, ambas serão eliminadas.

As exceções encontram-se nas Regras Especiais.

---

# 11. Regras Especiais

## Assassino

Possui força 1.

Quando ataca diretamente o Rei, derrota-o independentemente da diferença de força.

Caso seja atacado pelo Rei, será eliminado normalmente.

---

## Sapador

É a única peça capaz de desarmar uma Armadilha.

Ao atacar uma Armadilha:

- A Armadilha é removida.
- O Sapador permanece no tabuleiro.

---

## Batedor

Possui movimentação especial.

Pode mover-se qualquer quantidade de casas em linha reta (horizontal ou vertical), desde que todas as casas do percurso estejam livres.

Caso encontre uma peça inimiga, encerra imediatamente seu movimento e inicia o combate.

Ao se mover mais de uma casa em uma única ação, o Batedor é revelado para ambos os jogadores (seção 7). Ao se mover uma única casa, permanece oculto.

---

## Armadilha

Não possui força.

Não pode ser movimentada.

Qualquer peça que ataque uma Armadilha será eliminada, exceto o Sapador.

---

## Bandeira

Não possui força.

Não pode ser movimentada.

Sua captura encerra imediatamente a partida.

---

# 12. Vitória

A vitória ocorre quando um jogador captura a Bandeira adversária.

A vitória também ocorre quando o adversário, na sua vez, não tem nenhuma peça que possa se mover (só restam Armadilhas e Bandeira): ele não consegue jogar e perde.

A partida é encerrada imediatamente.

---

# 13. Empate

Não existe empate: toda partida termina com um vencedor.

---

# 14. Encerramento

Após a vitória:

- O jogo encerra os turnos.
- Todas as peças são reveladas.
- O resultado da partida é exibido.
- Nenhuma nova ação poderá ser realizada.

---

# 15. Ações Inválidas

São consideradas ações inválidas:

- Mover uma Armadilha.
- Mover a Bandeira.
- Mover para fora do tabuleiro.
- Atravessar outras peças.
- Ocupar uma casa contendo uma peça da própria equipe.
- Realizar mais de uma ação principal por turno.

Toda ação inválida deverá ser recusada pelo Motor do Jogo.

---

# 16. Princípios Gerais

Todas as partidas do Conflito deverão respeitar os seguintes princípios:

- Estratégia acima da sorte.
- Informação limitada.
- Regras iguais para ambos os jogadores.
- Partidas equilibradas.
- Clareza nas regras.
- Consistência entre documentação e implementação.

---

# 17. Modos de Jogo (Partida Rápida, Normal e Intensa)

O Conflito possui três modos: Partida Rápida (a menor), Partida Normal e Partida Intensa (a maior, com o exército completo). O modo é escolhido antes da partida contra o computador e vale para os dois jogadores.

Os modos diferem **apenas no tamanho do tabuleiro e na quantidade de peças** (seção 19). Todas as demais regras (movimento, combate, informações ocultas, vitória) são idênticas nos três. Não há relógio, tempo por jogada, limite de rodadas nem pontuação: a partida só termina pelas regras da seção 12.

**Os três modos estão liberados.** A flag `PACES_ENABLED` em `matchRules.ts` permite bloquear um modo (ele aparece como "Em breve"). Internamente os modos se chamam `blitz` (Partida Rápida), `rapid` (Partida Normal) e `classic` (Partida Intensa).

---

# 18. Lado do Jogador

- Contra o computador, o lado do jogador (Azul ou Vermelho) é sorteado no início de cada partida, com a mesma chance para os dois. O computador joga com o outro lado.
- No online, o lado é definido pela sala: quem entra primeiro joga de Azul e o segundo jogador joga de Vermelho.
- O Azul sempre começa jogando, qualquer que seja o lado do humano.
- Em qualquer lado, o jogador vê o seu exército à esquerda da tela e o inimigo à direita (a câmera gira para quem joga de Vermelho).

---

# 19. Formato de Cada Modo (exército e tabuleiro)

Cada modo tem seu próprio tamanho de exército e de tabuleiro. As regras de movimento, combate e névoa são as mesmas.

| Modo | Tabuleiro (linhas × colunas) | Peças por lado | Zona de posicionamento |
|-------|------------------------------|----------------|------------------------|
| Partida Intensa | 12 × 18 | 40 | 4 colunas de cada ponta |
| Partida Normal | 10 × 14 | 30 | 3 colunas de cada ponta |
| Partida Rápida | 8 × 12 | 24 | 3 colunas de cada ponta |

Composição de cada exército:

| Peça | Intensa | Normal | Rápida |
|------|----------|--------|-----------|
| Rei | 1 | 1 | 1 |
| Duque | 2 | 1 | 1 |
| Arqueiro Real | 3 | 2 | 2 |
| Sapador | 8 | 5 | 4 |
| Guarda Real | 12 | 10 | 7 |
| Batedor | 6 | 5 | 3 |
| Assassino | 1 | 1 | 1 |
| Armadilha | 6 | 4 | 4 |
| Bandeira | 1 | 1 | 1 |
| **Total** | **40** | **30** | **24** |

- Os três modos valem contra o computador e também no online. Quem cria a sala online escolhe o modo; quem entra joga no modo da sala. O tabuleiro e o exército seguem o modo escolhido. No online toda partida é ranqueada (documento 16).
- A ranqueada é separada por modo: cada modo tem a sua própria pontuação, o seu ranking e as suas estatísticas (documento 16, seção "Ranqueada por modo"). Uma partida só mexe nos pontos do modo em que foi jogada.

---

# Visão para a Versão 1.0

Na versão 1.0 todas as regras deste documento deverão estar completamente implementadas pelo Motor do Jogo.

Nenhuma regra oficial poderá existir apenas na implementação.

---

# Histórico de Alterações

## Versão 1.0

- Criação do Livro Oficial de Regras do Conflito.
- Definição das regras da partida.
- Definição das regras de movimentação.
- Definição das regras de combate.
- Definição das regras especiais.
- Definição das condições de vitória.

## Versão 1.1

- Inclusão dos modos Partida Rápida, Normal e Intensa (antes Relâmpago, Rápida e Clássica), que diferem só no tamanho do tabuleiro e na quantidade de peças (seções 17 e 19). Não há relógio, limite de rodadas, pontuação nem Maré.
- Nova condição de vitória: o jogador da vez sem nenhuma peça móvel perde (seção 12).
- Revisão da seção 13 (Empate).
- Bandeira sempre visível (seção 7) e lado do jogador sorteado contra o computador (seção 18).
