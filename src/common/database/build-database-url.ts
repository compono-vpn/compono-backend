export const DEFAULT_CONNECTION_LIMIT = 10;
export const DEFAULT_POOL_TIMEOUT_SECONDS = 20;

export function parsePositiveInt(raw: string | undefined, defaultValue: number): number {
    if (raw === undefined) {
        return defaultValue;
    }

    const parsed = parseInt(raw, 10);

    if (Number.isNaN(parsed) || parsed <= 0) {
        return defaultValue;
    }

    return parsed;
}

export function buildDatabaseUrl(
    rawUrl: string,
    connectionLimit: number,
    poolTimeoutSeconds: number,
): string {
    try {
        const url = new URL(rawUrl);

        if (!url.searchParams.has('connection_limit')) {
            url.searchParams.set('connection_limit', String(connectionLimit));
        }
        if (!url.searchParams.has('pool_timeout')) {
            url.searchParams.set('pool_timeout', String(poolTimeoutSeconds));
        }

        return url.toString();
    } catch {
        return rawUrl;
    }
}
