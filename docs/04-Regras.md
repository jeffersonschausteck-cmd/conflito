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
- Exceção: o Explorador que se move mais de uma casa em uma única ação é revelado para ambos os jogadores. Mover uma única casa não revela o Explorador.
- Exceção: a Bandeira é sempre visível para os dois jogadores, desde o início da partida. Saber onde ela está não dá a ela proteção: quem a defende precisa cercá-la com Bombas e peças. Na tela, ela é desenhada bem alta (cerca de três vezes a altura anterior), com haste longa e o pano ao vento, para ser vista de longe.

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

- Bomba
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

## Espião

Possui força 1.

Quando ataca diretamente o Comandante, derrota-o independentemente da diferença de força.

Caso seja atacado pelo Comandante, será eliminado normalmente.

---

## Engenheiro

É a única peça capaz de neutralizar uma Bomba.

Ao atacar uma Bomba:

- A Bomba é removida.
- O Engenheiro permanece no tabuleiro.

---

## Explorador

Possui movimentação especial.

Pode mover-se qualquer quantidade de casas em linha reta (horizontal ou vertical), desde que todas as casas do percurso estejam livres.

Caso encontre uma peça inimiga, encerra imediatamente seu movimento e inicia o combate.

Ao se mover mais de uma casa em uma única ação, o Explorador é revelado para ambos os jogadores (seção 7). Ao se mover uma única casa, permanece oculto.

---

## Bomba

Não possui força.

Não pode ser movimentada.

Qualquer peça que ataque uma Bomba será eliminada, exceto o Engenheiro.

---

## Bandeira

Não possui força.

Não pode ser movimentada.

Sua captura encerra imediatamente a partida.

---

# 12. Vitória

A vitória ocorre quando um jogador captura a Bandeira adversária.

A partida é encerrada imediatamente.

---

# 13. Empate

Não existe empate: toda partida termina com um vencedor.

Nos modos com Ritmo (seção 17), quando o limite de rodadas é atingido, o vencedor é decidido por pontos, com critérios de desempate que garantem sempre um vencedor.

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

- Mover uma Bomba.
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

# 17. Ritmo da Partida (modos Rápida e Relâmpago)

O Conflito possui três ritmos. O ritmo é escolhido antes da partida e vale para os dois jogadores.

| Ritmo | Rodadas | Relógio por jogador | Tempo por jogada | Maré |
|-------|---------|---------------------|------------------|------|
| Clássica | sem limite | sem relógio | sem limite | não há |
| Rápida | 30 | 5 minutos | 20 segundos | começa na rodada 18, sobe a cada 3 rodadas (até 3 faixas) |
| Relâmpago | 20 | 3 minutos | 15 segundos | começa na rodada 10, sobe a cada 2 rodadas (até 4 faixas) |

**Estado atual: Rápida e Relâmpago estão bloqueadas (aparecem como "Em breve") e a Maré não ocorre.** Só a Clássica está liberada, até os ajustes abaixo. A flag é `PACES_ENABLED` em `matchRules.ts`.

Problemas conhecidos, a resolver antes de liberar:
- **Maré rápida demais:** as zonas de posicionamento ficam nas faixas externas, então a retaguarda é inundada antes de dar tempo de mover essas peças (mover uma peça por turno não evacua o exército).
- **Exército e tabuleiro iguais em todos os ritmos:** os ritmos não reduzem hoje o número de peças nem o tamanho do mapa; só mudam relógio e limite de rodadas.

Uma rodada é uma jogada de cada jogador. O contador de turnos do Motor conta cada jogada separadamente; a rodada é derivada dele.

## Relógio

- Cada jogador tem um tempo total. O tempo corre apenas durante o turno do próprio jogador.
- Quando o tempo total de um jogador chega a zero, ele perde a partida (motivo: tempo esgotado).
- Cada jogada tem também um tempo máximo. Se ele acabar, o jogo faz uma jogada automática segura: move uma peça que possa se mover, sem atacar quando existir alternativa, escolhendo o avanço em direção ao inimigo. Se nenhuma peça puder se mover, o turno é encerrado.

## Maré

- A partir da rodada inicial da Maré, a faixa externa do campo é inundada. A cada intervalo a próxima faixa é inundada.
- Casas inundadas não podem ser ocupadas nem atravessadas.
- Peças que se movem e estiverem em uma casa inundada são eliminadas no instante da inundação.
- Bombas e Bandeira não se movem e não são eliminadas pela Maré. A casa onde ficam continua podendo ser atacada.
- A interface avisa a Maré com até 2 rodadas de antecedência.

## Fim por limite de rodadas

Quando a última rodada termina sem que a Bandeira tenha sido capturada, vence quem tiver mais pontos.

- Pontos por peça inimiga capturada: o valor da patente da peça (Comandante 7, Oficial 6, Atirador 5, Infantaria 4, Engenheiro 3, Explorador 2, Espião 1; Bomba 4).
- Ponto por peça própria ainda viva: 1 ponto cada.
- Bandeira ainda viva: 10 pontos.
- Desempate, nesta ordem: maior valor capturado; mais peças vivas; vence o Vermelho (que joga por segundo).

Toda partida em ritmo Rápida ou Relâmpago termina por Bandeira, por tempo esgotado ou por pontos.

---

# 18. Lado do Jogador

- Contra o computador, o lado do jogador (Azul ou Vermelho) é sorteado no início de cada partida, com a mesma chance para os dois. O computador joga com o outro lado.
- No online, o lado é definido pela sala: quem entra primeiro joga de Azul e o segundo jogador joga de Vermelho.
- O Azul sempre começa jogando, qualquer que seja o lado do humano.
- Em qualquer lado, o jogador vê o seu exército à esquerda da tela e o inimigo à direita (a câmera gira para quem joga de Vermelho).

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

- Inclusão dos ritmos Rápida e Relâmpago: relógio, tempo por jogada, Maré e vitória por pontos (seção 17).
- Revisão da seção 13 (Empate).
- Bandeira sempre visível (seção 7) e lado do jogador sorteado contra o computador (seção 18).
