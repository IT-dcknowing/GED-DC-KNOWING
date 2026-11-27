import { Briefcase, Building2, ChevronDown, FolderTree, House, KeyRound, LogOut, Menu, Users, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';

import type { CurrentUser } from '@/api/auth';
import { canViewDepartments } from '@/api/departments';
import { BrandMark } from '@/components/ui/BrandMark';
import { hasPermission, useCurrentUser, useLogout } from '@/features/auth/useAuth';

type NavItem = {
    to: string;
    label: string;
    icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
    /** Permission requise pour voir l'entrée (le serveur contrôle de son côté chaque requête). */
    permission?: string;
    /** Règle d'affichage propre au module, quand l'accès ne dépend pas d'une seule permission. */
    visible?: (user: CurrentUser | null | undefined) => boolean;
};

type NavGroup = { label: string | null; items: NavItem[] };

/**
 * Seuls les modules réellement disponibles figurent dans le menu, regroupés comme dans la maquette.
 * Les autres (explorateur, validations…) seront ajoutés au fil de leur développement.
 */
const NAV_GROUPS: NavGroup[] = [
    { label: null, items: [{ to: '/', label: 'Accueil', icon: House }] },
    {
        label: 'Documents',
        items: [
            { to: '/explorateur', label: 'Explorateur', icon: FolderTree },
            { to: '/clients', label: 'Clients', icon: Building2 },
            { to: '/departements', label: 'Départements', icon: Briefcase, visible: canViewDepartments },
        ],
    },
    {
        label: 'Administration',
        items: [{ to: '/administration/utilisateurs', label: 'Utilisateurs et rôles', icon: Users, permission: 'users.manage' }],
    },
];

export function AppLayout() {
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setMobileNavOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!mobileNavOpen) return;
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileNavOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [mobileNavOpen]);

    return (
        <div className="min-h-screen lg:flex">
            <Sidebar className="hidden lg:flex" />

            {mobileNavOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button
                        type="button"
                        aria-label="Fermer le menu"
                        className="absolute inset-0 bg-ebene/45"
                        onClick={() => setMobileNavOpen(false)}
                    />
                    <Sidebar className="relative z-10 flex h-full w-72 max-w-[85vw]" onClose={() => setMobileNavOpen(false)} />
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar onOpenNav={() => setMobileNavOpen(true)} />
                <main id="contenu" className="mx-auto w-full max-w-[1560px] flex-1 px-4 py-6 sm:px-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

function Sidebar({ className = '', onClose }: { className?: string; onClose?: () => void }) {
    const { data: user } = useCurrentUser();

    return (
        <aside
            className={`bg-wood sticky top-0 h-screen w-64 shrink-0 flex-col border-r border-or/20 lg:flex ${className}`}
            aria-label="Navigation principale"
        >
            <div className="flex min-h-16 items-center gap-3 border-b border-contour/15 px-4">
                <BrandMark />
                <div className="min-w-0 flex-1">
                    <p className="font-display text-sm font-extrabold tracking-wide text-[#f6efdd]">DC-KNOWING</p>
                    <p className="text-[10.5px] tracking-[0.16em] text-contour uppercase">GED · CGA</p>
                </div>
                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer le menu"
                        className="inline-flex size-8 items-center justify-center rounded-lg text-contour hover:bg-contour/10"
                    >
                        <X aria-hidden="true" className="size-4" />
                    </button>
                )}
            </div>
            <nav className="flex-1 overflow-y-auto px-2.5 py-3">
                {NAV_GROUPS.map((group) => {
                    const items = group.items.filter(
                        (item) => (!item.permission || hasPermission(user, item.permission)) && (!item.visible || item.visible(user)),
                    );
                    if (items.length === 0) return null;

                    return (
                        <div key={group.label ?? 'principal'}>
                            {group.label && (
                                <p className="px-2.5 pt-3.5 pb-1.5 text-[10px] tracking-[1.8px] text-contour/70 uppercase">{group.label}</p>
                            )}
                            <ul className="space-y-0.5">
                                {items.map(({ to, label, icon: Icon }) => (
                                    <li key={to}>
                                        <NavLink
                                            to={to}
                                            end
                                            className={({ isActive }) =>
                                                `relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${isActive
                                                    ? 'bg-or/15 text-[#f8f1dc] before:absolute before:inset-y-2 before:-left-2.5 before:w-[3px] before:rounded-sm before:bg-or'
                                                    : 'text-[#cfc6ae] hover:bg-contour/10 hover:text-[#f1e9d2]'
                                                }`
                                            }
                                        >
                                            <Icon aria-hidden="true" className="size-[17px] text-contour" />
                                            {label}
                                        </NavLink>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    );
                })}
            </nav>
        </aside>
    );
}

function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
            <button
                type="button"
                onClick={onOpenNav}
                aria-label="Ouvrir le menu"
                className="inline-flex size-9 items-center justify-center rounded-lg border border-line bg-white text-ink-2 hover:bg-sable lg:hidden"
            >
                <Menu aria-hidden="true" className="size-4" />
            </button>

            <div className="ml-auto flex min-w-0 items-center">
                <UserMenu />
            </div>
        </header>
    );
}

function initials(name: string): string {
    const words = name.trim().split(/\s+/);

    return ((words[0]?.charAt(0) ?? '?') + (words[1]?.charAt(0) ?? '')).toUpperCase();
}

/** Bloc du profil (maquette : .user-chip) avec son menu : mot de passe et déconnexion. */
function UserMenu() {
    const { data: user } = useCurrentUser();
    const logoutMutation = useLogout();
    const navigate = useNavigate();
    const location = useLocation();
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuId = useId();

    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!open) return;
        const onPointer = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', onPointer);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onPointer);
            document.removeEventListener('keydown', onKey);
        };
    }, [open]);

    if (!user) return null;

    const onLogout = () => {
        logoutMutation.mutate(undefined, {
            onSettled: () => navigate('/connexion', { replace: true }),
        });
    };

    const itemClass =
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-ink hover:bg-sable hover:text-or-brun';

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-controls={open ? menuId : undefined}
                aria-label={`Menu du profil de ${user.name}`}
                className="flex items-center gap-[9px] rounded-[11px] border border-line bg-white py-[5px] pr-2.5 pl-1.5 hover:bg-sable"
            >
                <span
                    aria-hidden="true"
                    className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[9px] border border-or-brun/35 bg-linear-135 from-sable to-contour text-[11px] font-bold tracking-[0.4px] text-ebene"
                >
                    {initials(user.name)}
                </span>
                <span className="hidden min-w-0 text-left leading-[1.15] sm:block">
                    <span className="block max-w-[160px] truncate text-[12.5px] font-semibold text-ebene">{user.name}</span>
                    <span className="block text-[10.5px] font-semibold text-or-brun">
                        {user.role?.label ?? 'Aucun rôle attribué'}
                    </span>
                </span>
                <ChevronDown aria-hidden="true" className="size-3.5 text-ink-2" />
            </button>

            {open && (
                <div
                    id={menuId}
                    role="menu"
                    aria-label="Profil"
                    className="absolute top-[calc(100%+8px)] right-0 z-40 w-64 overflow-hidden rounded-[14px] border border-line bg-white/96 p-1.5 shadow-[0_24px_60px_-20px_rgba(26,26,26,0.35)] backdrop-blur"
                >
                    <div className="border-b border-line-soft px-3 pt-1.5 pb-2.5">
                        <p className="truncate text-[13px] font-semibold text-ebene">{user.name}</p>
                        <p className="truncate text-[11.5px] text-ink-3">{user.email}</p>
                    </div>
                    <div className="pt-1.5">
                        <Link role="menuitem" to="/profil/mot-de-passe" className={itemClass}>
                            <KeyRound aria-hidden="true" className="size-4 text-or-brun" />
                            Modifier mon mot de passe
                        </Link>
                        <button
                            type="button"
                            role="menuitem"
                            onClick={onLogout}
                            disabled={logoutMutation.isPending}
                            className={itemClass}
                        >
                            <LogOut aria-hidden="true" className="size-4 text-or-brun" />
                            {logoutMutation.isPending ? 'Déconnexion en cours' : 'Se déconnecter'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
