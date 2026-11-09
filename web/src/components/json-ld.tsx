/**
 * Structured data for search engines (schema.org JSON-LD).
 *
 * The data includes text typed in the admin (company profile, service descriptions), so "<" is
 * escaped: otherwise a "</script>" in that text would end the tag and run as page markup. It is a
 * data block, not a script, so the Content-Security-Policy nonce isn't needed.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
