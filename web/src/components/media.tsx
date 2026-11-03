import clsx from "clsx";
import { ImageIcon } from "lucide-react";

/** Shows an uploaded image, or a branded placeholder until one is added in the admin. */
export function MediaImage({
  src,
  alt,
  className,
  label,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  label?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={clsx("h-full w-full object-cover", className)} />;
  }
  return (
    <div
      className={clsx(
        "bg-hatch relative flex h-full w-full items-center justify-center bg-stone-100 text-stone-400",
        className,
      )}
      role="img"
      aria-label={alt}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <ImageIcon className="h-7 w-7" aria-hidden />
        {label && <span className="text-xs font-semibold tracking-wide text-stone-500 uppercase">{label}</span>}
      </div>
    </div>
  );
}
