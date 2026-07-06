# Documentação Oficial do Conflito

Bem-vindo à documentação oficial do **Conflito**.

Esta pasta contém toda a documentação técnica, funcional e de design do projeto.

A documentação representa a fonte oficial da verdade sobre o funcionamento do jogo.

Sempre que houver dúvidas sobre regras, arquitetura, mecânicas ou funcionamento, esta documentação deverá ser consultada antes da implementação de qualquer alteração.

---

# Objetivo da documentação

Esta documentação possui quatro objetivos principais:

- Registrar todas as decisões importantes do projeto.
- Definir oficialmente as regras do jogo.
- Organizar a arquitetura do sistema.
- Facilitar a manutenção e evolução do Conflito.

---

# Regra mais importante

## A documentação sempre vem antes do código.

Nenhuma funcionalidade importante deverá ser implementada sem estar documentada.

Caso exista divergência entre código e documentação, um dos dois deverá ser corrigido.

A documentação nunca deverá ser ignorada.

---

# Estrutura da documentação

A documentação está organizada em módulos independentes.

Cada documento possui uma responsabilidade específica.

```
docs/
│
├── README.md
├── 00-Manifesto.md
├── 01-VisaoGeral.md
├── 02-Objetivos.md
├── 03-Mecanicas.md
├── 04-Regras.md
├── 05-Faccoes.md
├── 06-Pecas.md
├── 07-Motor.md
├── 08-Interface.md
├── 09-IA.md
├── 10-Multiplayer.md
├── 11-Arte.md
├── 12-Arquitetura.md
├── 13-Roadmap.md
├── 14-ManualDoDesenvolvedor.md
├── 15-PrincipiosDoProjeto.md
│
├── decisoes/
├── diagramas/
├── wireframes/
└── referencias/
```

---

# Ordem de leitura

Para compreender completamente o projeto recomenda-se a seguinte ordem:

1. README
2. Manifesto
3. Visão Geral
4. Objetivos
5. Mecânicas
6. Regras
7. Arquitetura
8. Motor do Jogo
9. Interface
10. IA
11. Multiplayer
12. Manual do Desenvolvedor

---

# Processo oficial de desenvolvimento

Toda nova funcionalidade deverá seguir obrigatoriamente o seguinte fluxo:

Ideia

↓

Discussão

↓

Documentação

↓

Aprovação

↓

Implementação

↓

Testes

↓

Git Commit

↓

Deploy

Nenhuma etapa deverá ser ignorada.

---

# Controle de versões

Todo documento deverá possuir:

- Versão
- Status
- Data da última atualização
- Autor da alteração
- Histórico de alterações

---

# Padrão dos documentos

Todos os documentos deverão seguir o mesmo modelo:

- Objetivo
- Escopo
- Descrição
- Regras
- Observações
- Pendências
- Histórico

---

# Filosofia do Projeto

O Conflito é desenvolvido seguindo cinco princípios fundamentais:

- Estratégia acima da sorte.
- Código organizado.
- Interface intuitiva.
- Arquitetura preparada para evolução.
- Experiência premium.

Toda decisão deverá respeitar esses princípios.

---

# Documento vivo

Esta documentação evolui junto com o projeto.

Sempre que uma funcionalidade for criada, removida ou alterada, sua documentação correspondente deverá ser atualizada.

Nunca devemos permitir que a documentação fique desatualizada em relação ao código.