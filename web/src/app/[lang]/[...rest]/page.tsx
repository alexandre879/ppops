import { notFound } from "next/navigation";

/** Unknown paths inside a language render the localized not-found page (with header and footer). */
export default function CatchAll() {
  notFound();
}
