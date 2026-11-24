import { api } from '@/api/client';

export type HealthStatus = {
    status: 'ok' | 'degraded';
    database: 'ok' | 'unavailable';
};

export async function fetchHealth(): Promise<HealthStatus> {
    // 503 signifie « API joignable mais base de données indisponible » : ce n'est pas une erreur réseau.
    const { data } = await api.get<HealthStatus>('/health', {
        validateStatus: (code) => code === 200 || code === 503,
    });

    return data;
}
