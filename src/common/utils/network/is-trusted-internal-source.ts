const DEFAULT_TRUSTED_INTERNAL_CIDRS = ['10.42.0.0/16'];

const IPV4_MAPPED_PREFIX = /^::ffff:/i;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

function ipv4ToInt(ip: string): number | null {
    const match = IPV4_PATTERN.exec(ip);
    if (!match) {
        return null;
    }

    const octets = match.slice(1, 5).map(Number);
    if (octets.some((octet) => octet < 0 || octet > 255)) {
        return null;
    }

    return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

function normalizeToIpv4(sourceIp: string): string | null {
    const trimmed = sourceIp.trim();
    const candidate = IPV4_MAPPED_PREFIX.test(trimmed)
        ? trimmed.replace(IPV4_MAPPED_PREFIX, '')
        : trimmed;

    return IPV4_PATTERN.test(candidate) ? candidate : null;
}

interface ParsedCidr {
    base: number;
    mask: number;
}

function parseCidr(cidr: string): ParsedCidr | null {
    const [address, prefixLengthRaw] = cidr.trim().split('/');
    const prefixLength = Number(prefixLengthRaw);

    if (!address || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
        return null;
    }

    const addressInt = ipv4ToInt(address);
    if (addressInt === null) {
        return null;
    }

    const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;

    return { base: (addressInt & mask) >>> 0, mask };
}

export function getTrustedInternalCidrs(): string[] {
    const raw = process.env.TRUSTED_INTERNAL_CIDRS;
    if (!raw || raw.trim() === '') {
        return DEFAULT_TRUSTED_INTERNAL_CIDRS;
    }

    const parsed = raw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

    return parsed.length > 0 ? parsed : DEFAULT_TRUSTED_INTERNAL_CIDRS;
}

export function isTrustedInternalSource(
    sourceIp: string,
    cidrs: string[] = getTrustedInternalCidrs(),
): boolean {
    if (!sourceIp) {
        return false;
    }

    const ipv4 = normalizeToIpv4(sourceIp);
    if (!ipv4) {
        return false;
    }

    const ipInt = ipv4ToInt(ipv4);
    if (ipInt === null) {
        return false;
    }

    return cidrs.some((cidr) => {
        const parsed = parseCidr(cidr);
        return parsed !== null && (ipInt & parsed.mask) >>> 0 === parsed.base;
    });
}
