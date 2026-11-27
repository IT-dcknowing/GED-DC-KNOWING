import { Briefcase, Eye, FolderTree, GraduationCap, Landmark, Shield, User, UserCheck, type LucideIcon } from 'lucide-react';

/** Icônes des rôles, reprises de la maquette. */
const ROLE_ICONS: Record<string, LucideIcon> = {
    super_admin: Shield,
    directeur: Landmark,
    resp_ged: FolderTree,
    resp_dept: Briefcase,
    collaborateur: UserCheck,
    stagiaire: GraduationCap,
    auditeur: Eye,
};

export function roleIcon(key: string | undefined): LucideIcon {
    return (key && ROLE_ICONS[key]) || User;
}
