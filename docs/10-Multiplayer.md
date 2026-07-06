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

# Histórico de Alterações

## Versão 1.0

- Criação do documento oficial do Multiplayer.
- Definição das responsabilidades do sistema.
- Definição do fluxo de comunicação.
- Definição dos princípios de sincronização.
- Definição da integração com o Motor do Jogo.