# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 03 - Mecânicas do Jogo

**Projeto:** Conflito

**Versão:** 1.0

**Status:** Aprovado

**Última atualização:** Julho de 2026

---

# Objetivo

Este documento apresenta as mecânicas fundamentais do Conflito.

Seu objetivo é descrever como o jogo funciona em alto nível, servindo como base para as regras oficiais, implementação da engine e futuras expansões.

---

# Visão Geral

Conflito é um jogo de estratégia militar por turnos baseado em informação limitada.

Cada jogador controla um exército composto por diferentes unidades militares, cada uma com funções específicas.

Durante a partida, os jogadores alternam turnos realizando movimentações estratégicas até que um dos objetivos de vitória seja alcançado.

---

# Estrutura da Partida

Cada partida é composta pelas seguintes etapas:

1. Preparação do jogo.
2. Posicionamento inicial das peças.
3. Início da partida.
4. Alternância de turnos.
5. Movimentação.
6. Combate.
7. Verificação das condições de vitória.
8. Encerramento da partida.

---

# Turnos

A partida ocorre em turnos alternados.

Durante seu turno o jogador poderá realizar apenas uma ação principal.

Após finalizar sua ação, o turno será encerrado automaticamente.

---

# Informações Ocultas

A identidade das peças permanece oculta para o adversário.

Cada jogador conhece apenas suas próprias unidades.

As peças inimigas serão reveladas somente quando ocorrer combate ou outra mecânica específica permitir sua identificação.

A informação limitada faz parte da estratégia do jogo.

---

# Movimentação

As peças podem se deslocar pelo tabuleiro respeitando suas regras individuais.

Cada tipo de peça possui características próprias de movimentação.

Movimentos inválidos deverão ser impedidos automaticamente pelo motor do jogo.

---

# Combate

Quando uma peça entra em uma casa ocupada por uma unidade inimiga, ocorre um combate.

O resultado será determinado pelas regras oficiais de combate.

Após a resolução do combate, o estado do tabuleiro deverá ser atualizado imediatamente.

---

# Captura

Durante um combate poderá ocorrer:

- Vitória do atacante.
- Vitória do defensor.
- Eliminação de ambas as peças.

A resolução dependerá das regras específicas de cada unidade.

---

# Objetivo Estratégico

O jogador deverá:

- Descobrir a localização da bandeira adversária.
- Proteger sua própria bandeira.
- Administrar suas peças.
- Criar armadilhas.
- Enganar o adversário.
- Aproveitar oportunidades de ataque.

---

# Fog of War

O Conflito utiliza informação incompleta como elemento estratégico.

O jogador nunca possui conhecimento total do exército inimigo.

Cada combate revela novas informações que influenciam as decisões futuras.

---

# Interface

A interface deverá fornecer apenas as informações que o jogador realmente conhece.

Nenhum elemento visual poderá revelar informações ocultas do adversário.

---

# Inteligência Artificial

A IA utilizará exatamente as mesmas informações disponíveis para um jogador humano.

Ela não poderá acessar informações ocultas do adversário.

Todas as decisões deverão respeitar as mesmas regras da partida.

---

# Fluxo Geral da Partida

Preparação

↓

Posicionamento

↓

Turno Azul

↓

Turno Vermelho

↓

Movimentação

↓

Combate (quando houver)

↓

Atualização do tabuleiro

↓

Verificação das condições de vitória

↓

Novo turno

↓

Fim da partida

---

# Princípios das Mecânicas

Todas as mecânicas do jogo deverão seguir os seguintes princípios:

- Simples de compreender.
- Difíceis de dominar.
- Estratégicas.
- Justas.
- Consistentes.
- Expansíveis.

Nenhuma mecânica deverá existir apenas por complexidade.

Toda mecânica precisa melhorar a experiência do jogador.

---

# Visão para a Versão 1.0

Na versão 1.0 todas as mecânicas fundamentais deverão estar completamente implementadas.

Isso inclui:

- Sistema completo de turnos.
- Movimentação validada.
- Combate totalmente funcional.
- Captura da bandeira.
- Condições oficiais de vitória.
- Fog of War.
- Histórico de batalhas.
- Animações de combate.
- Sons.
- Inteligência Artificial integrada.
- Compatibilidade entre desktop e dispositivos móveis.

Todas essas mecânicas deverão funcionar de maneira consistente em qualquer plataforma suportada.

---

# Histórico de Alterações

## Versão 1.0

- Criação do documento oficial de Mecânicas do Jogo.
- Definição da estrutura geral da partida.
- Definição do fluxo principal.
- Definição dos princípios das mecânicas.