export function PieceFrame({
    children,
}: PieceFrameProps) {

    return (

        <div
            className="relative flex h-full w-full items-center justify-center"
        >

            {children}

        </div>

    );

}