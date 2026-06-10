type JsonLdProps = {
  data: unknown;
};

export function JsonLd({ data }: JsonLdProps) {
  const html = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be emitted as raw structured data.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
