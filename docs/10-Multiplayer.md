# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 10 - Multiplayer

**Projeto:** Conflito

**Versão:** 1.0

**Status:** Aprovado

**Última atualização:** Julho de 2026

---

# Objetivo

Este documento define os princípios, responsabilidades e funcionamento do sistema Multiplayer do Conflito.

O Multiplayer permitirá que dois jogadores disputem uma partida online, respeitando integralmente as regras oficiais do jogo.

O sistema Multiplayer nunca será responsável pelas regras da partida, sendo responsável apenas pela comunicação entre os jogadores e pela sincronização do estado do jogo.

---

# Responsabilidades

O sistema Multiplayer deverá ser responsável por:

- Conectar dois jogadores.
- Criar partidas online.
- Sincronizar ações.
- Manter os jogadores conectados.
- Detectar desconexões.
- Encerrar corretamente as partidas.

Todas as regras da partida continuam sendo responsabilidade exclusiva do Motor do Jogo.

---

# Princípios

O Multiplayer deverá seguir os seguintes princípios:

- Sincronização confiável.
- Baixa latência.
- Integridade das informações.
- Segurança.
- Escalabilidade.
- Independência da Interface.

---

# Estrutura

Cada partida online deverá possuir:

- Identificador único.
- Dois jogadores.
- Estado da partida.
- Histórico de ações.
- Tempo de conexão.
- Situação da partida.

---

# Fluxo de Funcionamento

Uma partida multiplayer seguirá obrigatoriamente o seguinte fluxo:

1. Criação da partida.
2. Entrada dos jogadores.
3. Posicionamento das peças.
4. Início da partida.
5. Alternância de turnos.
6. Sincronização das ações.
7. Verificação das condições de vitória.
8. Encerramento da partida.

---

# Comunicação

Toda ação executada por um jogador deverá seguir o seguinte fluxo:

Jogador

↓

Interface

↓

Multiplayer

↓

Motor do Jogo

↓

Validação

↓

Atualização do estado da partida

↓

Sincronização

↓

Interface

↓

Jogadores

Nenhuma ação poderá ser aplicada sem validação do Motor do Jogo.

---

# Sincronização

O sistema deverá manter sincronizados:

- Estado do tabuleiro.
- Turno atual.
- Movimentação das peças.
- Resultado dos combates.
- Peças reveladas.
- Peças eliminadas.
- Estado da partida.

---

# Desconexão

Caso um jogador seja desconectado, o sistema deverá:

- Identificar a desconexão.
- Informar o jogador adversário.
- Preservar o estado da partida sempre que possível.
- Aplicar a regra definida para abandono da partida.

As regras específicas de reconexão poderão ser implementadas em versões futuras.

---

# Segurança

O sistema Multiplayer deverá garantir:

- Integridade das ações.
- Validação de todas as movimentações.
- Proteção contra ações inválidas.
- Sincronização consistente entre os jogadores.

---

# Integração com o Motor do Jogo

O Multiplayer não poderá alterar diretamente o estado da partida.

Todas as ações deverão ser enviadas ao Motor do Jogo para validação.

O Motor continuará sendo a única autoridade sobre as regras do Conflito.

---

# Interface

A Interface deverá informar ao jogador:

- Estado da conexão.
- Entrada do adversário.
- Início da partida.
- Desconexão.
- Encerramento da partida.

Nenhuma lógica de sincronização deverá ser implementada diretamente na Interface.

---

# Escalabilidade

A arquitetura do Multiplayer deverá permitir futuramente:

- Partidas ranqueadas.
- Partidas casuais.
- Salas privadas.
- Sistema de convites.
- Espectadores.
- Torneios.

Essas funcionalidades não fazem parte da versão inicial do projeto.

---

# Visão para a Versão 1.0

Na versão 1.0 o sistema Multiplayer deverá:

- Permitir partidas entre dois jogadores.
- Sincronizar corretamente todas as ações.
- Integrar-se completamente ao Motor do Jogo.
- Manter o estado da partida consistente entre os jogadores.
- Funcionar de maneira estável e confiável.

---

# Escolha do Mapa na Sala

Quem cria a sala escolhe o modo e também o **mapa** (um dos 5 daquele modo, documento 19). A escolha vale para os dois jogadores: o servidor guarda o mapa da sala, usa o terreno dele para validar o posicionamento e a partida e informa o mapa a quem entra. Um mapa inválido para o modo vira o primeiro mapa do modo. A ranqueada continua separada só por modo.

---

# Visual dos Personagens

O Multiplayer transporta o visual escolhido pelos jogadores (eventos SetSkins e SkinsUpdated). O servidor valida todo visual recebido, só o aceita antes da partida começar e nunca o usa em nenhuma regra ou sincronização do estado do jogo.

A especificação completa está no documento 17 - Oficina do Exército.

---

# Histórico de Alterações

## Versão 1.0

- Criação do documento oficial do Multiplayer.
- Definição das responsabilidades do sistema.
- Definição do fluxo de comunicação.
- Definição dos princípios de sincronização.
- Definição da integração com o Motor do Jogo.

## Versão 1.1

- Inclusão da seção sobre o visual dos personagens (documento 17).

---

# Revanche

Quando uma partida termina em vitória por captura da Bandeira ou por falta de peças móveis, e os dois jogadores continuam na sala, qualquer um pode pedir **revanche**.

- O pedido é o evento `Rematch`; o servidor guarda quem já pediu e avisa os dois pelo `RoomStateChanged` (campo `rematchPlayerIds`).
- Só vale com a sala em `finished`, com a partida já decidida e os dois jogadores presentes. Um jogador que saiu ou que perdeu por W.O. encerra a sala: não há revanche.
- Quando os dois pediram, o servidor apaga a partida anterior (estado, posicionamentos e prontidões), mantém jogadores, lados, modo, mapa, visual e tipo de sala, abre um novo Posicionamento com novo prazo e dá um novo identificador à partida (o Rating é processado de novo, normalmente, no fim dela).
- Os dois clientes recebem `RoomStateChanged` com status `deployment` e vão para a tela de Posicionamento; o resto do fluxo é o de sempre.

---

# Busca de Partida e Adversário do Computador

- **Eventos:** `FindRankedMatch` (com o modo) entra na fila; `CancelFindMatch` sai. O servidor responde `MatchSearchStarted` (com o prazo de 4 minutos) e `MatchSearchCancelled`. Quando há par, os dois recebem `RoomCreated` / `RoomJoined`, como numa sala criada à mão, e seguem o fluxo de sempre (sala de espera, posicionamento, partida).
- **Fila:** uma por modo, em memória da `AccountsRoom`. Uma conta só pode estar uma vez na fila. Quem se desconecta sai dela. Se o servidor reiniciar, o cliente refaz a busca ao reconectar.
- **Prazo:** 4 minutos (`MATCH_BOT_AFTER_MS`, configurável só para testes). Vencido o prazo, o servidor cria uma sala em que o segundo jogador é o computador.
- **Adversário do computador:** o jogador "computador" é registrado na sala com nome sorteado e identificador interno `bot:...`; o cliente não recebe nenhuma marca de que ele é o computador. Ele confirma a prontidão e o posicionamento sozinho (posicionamento inteligente, documento 09) e joga pelo servidor, com a mesma Inteligência Artificial de sempre, esperando entre 0,7 e 1,6 segundo por jogada. Ele só usa o que um jogador veria.
- **Resultado:** `process-ranked-result` aceita um lado `bot:...`: só a conta humana é alterada, com a pontuação virtual do computador (`botRatingOffset`, sorteado ao criar a sala). O histórico guarda o nome sorteado.
- **Revanche:** na sala com o computador, o pedido do jogador já vale pelos dois.
- **Mesma conta:** `add-player` recusa um segundo jogador da mesma conta na sala.
