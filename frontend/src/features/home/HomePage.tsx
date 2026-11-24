import { useCurrentUser } from '@/features/auth/useAuth';

export function HomePage() {
    const { data: user } = useCurrentUser();

    if (!user) {
        return null;
    }

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-extrabold">Bonjour, {user.name}</h1>
                <p className="mt-1 text-sm text-ink-2">Vous êtes connecté à la GED DC-KNOWING.</p>
            </div>

            <section className="max-w-xl rounded-xl border border-line-soft bg-white shadow-sm" aria-labelledby="profil-titre">
                <h2 id="profil-titre" className="border-b border-line-soft px-4 py-3 text-sm font-bold">
                    Votre profil
                </h2>
                <dl className="divide-y divide-line-soft px-4 text-sm">
                    <ProfileRow label="Adresse e-mail" value={user.email} />
                    <ProfileRow label="Rôle" value={user.role?.label ?? 'Aucun rôle attribué'} />
                    <ProfileRow
                        label="Département"
                        value={user.department ? user.department.name : 'Aucun département (accès transverse ou à définir)'}
                    />
                </dl>
            </section>

            <p className="max-w-xl text-sm text-ink-3">
                Les modules documentaires (explorateur, clients, validations, archives) apparaîtront dans le menu à mesure
                de leur mise en service.
            </p>
        </div>
    );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5 py-3 sm:flex-row sm:gap-4">
            <dt className="w-36 shrink-0 text-ink-3">{label}</dt>
            <dd className="min-w-0 font-medium break-words text-ink">{value}</dd>
        </div>
    );
}
