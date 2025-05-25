import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-20 h-20 transition-transform duration-200 hover:scale-105">
        <Image
          src="/images/logo-remove-background.png"
          alt="Roundup Sheriff Badge Logo"
          fill
          className="object-contain drop-shadow-md"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <span className="text-lg tracking-wider text-foreground">
            Split Bills With Friends
          </span>
        </div>
      )}
    </Link>
  );
} 