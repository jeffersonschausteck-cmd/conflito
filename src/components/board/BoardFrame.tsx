export interface BoardFrameProps {
    rows?: number;
    cols?: number;
}

export function BoardFrame({
    rows = 10,
    cols = 10,
}: BoardFrameProps) {
    return (
        <div className="absolute inset-0 pointer-events-none select-none">

            <img
                src="/board/frame.png"
                alt="Board Frame"
                draggable={false}
                className="
          h-full
          w-full
          object-contain
        "
            />

        </div>
    );
}