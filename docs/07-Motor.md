# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 07 - Motor do Jogo

**Projeto:** Conflito

**Versão:** 1.0

**Status:** Aprovado

**Última atualização:** Julho de 2026

---

# Objetivo

Este documento define a arquitetura funcional do Motor do Jogo (Game Engine) do Conflito.

O Motor do Jogo é responsável por executar todas as regras oficiais da partida, controlar o estado do jogo e garantir que todas as ações sejam validadas de acordo com a documentação oficial.

O Motor do Jogo é a única autoridade sobre o estado da partida.

---

# Definição

O Motor do Jogo é responsável por transformar as ações dos jogadores em alterações válidas dentro da partida.

Nenhuma ação poderá modificar diretamente o estado do jogo sem passar pelo Motor.

---

# Responsabilidades

O Motor do Jogo deverá ser responsável por:

- Criar uma nova partida.
- Controlar o tabuleiro.
- Gerenciar as peças.
- Controlar os turnos.
- Validar movimentações.
- Resolver combates.
- Aplicar regras especiais.
- Atualizar o estado das peças.
- Detectar condições de vitória.
- Encerrar corretamente a partida.

---

# Princípios

O Motor deverá seguir os seguintes princípios:

- Independente da Interface.
- Independente da Inteligência Artificial.
- Independente do Multiplayer.
- Modular.
- Determinístico.
- Fácil manutenção.
- Fácil expansão.

---

# Estado da Partida

Durante toda a execução o Motor deverá controlar:

- Tabuleiro.
- Jogador atual.
- Turno atual.
- Posição de todas as peças.
- Peças reveladas.
- Peças eliminadas.
- Histórico de ações.
- Estado da partida.

---

# Fluxo Geral

Toda partida deverá seguir o seguinte fluxo:

1. Criar partida.
2. Posicionar peças.
3. Iniciar partida.
4. Executar turno.
5. Validar movimentação.
6. Resolver combate (quando existir).
7. Atualizar tabuleiro.
8. Verificar vitória.
9. Alternar turno.
10. Encerrar partida.

---

# Sistema de Turnos

O Motor deverá garantir que:

- Apenas um jogador possua o turno.
- Apenas uma ação principal seja executada por turno.
- O turno seja encerrado após uma ação válida.
- O próximo jogador receba automaticamente o turno.

---

# Sistema de Movimentação

Toda movimentação deverá ser validada antes de ser executada.

O Motor deverá impedir automaticamente qualquer movimento inválido.

Após uma movimentação válida, o estado do tabuleiro deverá ser atualizado.

---

# Sistema de Combate

Sempre que uma peça ocupar uma casa contendo uma peça adversária, o Motor deverá iniciar um combate.

O resultado deverá seguir exatamente as regras definidas no Documento 04 - Regras Oficiais e no Documento 06 - Peças.

Após o combate, o estado do tabuleiro deverá ser atualizado imediatamente.

---

# Sistema das Peças

Cada peça deverá possuir internamente:

- Identificador único.
- Tipo.
- Jogador.
- Força (quando aplicável).
- Posição.
- Estado.

---

# Sistema de Vitória

Após cada ação válida, o Motor deverá verificar se alguma condição de vitória foi atingida.

Caso positivo, a partida deverá ser encerrada imediatamente.

---

# Interface

A Interface do Usuário não poderá alterar diretamente o estado do jogo.

Toda ação executada pelo jogador deverá ser enviada ao Motor.

O Motor validará a ação e retornará o novo estado da partida.

---

# Inteligência Artificial

A Inteligência Artificial utilizará exatamente as mesmas regras disponíveis para um jogador humano.

A IA não poderá acessar informações ocultas nem modificar diretamente o estado da partida.

---

# Multiplayer

O Multiplayer utilizará o Motor do Jogo como autoridade sobre todas as regras.

As ações enviadas pelos jogadores deverão ser validadas antes de serem aplicadas.

---

# Registro de Eventos

O Motor deverá registrar todos os eventos importantes da partida.

Exemplos:

- Início da partida.
- Início do turno.
- Movimentação.
- Combate.
- Revelação de peças.
- Captura da Bandeira.
- Encerramento.

Esse registro poderá ser utilizado futuramente para histórico de partidas, replay e depuração.

---

# Visão para a Versão 1.0

Na versão 1.0 o Motor do Jogo deverá:

- Implementar todas as regras oficiais do Conflito.
- Funcionar de forma independente da Interface.
- Permitir partidas contra Inteligência Artificial.
- Permitir partidas Multiplayer.
- Possuir arquitetura modular.
- Servir como única fonte de verdade sobre o estado da partida.

---

# Histórico de Alterações

## Versão 1.0

- Criação do documento oficial do Motor do Jogo.
- Definição das responsabilidades da Engine.
- Definição do fluxo geral da partida.
- Definição da arquitetura funcional.