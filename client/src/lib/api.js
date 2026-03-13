const BASE_URL = import.meta.env.VITE_API_URL ?? '';

export async function apiRequest(method, path, token, body) {
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message ?? 'Request failed');
    }

    if (res.status === 204) return null;
    return res.json();
}
