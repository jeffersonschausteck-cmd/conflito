export const BOARD_CONFIG = {
    rows: 10,
    cols: 10,

    /**
     * Área útil onde todas as camadas do jogo serão desenhadas.
     *
     * IMPORTANTE:
     * A moldura ocupa 100%.
     * A Play Area representa apenas a parte interna da moldura.
     *
     * Estes valores poderão ser ajustados quando fizermos o encaixe
     * perfeito da moldura definitiva.
     */
    playArea: {
        top: "6%",
        right: "6%",
        bottom: "6%",
        left: "6%",
    },
} as const;