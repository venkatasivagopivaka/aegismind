import { z } from "zod";

export type GraphStatus = 'GRAPH_OK' | 'GRAPH_UNAVAILABLE' | 'GRAPH_INVALID' | 'GRAPH_EMPTY';

export interface GraphObservation {
    source: "thegraph";
    status: GraphStatus;
    observedAt: number;
    data?: {
        poolAddress: string;
        liquidity: string;
        volumeUSD: string;
        token0Price: string;
        token1Price: string;
    };
    error?: string;
}

// Stricter schema to ensure we don't accidentally ingest floats if The Graph returns strings.
// Note: The Graph GraphQL typically returns strings for BigInts/Decimals (like BigDecimal/BigInt in AssemblyScript subgraphs).
const PoolQuerySchema = z.object({
    data: z.object({
        pool: z.object({
            id: z.string(),
            liquidity: z.string(),
            volumeUSD: z.string(),
            token0Price: z.string(),
            token1Price: z.string(),
        }).nullable()
    }).optional(),
    errors: z.array(z.any()).optional()
});

export async function fetchPoolObservation(
    endpoint: string,
    poolAddress: string,
    fetcher: (url: string, init: RequestInit) => Promise<Response> = fetch,
    timestampOverride?: number
): Promise<GraphObservation> {
    const now = timestampOverride ?? Math.floor(Date.now() / 1000);
    
    if (!endpoint || !poolAddress) {
        return { source: "thegraph", status: "GRAPH_INVALID", observedAt: now, error: "Missing endpoint or poolAddress" };
    }

    try {
        const query = `
            query {
                pool(id: "${poolAddress.toLowerCase()}") {
                    id
                    liquidity
                    volumeUSD
                    token0Price
                    token1Price
                }
            }
        `;
        const response = await fetcher(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            return { source: "thegraph", status: "GRAPH_UNAVAILABLE", observedAt: now, error: `HTTP ${response.status}` };
        }

        const json = await response.json();
        const parsed = PoolQuerySchema.safeParse(json);

        if (!parsed.success) {
            return { source: "thegraph", status: "GRAPH_INVALID", observedAt: now, error: "Malformed response" };
        }

        if (parsed.data.errors && parsed.data.errors.length > 0) {
            return { source: "thegraph", status: "GRAPH_INVALID", observedAt: now, error: "GraphQL errors present" };
        }

        if (!parsed.data.data || !parsed.data.data.pool) {
            return { source: "thegraph", status: "GRAPH_EMPTY", observedAt: now, error: "Pool not found" };
        }

        const pool = parsed.data.data.pool;

        return {
            source: "thegraph",
            status: "GRAPH_OK",
            observedAt: now,
            data: {
                poolAddress: pool.id,
                liquidity: pool.liquidity,
                volumeUSD: pool.volumeUSD,
                token0Price: pool.token0Price,
                token1Price: pool.token1Price,
            }
        };
    } catch (error: any) {
        return { source: "thegraph", status: "GRAPH_UNAVAILABLE", observedAt: now, error: error.message };
    }
}
