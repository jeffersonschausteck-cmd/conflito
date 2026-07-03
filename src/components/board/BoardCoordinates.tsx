export interface BoardCoordinatesProps {
    rows?: number;
    cols?: number;
}

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
                className="absolute top-0 left-0 right-0 flex"
                style={{
                    paddingLeft: "5%",
                    paddingRight: "5%",
                }}
            >
                {letters.map((letter) => (
                    <div
                        key={letter}
                        className="
              flex-1
              text-center
              text-[11px]
              font-bold
              tracking-widest
              text-cyan-300/80
            "
                    >
                        {letter}
                    </div>
                ))}
            </div>

            {/* Números laterais */}

            <div
                className="absolute top-0 bottom-0 left-0 flex flex-col"
                style={{
                    paddingTop: "5%",
                    paddingBottom: "5%",
                }}
            >
                {Array.from({ length: rows }).map((_, index) => (
                    <div
                        key={index}
                        className="
              flex-1
              flex
              items-center
              justify-center
              w-6
              text-[11px]
              font-bold
              text-cyan-300/80
            "
                    >
                        {index + 1}
                    </div>
                ))}
            </div>

        </div>

    );

}