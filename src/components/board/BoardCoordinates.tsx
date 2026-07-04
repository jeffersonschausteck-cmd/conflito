export interface BoardCoordinatesProps {
    rows?: number;
    cols?: number;
}

const COORDINATE_OFFSET = {
    top: 30,
    left: 10,
};

export function BoardCoordinates({
    rows = 10,
    cols = 10,
}: BoardCoordinatesProps) {

    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        .slice(0, cols)
        .split("");

    return (

        <div className="relative h-full w-full pointer-events-none select-none">

            {/* Letras superiores */}

            <div
                className="absolute left-16 right-12 flex"
                style={{
                    transform: `translate(-10px, -8px)`,
                }}
            >
                {letters.map((letter) => (
                    <div
                        key={letter}
                        className="
        flex
        items-center
        justify-center
        text-xs
        font-bold
        tracking-widest
        text-cyan-300/90
    "
                        style={{
                            width: `calc(100% / ${cols})`,
                        }}
                    >
                        {letter}
                    </div>
                ))}
            </div>

            {/* Números laterais */}

            <div
                className="absolute top-16 bottom-12 flex flex-col"
                style={{
                    transform: `translate(-10px, -8px)`,
                }}
            >
                {Array.from({ length: rows }).map((_, index) => (
                    <div
                        key={index}
                        className="
        flex
        items-center
        justify-center
        w-6
        text-xs
        font-bold
        text-cyan-300/90
    "
                        style={{
                            height: `calc(100% / ${rows})`,
                        }}
                    >
                        {index + 1}
                    </div>
                ))}
            </div>

        </div>

    );

}