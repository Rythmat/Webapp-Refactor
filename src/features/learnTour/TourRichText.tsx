/** A card's words: **bold** for a control's name, *italic* for a title. */
export function TourRichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*.+?\*\*|\*[^*]+?\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') ? (
          <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>
            {part.slice(2, -2)}
          </strong>
        ) : part.startsWith('*') && part.length > 2 ? (
          <em key={i}>{part.slice(1, -1)}</em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
