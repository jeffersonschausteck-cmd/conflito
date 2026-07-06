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
    /** Fonte única para a regra especial de movimento do Explorador (Documento 04 §11). */
    movimentoEmLinha: boolean;
}

export const PIECES: Record<string, PieceInfo> = {
    commander: {
        nome: "Comandante",
        patente: 7,
        movimento: 2,
        descricao:
            "Líder máximo das tropas. Sua captura encerra a missão.",
        habilidade:
            "Coordena as unidades e protege a Bandeira.",
        quantidade: 1,
        podeMover: true,
        movimentoEmLinha: false,
    },

    officer: {
        nome: "Oficial",
        patente: 6,
        movimento: 2,
        descricao:
            "Veterano responsável por comandar a linha de frente.",
        habilidade:
            "Excelente em confrontos diretos.",
        quantidade: 2,
        podeMover: true,
        movimentoEmLinha: false,
    },

    sniper: {
        nome: "Atirador",
        patente: 5,
        movimento: 2,
        descricao:
            "Especialista em combate de precisão.",
        habilidade:
            "Grande poder ofensivo.",
        quantidade: 3,
        podeMover: true,
        movimentoEmLinha: false,
    },

    engineer: {
        nome: "Engenheiro",
        patente: 3,
        movimento: 2,
        descricao:
            "Responsável por suporte técnico e operações especiais.",
        habilidade:
            "Versátil em campo.",
        quantidade: 8,
        podeMover: true,
        movimentoEmLinha: false,
    },

    infantry: {
        nome: "Infantaria",
        patente: 4,
        movimento: 2,
        descricao:
            "Soldado padrão utilizado na maior parte das missões.",
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
        nome: "Espião",
        patente: 1,
        movimento: 2,
        descricao:
            "Especialista em infiltração.",
        habilidade:
            "Pode eliminar unidades de alta patente quando ataca primeiro.",
        quantidade: 1,
        podeMover: true,
        movimentoEmLinha: false,
    },

    bomb: {
        nome: "Bomba",
        patente: null,
        movimento: 0,
        descricao:
            "Armadilha explosiva posicionada no campo.",
        habilidade:
            "Destrói quase qualquer unidade atacante.",
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