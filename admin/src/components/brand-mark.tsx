import clsx from "clsx";
import Image from "next/image";

/** The company emblem. Its teal and gold need a light ground to read on the dark sidebar and login panel. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[inset_0_0_0_1px_rgb(0_0_0/0.06)]",
        className,
      )}
    >
      <Image src="/logo-mark.png" alt="" width={203} height={166} loading="eager" className="h-auto w-[78%]" />
    </span>
  );
}
