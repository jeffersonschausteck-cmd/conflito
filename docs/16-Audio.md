# DOCUMENTAÇÃO OFICIAL DO CONFLITO

# 16 - Áudio

**Projeto:** Conflito

**Versão:** 1.0

**Status:** Em definição (Sprint SFX-01)

**Última atualização:** Julho de 2026

---

# Objetivo

Este documento define a identidade sonora oficial do Conflito e levanta todos os efeitos sonoros (SFX) e músicas necessários para o jogo.

Nenhum áudio foi gerado, gravado ou implementado nesta sprint. Este documento é exclusivamente o planejamento — a fonte única de verdade para decidir, mais adiante, o que produzir e em que ordem.

---

# Princípios

A identidade sonora do Conflito deve lembrar um centro de comando militar futurista operando uma interface holográfica de alta tecnologia. Isso se traduz em regras concretas:

- **Poucos sons.** Cada efeito precisa justificar sua própria existência — se não melhora a leitura da partida, não entra.
- **Sons limpos e curtos.** Sem reverbs longos, sem "épico cinematográfico", sem orquestra. Bips, clicks digitais, pulsos eletrônicos, tons sintéticos — texturas de HUD, não de filme de guerra.
- **Silêncio é parte do design.** O jogo é de tabuleiro tático; a maior parte do tempo o jogador está pensando. Áudio constante cansa e atrapalha.
- **Um efeito, um significado.** Nenhum som deve ser reaproveitado para dois eventos diferentes — o jogador precisa aprender a associar som → acontecimento sem ambiguidade.
- **Nunca bloquear nem atrasar a interface.** Som é reação ao que já aconteceu na tela, nunca a causa de uma espera.

---

# Levantamento completo por categoria

Cada efeito é listado com: onde toca, quando toca, objetivo, prioridade, duração ideal, volume relativo e se pode repetir rapidamente.

## INTERFACE

### Hover em botão principal
- **Onde:** botões primários (Criar Sala, Iniciar Batalha, Confirmar, etc.) em todas as telas de menu.
- **Quando:** ao passar o cursor/foco pela primeira vez sobre o botão.
- **Objetivo:** reforçar a sensação de interface viva/reativa, tipo painel holográfico.
- **Prioridade:** Baixa.
- **Duração ideal:** 40–80 ms.
- **Volume relativo:** muito baixo (fundo).
- **Repetição rápida:** não deve — precisa de debounce por elemento (não retocar em re-hover imediato do mesmo botão).

### Clique em botão principal
- **Onde:** mesmos botões primários acima.
- **Quando:** no `click`, antes da navegação/ação disparar.
- **Objetivo:** confirmar que a intenção do jogador foi registrada.
- **Prioridade:** Alta.
- **Duração ideal:** 80–150 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** pode, mas naturalmente é raro (um clique por decisão).

### Navegação entre telas
- **Onde:** troca de rota (`/mode` → `/login`, `/deployment` → `/game`, etc.).
- **Quando:** ao montar a nova tela.
- **Objetivo:** marcar transição de "fase" do fluxo (não é o mesmo que um clique de botão comum).
- **Prioridade:** Média.
- **Duração ideal:** 150–250 ms.
- **Volume relativo:** médio-baixo.
- **Repetição rápida:** não deve — uma transição por vez, nunca sobrepor.

### Erro / ação rejeitada
- **Onde:** qualquer tela com formulário ou ação que pode falhar (login incorreto, `ActionRejected`, posicionamento inválido).
- **Quando:** no momento em que a mensagem de erro aparece.
- **Objetivo:** sinalizar "isso não é permitido" sem precisar ler o texto.
- **Prioridade:** Alta.
- **Duração ideal:** 150–200 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** não deve — se o jogador insistir no erro, o som não deve virar ruído de metralhadora (cooldown mínimo entre repetições, ex.: 1s).

---

## PARTIDA (fluxo geral)

### Início da partida (`GameStarted`)
- **Onde:** tela `/game`, no primeiro frame com o tabuleiro montado.
- **Quando:** uma única vez, ao carregar o estado inicial.
- **Objetivo:** marcar o início oficial do confronto — "sistemas online".
- **Prioridade:** Alta.
- **Duração ideal:** 1–2 s.
- **Volume relativo:** médio-alto (é um momento de destaque).
- **Repetição rápida:** não se aplica (evento único por partida).

### Seleção de peça própria
- **Onde:** tabuleiro, ao selecionar uma peça do próprio exército.
- **Quando:** no clique que confirma a seleção (`SELECT_PIECE` aceito).
- **Objetivo:** feedback tátil de "esta unidade está sob meu comando agora".
- **Prioridade:** Alta.
- **Duração ideal:** 60–100 ms.
- **Volume relativo:** baixo-médio.
- **Repetição rápida:** pode (trocar de seleção várias vezes é normal), mas cada nova seleção deve interromper a anterior, nunca acumular.

### Movimento de peça
- **Onde:** tabuleiro, ao confirmar um deslocamento válido.
- **Quando:** quando a peça efetivamente troca de hexágono (`ActionApplied` sem combate).
- **Objetivo:** confirmar que o movimento foi aceito pelo servidor.
- **Prioridade:** Alta.
- **Duração ideal:** 100–180 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** pode, um por movimento — nunca simultâneo a dois movimentos (não existe no motor, mas vale registrar a regra).

### Movimento inválido / fora de alcance
- **Onde:** tabuleiro, ao clicar um hexágono fora do alcance da peça selecionada.
- **Quando:** no clique rejeitado localmente (sem round-trip ao servidor).
- **Objetivo:** feedback imediato de "não pode ir aí".
- **Prioridade:** Média.
- **Duração ideal:** 80–120 ms.
- **Volume relativo:** baixo.
- **Repetição rápida:** precisa de cooldown — jogador clicando fora de alcance repetidamente não deve virar ruído irritante.

### Fim de turno
- **Onde:** tabuleiro, ao clicar "Finalizar Turno" e o servidor confirmar a troca de `currentPlayer`.
- **Quando:** na transição BLUE↔RED.
- **Objetivo:** marcar claramente "agora é a vez do outro lado" — importante porque os dois jogadores compartilham a mesma tela de regras.
- **Prioridade:** Alta.
- **Duração ideal:** 200–350 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** não se aplica (um por turno).

### Início do meu turno
- **Onde:** tabuleiro, quando `currentPlayer` passa a ser o lado do jogador local (`localOwner`).
- **Quando:** logo após o evento de fim de turno do adversário.
- **Objetivo:** chamar atenção de volta para a tela — o jogador pode ter desviado o olhar durante o turno alheio.
- **Prioridade:** Média.
- **Duração ideal:** 200–300 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** não se aplica.

---

## COMBATE

### Combate iniciado (impacto)
- **Onde:** tabuleiro, na casa onde duas peças se encontram.
- **Quando:** no início da animação de combate (`lastCombat` recebido).
- **Objetivo:** o momento de maior tensão da partida — precisa de peso sonoro proporcional.
- **Prioridade:** Alta.
- **Duração ideal:** 200–400 ms.
- **Volume relativo:** alto (o mais alto do jogo, com exceção de vitória/derrota).
- **Repetição rápida:** não se aplica (um combate por vez, o motor já serializa isso).

### Peça revelada
- **Onde:** tabuleiro, na peça que muda de "desconhecida" pra identidade real.
- **Quando:** junto do resultado do combate, quando `isRevealed` vira `true` (já existe um placeholder — `SoundHooks.playReveal`).
- **Objetivo:** reforçar a mecânica central de Fog of War — "agora você sabe o que era aquilo".
- **Prioridade:** Alta.
- **Duração ideal:** 150–250 ms.
- **Volume relativo:** médio-alto.
- **Repetição rápida:** pode (dois lados podem ser revelados no mesmo combate) — os dois toques devem ser distinguíveis, não uma cacofonia.

### Peça derrotada / removida do tabuleiro
- **Onde:** tabuleiro, na peça que perde o combate.
- **Quando:** logo após o som de revelação, ao confirmar que a peça foi eliminada.
- **Objetivo:** fechar o ciclo do combate com clareza de resultado.
- **Prioridade:** Alta.
- **Duração ideal:** 200–300 ms.
- **Volume relativo:** médio-alto.
- **Repetição rápida:** não se aplica.

### Bandeira capturada
- **Onde:** tabuleiro / overlay de fim de partida.
- **Quando:** no momento exato em que a Bandeira é capturada (gatilho de `gameOver`).
- **Objetivo:** o evento mais importante do jogo — precisa ser inconfundível.
- **Prioridade:** Alta.
- **Duração ideal:** 1–1.5 s.
- **Volume relativo:** alto.
- **Repetição rápida:** não se aplica (uma vez por partida).

---

## EVENTOS (posicionamento e vitória/derrota)

### Peça posicionada (Deployment)
- **Onde:** tela de Posicionamento, ao soltar uma peça numa casa da própria zona.
- **Quando:** a cada posicionamento bem-sucedido.
- **Objetivo:** feedback tátil rápido, sem chamar atenção.
- **Prioridade:** Média.
- **Duração ideal:** 40–80 ms.
- **Volume relativo:** baixo.
- **Repetição rápida:** sim — posicionar 40 peças em sequência é o fluxo normal; o som precisa ser leve o bastante pra não cansar em 40 repetições seguidas.

### Posicionamento automático
- **Onde:** tela de Posicionamento, botão "Posicionar Automaticamente".
- **Quando:** um único disparo ao clicar.
- **Objetivo:** confirmar a ação em lote sem repetir 40 vezes o som de peça individual.
- **Prioridade:** Média.
- **Duração ideal:** 300–500 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** não se aplica (ação única).

### Formação pronta
- **Onde:** tela de Posicionamento, painel de status.
- **Quando:** quando `isReady` passa de `false` para `true` (última peça posicionada).
- **Objetivo:** confirmar que o botão "Iniciar Batalha" está liberado.
- **Prioridade:** Média.
- **Duração ideal:** 150–250 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** não se aplica (dispara uma vez por transição de estado).

### Vitória
- **Onde:** overlay de Fim de Partida.
- **Quando:** quando `isVictory` é verdadeiro pra aquele jogador (`GameOverOverlay`).
- **Objetivo:** fechamento emocional positivo — é o clímax do lado vencedor.
- **Prioridade:** Alta.
- **Duração ideal:** 2–3 s.
- **Volume relativo:** alto.
- **Repetição rápida:** não se aplica.

### Derrota
- **Onde:** overlay de Fim de Partida.
- **Quando:** quando `isVictory` é falso pra aquele jogador.
- **Objetivo:** fechamento sóbrio, sem ser punitivo ou humilhante — mantém o tom "elegante" do jogo.
- **Prioridade:** Alta.
- **Duração ideal:** 1.5–2.5 s.
- **Volume relativo:** médio-alto.
- **Repetição rápida:** não se aplica.

---

## ONLINE (Lobby, Sala de Espera, Multiplayer)

### Sala criada / código gerado
- **Onde:** Sala Online, ao criar uma sala.
- **Quando:** ao receber `RoomCreated`.
- **Objetivo:** confirmar que a sala existe e está pronta pra compartilhar o código.
- **Prioridade:** Média.
- **Duração ideal:** 150–250 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** não se aplica.

### Adversário entrou na sala
- **Onde:** Sala de Espera.
- **Quando:** ao receber `RoomStateChanged` com o segundo jogador presente.
- **Objetivo:** é o momento em que a partida deixa de ser solitária — merece destaque.
- **Prioridade:** Alta.
- **Duração ideal:** 300–500 ms.
- **Volume relativo:** médio-alto.
- **Repetição rápida:** não se aplica (uma vez por sala).

### Adversário confirmou "Pronto"
- **Onde:** Sala de Espera.
- **Quando:** ao ver o status do outro jogador mudar pra "Pronto".
- **Objetivo:** avisar o jogador de que a bola está do lado dele agora.
- **Prioridade:** Média.
- **Duração ideal:** 150–250 ms.
- **Volume relativo:** médio.
- **Repetição rápida:** não se aplica.

### Conexão perdida / reconectando
- **Onde:** qualquer tela online, quando o `NetworkClient` detecta queda de socket.
- **Quando:** no instante da queda (não no sucesso da reconexão, que deve ser silencioso).
- **Objetivo:** avisar que algo está instável, sem alarmar demais (não é um erro do jogador).
- **Prioridade:** Baixa.
- **Duração ideal:** 200–300 ms.
- **Volume relativo:** baixo.
- **Repetição rápida:** não deve — cooldown alto (ex.: 5s), já que reconexões podem ocorrer em sequência.

---

## AMBIENTE

### Zumbido de fundo do HUD (loop ambiente)
- **Onde:** telas de menu e `/game`, como camada contínua muito sutil.
- **Quando:** enquanto a tela estiver montada.
- **Objetivo:** dar sensação de "sistema ligado", tipo sala de operações — textura, não elemento de atenção.
- **Prioridade:** Baixa.
- **Duração ideal:** loop contínuo, sem pontos de corte perceptíveis.
- **Volume relativo:** muito baixo (quase subliminar).
- **Repetição rápida:** é um loop — o cuidado aqui é o crossfade entre início e fim ser imperceptível.

---

## MÚSICAS

### Tema de Menu / Lobby
- **Onde:** todas as telas fora da partida (Início, Modo, Login, Sala Online, Sala de Espera, Posicionamento).
- **Quando:** em loop enquanto o jogador navega fora do tabuleiro.
- **Objetivo:** estabelecer a identidade sonora antes da partida começar — tom calmo, tecnológico, confiante.
- **Prioridade:** Média.
- **Duração ideal:** faixa de 1–2 min em loop perfeito.
- **Volume relativo:** baixo-médio (fundo, nunca compete com efeitos).
- **Repetição rápida:** não se aplica (loop de música, não SFX).

### Tema de Partida
- **Onde:** tela `/game`, do início ao fim da partida.
- **Quando:** em loop durante toda a partida, com leve dinamismo (pode ganhar um pouco de intensidade durante combates, se viável futuramente — não obrigatório na v1).
- **Objetivo:** manter tensão estratégica sem cansar durante partidas longas (podem durar dezenas de turnos).
- **Prioridade:** Média.
- **Duração ideal:** faixa de 2–3 min em loop perfeito.
- **Volume relativo:** baixo (mais baixo que o tema de menu — a partida em si já tem muito SFX).
- **Repetição rápida:** não se aplica.

---

# O que NÃO deve ter som

Regra geral: som marca **decisões e eventos**, nunca **atualizações passivas de tela**.

- **Não** tocar som em toda animação (glow de peça, pulso de destaque, fade de painel).
- **Não** tocar som em todo clique de hexágono vazio sem peça e sem ação válida.
- **Não** tocar som para qualquer atualização de HUD (contadores de peças, timers, textos de status).
- **Não** tocar som de hover em elementos secundários (badges, textos, ícones informativos) — só em botões de ação primária.
- **Não** tocar som a cada frame de uma animação contínua (ex.: "IA analisando..." piscando) — no máximo um som ao início, nunca em loop de piscar.
- **Não** duplicar som quando o mesmo evento chega por dois caminhos (ex.: reconexão que reenvia `GameStarted` não deve re-tocar o som de início de partida).
- **Não** tocar som em cada tecla digitada nos campos de Login/Cadastro.
- **Não** tocar som ambiente/música em volume que precise de "fade manual" perceptível pelo jogador — toda transição de volume deve ser automática e suave.

Motivo geral: o Conflito é um jogo de raciocínio lento (turnos, posicionamento, leitura de tabuleiro) — som em excesso é a forma mais rápida de destruir a sensação "elegante" pedida no objetivo desta sprint.

---

# Seleção final — versão essencial (v1)

Do levantamento completo acima, a lista abaixo é a selecionada para a primeira leva de produção: **18 efeitos sonoros + 2 músicas**.

## Efeitos sonoros (18)

**Interface (3)**
1. Clique em botão principal
2. Erro / ação rejeitada
3. Navegação entre telas

**Partida (5)**
4. Início da partida
5. Seleção de peça própria
6. Movimento de peça
7. Fim de turno
8. Início do meu turno

**Combate (4)**
9. Combate iniciado (impacto)
10. Peça revelada
11. Peça derrotada
12. Bandeira capturada

**Eventos (4)**
13. Formação pronta (Deployment)
14. Vitória
15. Derrota
16. Posicionamento automático

**Online (2)**
17. Adversário entrou na sala
18. Adversário confirmou "Pronto"

## Músicas (2)
1. Tema de Menu / Lobby
2. Tema de Partida

**Ficam de fora da v1** (podem entrar em sprint futura, listados no levantamento completo acima mas não essenciais agora): hover em botão, movimento inválido, peça posicionada (individual, no Deployment manual), sala criada, conexão perdida/reconectando, zumbido de fundo do HUD (ambiente).

---

# Ordem recomendada de produção

A ordem segue o caminho que o jogador percorre com mais frequência, priorizando o que aparece em toda partida antes do que aparece uma vez por sessão.

**Fase 1 — Núcleo da Partida (produzir primeiro)**
1. Clique em botão principal
2. Seleção de peça própria
3. Movimento de peça
4. Combate iniciado (impacto)
5. Peça revelada
6. Peça derrotada

Justificativa: são os seis sons que o jogador ouve dezenas de vezes em qualquer partida — se a identidade sonora funcionar aqui, funciona no jogo inteiro.

**Fase 2 — Estrutura de Turno e Fim de Jogo**
7. Fim de turno
8. Início do meu turno
9. Início da partida
10. Bandeira capturada
11. Vitória
12. Derrota

**Fase 3 — Fluxo Online e Deployment**
13. Adversário entrou na sala
14. Adversário confirmou "Pronto"
15. Formação pronta
16. Posicionamento automático

**Fase 4 — Polimento de Interface**
17. Erro / ação rejeitada
18. Navegação entre telas

**Fase 5 — Músicas** (produzir por último, depois que os SFX definirem o "volume de referência" do jogo)
19. Tema de Menu / Lobby
20. Tema de Partida

---

# Deixados para sprint futura (fora da v1)

- Hover em botão principal
- Movimento inválido / fora de alcance
- Peça posicionada individualmente (Deployment manual, peça a peça)
- Sala criada / código gerado
- Conexão perdida / reconectando
- Zumbido de fundo do HUD (ambiente contínuo)
- Intensificação dinâmica do Tema de Partida durante combates

Todos foram documentados no levantamento completo para não se perderem, mas nenhum é essencial pra primeira entrega — o jogo funciona e soa "completo" sem eles.

---

# Próximos passos (fora do escopo desta sprint)

Este documento define **o quê** e **por quê**. As sprints seguintes devem tratar, em ordem:

1. Prompts de geração/gravação para cada efeito da lista essencial (não incluídos aqui, por instrução explícita desta sprint).
2. Especificação técnica de formato/arquivo (ex.: `.mp3`/`.ogg`, taxa de amostragem, normalização de volume).
3. Arquitetura de um `AudioEngine` no código (pontos de integração com `SoundHooks` já existente em `src/services/soundHooks.ts`, que hoje só tem `playReveal`/`playCombat` como placeholders).
4. Configuração de volume mestre e opção de mudo nas Configurações.

Nenhum desses itens foi iniciado — este documento é só o planejamento oficial.
