import Image from 'next/image';

// Pastel color palette for auto-generated avatars
const AVATAR_COLORS = [
  '#FF6B6B', '#FF8E53', '#FFCA3A', '#6BCB77',
  '#4D96FF', '#C77DFF', '#FF6B9D', '#45B7D1',
  '#96CEB4', '#DDA0DD', '#F4A460', '#20B2AA',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitial(name: string): string {
  if (!name) return '?';
  // For Chinese names, use first character; for English, use first letter
  const firstChar = name.trim()[0];
  return firstChar.toUpperCase();
}

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

export default function Avatar({ src, name, size = 40, className = '' }: AvatarProps) {
  const initial = getInitial(name);
  const bgColor = getAvatarColor(name);

  if (src) {
    return (
      <div
        className={`relative rounded-md overflow-hidden shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={`${size}px`}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-md flex items-center justify-center shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: bgColor,
      }}
    >
      <span
        className="text-white font-medium select-none"
        style={{ fontSize: size * 0.42 }}
      >
        {initial}
      </span>
    </div>
  );
}
