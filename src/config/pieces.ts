export interface PieceInfo {
    nome: string;
    patente: number | null;
    movimento: number;
    descricao: string;
    habilidade: string;
}

export const PIECES: Record<string, PieceInfo> = {
    commander: {
        nome: "Comandante",
        patente: 9,
        movimento: 2,
        descricao:
            "Líder máximo das tropas. Sua captura encerra a missão.",
        habilidade:
            "Coordena as unidades e protege a Bandeira.",
    },

    officer: {
        nome: "Oficial",
        patente: 8,
        movimento: 2,
        descricao:
            "Veterano responsável por comandar a linha de frente.",
        habilidade:
            "Excelente em confrontos diretos.",
    },

    sniper: {
        nome: "Atirador",
        patente: 7,
        movimento: 2,
        descricao:
            "Especialista em combate de precisão.",
        habilidade:
            "Grande poder ofensivo.",
    },

    engineer: {
        nome: "Engenheiro",
        patente: 5,
        movimento: 2,
        descricao:
            "Responsável por suporte técnico e operações especiais.",
        habilidade:
            "Versátil em campo.",
    },

    infantry: {
        nome: "Infantaria",
        patente: 4,
        movimento: 2,
        descricao:
            "Soldado padrão utilizado na maior parte das missões.",
        habilidade:
            "Equilibrado em ataque e defesa.",
    },

    scout: {
        nome: "Batedor",
        patente: 2,
        movimento: 10,
        descricao:
            "Unidade de reconhecimento extremamente veloz.",
        habilidade:
            "Move-se por diversas casas em linha reta.",
    },

    spy: {
        nome: "Espião",
        patente: 1,
        movimento: 2,
        descricao:
            "Especialista em infiltração.",
        habilidade:
            "Pode eliminar unidades de alta patente quando ataca primeiro.",
    },

    bomb: {
        nome: "Bomba",
        patente: null,
        movimento: 0,
        descricao:
            "Armadilha explosiva posicionada no campo.",
        habilidade:
            "Destrói quase qualquer unidade atacante.",
    },

    flag: {
        nome: "Bandeira",
        patente: null,
        movimento: 0,
        descricao:
            "Objetivo principal da missão.",
        habilidade:
            "Se capturada, a partida termina.",
    },
};