import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
    loading?: boolean;
    icon?: ReactNode;
};

// Valeurs reprises de la maquette (.btn-gold, .btn-outline, .btn-ebene, .btn-ghost).
const VARIANTS: Record<Variant, string> = {
    primary: 'bg-or text-ebene shadow-[0_2px_10px_-4px_rgba(201,162,39,0.7)] hover:bg-[#b8921f]',
    secondary: 'border border-line bg-white text-ink hover:border-contour hover:bg-sable hover:text-or-brun',
    dark: 'bg-ebene text-[#f1e9d2] hover:bg-[#2c2a25]',
    ghost: 'text-ink-2 hover:bg-or/12 hover:text-or-brun',
    danger: 'bg-danger text-white hover:bg-[#8f3225]',
};

// .btn-sm : 30 px, coins 8 px ; .btn : 36 px, coins 10 px ; .btn-lg : 42 px, coins 11 px.
const SIZES: Record<Size, string> = {
    sm: 'h-[30px] rounded-lg px-2.5 text-xs',
    md: 'h-9 rounded-[10px] px-3.5 text-[13px]',
    lg: 'h-[42px] rounded-[11px] px-[18px] text-sm',
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    className = '',
    children,
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            className={`inline-flex items-center justify-center gap-[7px] font-semibold whitespace-nowrap transition-colors active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
            {...props}
        >
            {loading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : icon}
            {children}
        </button>
    );
}
