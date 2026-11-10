# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 17 - Oficina do Exército

**Projeto:** Conflito

**Versão:** 1.1

**Status:** Em revisão

**Última atualização:** Novembro de 2026

---

# Objetivo

Este documento define a Oficina do Exército: o recurso que permite a cada jogador escolher a aparência dos seus personagens antes das partidas.

A Oficina é exclusivamente estética. Ela nunca altera regras, atributos, movimentação, combate ou qualquer comportamento do Motor do Jogo.

Este documento complementa os documentos 04 (Regras), 06 (Peças), 08 (Interface), 10 (Multiplayer) e 11 (Arte). Em caso de conflito sobre regras do jogo, prevalecem os documentos 04 e 06.

---

# Princípios

A Oficina deverá seguir os seguintes princípios:

- Somente aparência.
- Nenhuma vantagem competitiva.
- Informação oculta preservada.
- Regras iguais para ambos os jogadores.
- Escolha feita fora da partida.
- Valores inválidos nunca quebram o jogo.
- Leitura clara do tipo da peça.

---

# O que pode ser personalizado

A personalização vale para cada **tipo** de peça, nunca para uma peça individual. Todas as peças do mesmo tipo usam o mesmo visual.

Peças personalizáveis (sete):

- Comandante
- Oficial
- Franco-atirador
- Infantaria
- Engenheiro
- Explorador (Batedor)
- Espião

Bomba e Bandeira são objetos e não entram na personalização.

Para cada peça personalizável o jogador escolhe:

| Item | Opções |
|------|--------|
| Modelo | 11 personagens: 6 Aventureiros, 4 Esqueletos e o Manequim |
| Cor da roupa | Cor do time (padrão) ou uma de 10 cores |
| Chapéu | Padrão da peça, do modelo, nenhum, quepe militar, capacete de obra, capacete de mineração |
| Arma (mão direita) | Nenhuma ou uma de 13 armas |
| Escudo (mão esquerda) | Nenhum ou um de 5 escudos |

O catálogo oficial de opções vive em um único arquivo (`src/config/skinCatalog.ts`), usado tanto pela Interface quanto pelo servidor. Nenhuma opção existe fora dele.

---

# Regras

## 1. Somente antes da partida

O jogador só pode alterar o visual fora de uma partida, na Oficina, acessada pelo Centro de Operações (tela de escolha de modo).

Durante a partida (a partir do início da fase de jogo) o visual fica travado. O servidor recusa qualquer tentativa de alteração durante a partida.

Alterar o visual durante o posicionamento, antes da partida começar, ainda é permitido.

## 2. Salvar

As alterações feitas na Oficina ficam em um rascunho. Elas só passam a valer nas partidas quando o jogador seleciona **Salvar**.

O jogador pode:

- Salvar o rascunho.
- Descartar o rascunho e voltar ao último visual salvo.
- Restaurar o visual padrão.
- Aplicar um conjunto pronto.
- Sortear um visual aleatório.

Aplicar um conjunto pronto ou sortear um visual altera apenas o rascunho. Nada é salvo sem confirmação.

## 3. Cor do time

Cada time continua identificado pela cor da base sob a peça (azul ou vermelha), independentemente do visual escolhido. A cor da roupa escolhida pelo jogador nunca substitui essa identificação.

Na ausência de escolha, a cor principal da roupa segue a cor do time.

## 4. Espião

O Espião é sempre todo preto. A cor da roupa do Espião não é personalizável. O jogador pode escolher modelo, chapéu, arma e escudo do Espião.

## 5. Informação oculta

A Oficina nunca revela informação oculta (documento 04, seção 7):

- Uma peça inimiga não revelada é sempre exibida como o mesmo vulto encapuzado preto, para todos os tipos, inclusive Bomba e Bandeira.
- O visual escolhido pelo adversário só é visto quando a peça é revelada em combate.
- O visual descreve apenas como cada **tipo** de peça é desenhado. Ele nunca informa onde as peças estão nem qual peça oculta é qual.

## 6. Leitura do tipo da peça

Como o visual é livre, uma peça revelada do adversário deve continuar identificável. Por isso, toda peça revelada do adversário exibe uma etiqueta com o nome e a força, por exemplo "Infantaria · 4".

## 7. Tamanho

O tamanho de uma peça na tela depende apenas do seu tipo, nunca do modelo escolhido. Ao trocar de modelo, o tamanho é ajustado pela altura do modelo para que a peça não cresça nem encolha.

Nenhuma opção altera o tamanho da área clicável, a posição ou a ordem das peças.

---

# Armazenamento e validação

O visual salvo fica no navegador do jogador, sob a chave `conflito:skins:v1`.

Toda leitura passa por uma validação única (`sanitizeSkins`):

- Valores fora do catálogo viram o valor padrão, campo a campo.
- Peças ausentes ficam no visual padrão.
- Campos e peças desconhecidos são descartados.
- Entradas inválidas (nulas, de outro tipo, textos enormes) viram o visual padrão completo.

Se o navegador não permitir armazenamento (por exemplo, janela privada), o visual vale apenas durante a sessão.

---

# Multiplayer

O visual viaja por dois eventos do protocolo (documento 10):

- **SetSkins** (Cliente → Servidor): o jogador envia o visual salvo.
- **SkinsUpdated** (Servidor → Cliente): o servidor devolve aos dois jogadores o visual validado de cada lado.

Regras:

- O servidor nunca confia no cliente. Todo `SetSkins` passa por `sanitizeSkins`.
- Apenas jogadores da própria sala podem enviar `SetSkins`.
- Cada jogador altera somente o seu próprio visual.
- Durante a partida, o servidor responde com `ActionRejected` ("O visual não pode ser alterado durante a partida.") e o cliente não envia nada.
- O visual de cada jogador é guardado junto do estado da sala e sobrevive a reconexões e recargas: ao se conectar, o jogador recebe o visual conhecido dos dois lados.
- O visual não participa de nenhuma regra, turno ou sincronização do estado do jogo.

Sem partida online, ou antes de o visual do adversário chegar, as peças do adversário usam o visual padrão.

---

# Interface

A Oficina é uma tela própria, acessada por um cartão no Centro de Operações (junto de Campanha e Multijogador).

A tela contém:

- Lista das sete peças personalizáveis, com a força de cada uma.
- Prévia 3D do personagem escolhido, girando sobre a base do time, mostrando modelo, cor, chapéu, arma e escudo.
- Opções de modelo, cor, chapéu, arma e escudo.
- Conjuntos prontos: Padrão, Aventureiros armados, Exército de esqueletos e Manequins.
- Botão de visual aleatório.
- Botões Salvar, Descartar, Restaurar padrão e Voltar ao menu.
- Indicação de alterações não salvas.

Não existe edição do visual dentro da tela da partida.

---

# Arte

Os personagens e acessórios usados pela Oficina vêm do pacote KayKit (Kay Lousberg), distribuído sob licença Creative Commons Zero (CC0): Adventurers, Skeletons, Character Animations e Mixed Bag (personagens, animações, armas, escudos e capacete de mineração). O cenário e a Bomba usam os pacotes Medieval Hexagon e Platformer, do mesmo autor e com a mesma licença.

Regras visuais:

- Todos os personagens compartilham o mesmo esqueleto de animação e a mesma animação de repouso.
- Armas e escudos são encaixados nas mãos e orientados pelo corpo do personagem.
- A cor da roupa troca apenas os pixels da roupa principal do modelo. Pele, cabelo, couro, metal e acessórios não mudam.
- Nenhum personagem usa capa em partida, exceto o Espião, cujo visual é fixo (roupa e capa pretas).

Limites do catálogo atual:

- Não há troca de rosto, cabelo ou corpo próprio.
- Há apenas 11 corpos disponíveis.
- Alguns chapéus fazem parte do modelo e só podem ser trocados por outros chapéus do catálogo.

---

# Testes obrigatórios

Antes de qualquer alteração no catálogo ou no protocolo da Oficina, os seguintes testes devem passar:

- `scripts/test-skins-validation.ts`: validação do catálogo, dos conjuntos prontos e do sorteio aleatório.
- `scripts/test-skins-sync.ts`: comportamento do cliente (envio, bloqueio durante a partida, reconexão).
- `scripts/test-skins-online.ts`: dois jogadores contra o servidor local (cadastro, sala, visual, correção de valores inválidos, bloqueio durante a partida e reconexão).

O teste online deve sempre usar o servidor local. Nunca deve apontar para o servidor de produção.

---

# Fora do escopo da versão 1.1

- Salvar o visual na conta do jogador (hoje fica no navegador).
- Personalizar peças individuais.
- Mostrar o visual do adversário no modo 3D online completo (hoje o modo 3D é jogado contra a IA).
- Itens obtidos por progressão, compra ou ranking.
- Rosto, cabelo ou modelos criados pelo jogador.

---

# Visão para a Versão 1.1

Na versão 1.1 a Oficina deverá possuir:

- Escolha de modelo, cor, chapéu, arma e escudo para as sete peças personalizáveis.
- Salvamento do visual fora da partida.
- Bloqueio do visual durante a partida, também no servidor.
- Validação única do visual no cliente e no servidor.
- Sincronização do visual entre os jogadores.
- Etiqueta de nome e força nas peças reveladas.
- Conjuntos prontos e visual aleatório.

---

# Histórico de Alterações

## Versão 1.1

- Criação do documento oficial da Oficina do Exército.
- Definição do escopo, das opções e das regras de personalização.
- Definição do bloqueio durante a partida e do fluxo Salvar.
- Definição da validação e do armazenamento do visual.
- Definição dos eventos de Multiplayer e das regras de informação oculta.
- Definição dos testes obrigatórios.
