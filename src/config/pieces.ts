export interface PieceInfo {
    nome: string;
    patente: number | null;
    movimento: number;
    descricao: string;
    habilidade: string;
    /** Quantidade oficial por exército (Documento 06). Fonte única — não duplicar em outros arquivos. */
    quantidade: number;
    /** Fonte única para a regra "peças imóveis" (Documento 04 §9). */
    podeMover: boolean;
    /** Fonte única para a regra especial de movimento do Batedor (Documento 04 §11). */
    movimentoEmLinha: boolean;
}

export const PIECES: Record<string, PieceInfo> = {
    commander: {
        nome: "Rei",
        patente: 7,
        movimento: 2,
        descricao:
            "O soberano do exército e a peça mais forte do jogo.",
        habilidade:
            "Mais forte do jogo; só o Assassino o derruba atacando primeiro.",
        quantidade: 1,
        podeMover: true,
        movimentoEmLinha: false,
    },

    officer: {
        nome: "Duque",
        patente: 6,
        movimento: 2,
        descricao:
            "Nobre de confiança do Rei, comanda a linha de frente.",
        habilidade:
            "Excelente em confrontos diretos.",
        quantidade: 2,
        podeMover: true,
        movimentoEmLinha: false,
    },

    sniper: {
        nome: "Arqueiro Real",
        patente: 5,
        movimento: 2,
        descricao:
            "Arqueiro de elite a serviço da coroa.",
        habilidade:
            "Grande poder ofensivo.",
        quantidade: 3,
        podeMover: true,
        movimentoEmLinha: false,
    },

    engineer: {
        nome: "Sapador",
        patente: 3,
        movimento: 2,
        descricao:
            "Especialista em abrir caminho e desmontar armadilhas.",
        habilidade:
            "Desarma Armadilhas.",
        quantidade: 8,
        podeMover: true,
        movimentoEmLinha: false,
    },

    infantry: {
        nome: "Guarda Real",
        patente: 4,
        movimento: 2,
        descricao:
            "Soldado padrão da guarda do reino.",
        habilidade:
            "Equilibrado em ataque e defesa.",
        quantidade: 12,
        podeMover: true,
        movimentoEmLinha: false,
    },

    scout: {
        nome: "Batedor",
        patente: 2,
        movimento: 10,
        descricao:
            "Unidade de reconhecimento extremamente veloz.",
        habilidade:
            "Move-se por diversas casas em linha reta.",
        quantidade: 6,
        podeMover: true,
        movimentoEmLinha: true,
    },

    spy: {
        nome: "Assassino",
        patente: 1,
        movimento: 2,
        descricao:
            "Especialista em infiltração e golpes silenciosos.",
        habilidade:
            "Pode eliminar o Rei se atacar primeiro.",
        quantidade: 1,
        podeMover: true,
        movimentoEmLinha: false,
    },

    bomb: {
        nome: "Armadilha",
        patente: null,
        movimento: 0,
        descricao:
            "Armadilha escondida no campo de batalha.",
        habilidade:
            "Elimina quase qualquer unidade que a ataque.",
        quantidade: 6,
        podeMover: false,
        movimentoEmLinha: false,
    },

    flag: {
        nome: "Bandeira",
        patente: null,
        movimento: 0,
        descricao:
            "Objetivo principal da missão.",
        habilidade:
            "Se capturada, a partida termina.",
        quantidade: 1,
        podeMover: false,
        movimentoEmLinha: false,
    },
};