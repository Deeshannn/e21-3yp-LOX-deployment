const loxIconUrl = new URL("../../../Icon1.jpeg", import.meta.url).href;

type LoxMarkProps = {
  className?: string;
};

export function LoxMark({ className }: LoxMarkProps) {
  return (
    <img
      src={loxIconUrl}
      alt=""
      aria-hidden="true"
      className={[
        "block h-full w-full object-cover object-center scale-[1.12] mix-blend-multiply",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      draggable={false}
    />
  );
}