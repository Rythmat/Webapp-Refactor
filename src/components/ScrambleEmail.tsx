import { FC } from 'react';

interface ScrambleEmailProps {
  emailParts: [string, string]; // [username, domain]
  className?: string;
}

export const ScrambleEmail: FC<ScrambleEmailProps> = ({
  emailParts: [username, domain],
  className = '',
}) => {
  // Split domain into parts (e.g., "musicatlas.io" -> ["musicatlas", "io"])
  const domainParts = domain.split('.');

  return (
    <span className={`inline-block ${className}`}>
      <span>{username}</span>
      <span>&#64;</span>
      {domainParts.map((part, index) => (
        <>
          <span key={`${part}-${index}`}>{part}</span>
          {index < domainParts.length - 1 && <span>&#46;</span>}
        </>
      ))}
    </span>
  );
};
