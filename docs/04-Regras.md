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

Na versão 1.0 não existem regras oficiais de empate.

Toda partida deverá terminar com um vencedor.

Regras adicionais poderão ser incluídas em versões futuras.

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