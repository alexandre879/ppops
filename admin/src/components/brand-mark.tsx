import clsx from "clsx";
import Image from "next/image";

/** The company emblem on a white tile, so its teal and gold read the same on any surface. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08),0_1px_2px_rgb(0_0_0/0.05)]",
        className,
      )}
    >
      <Image src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/logo-mark.png`} alt="" width={203} height={166} loading="eager" className="h-auto w-[78%]" />
    </span>
  );
}
