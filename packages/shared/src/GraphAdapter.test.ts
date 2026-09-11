import { describe, it, expect } from "vitest";
import { fetchPoolObservation } from "./GraphAdapter.js";

describe("GraphAdapter", () => {
    const mockEndpoint = "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3";
    const mockPool = "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"; // USDC/WETH
    const now = 1000000000;

    const mockFetcher = (responseParams: { ok: boolean, status: number, json: any, throwError?: boolean }) => {
        return async (url: string, init: RequestInit) => {
            if (responseParams.throwError) {
                throw new Error("Network failure");
            }
            return {
                ok: responseParams.ok,
                status: responseParams.status,
                json: async () => responseParams.json
            } as Response;
        };
    };

    it("1. Valid Graph response -> GRAPH_OK", async () => {
        const fetcher = mockFetcher({
            ok: true,
            status: 200,
            json: {
                data: {
                    pool: {
                        id: mockPool.toLowerCase(),
                        liquidity: "30000000000000000000",
                        volumeUSD: "1500000.00",
                        token0Price: "3000.5",
                        token1Price: "0.00033"
                    }
                }
            }
        });

        const obs = await fetchPoolObservation(mockEndpoint, mockPool, fetcher, now);
        expect(obs.status).toBe("GRAPH_OK");
        expect(obs.data?.liquidity).toBe("30000000000000000000");
    });

    it("2. Missing data -> GRAPH_EMPTY", async () => {
        const fetcher = mockFetcher({
            ok: true,
            status: 200,
            json: {
                data: {
                    pool: null
                }
            }
        });

        const obs = await fetchPoolObservation(mockEndpoint, mockPool, fetcher, now);
        expect(obs.status).toBe("GRAPH_EMPTY");
        expect(obs.error).toBe("Pool not found");
    });

    it("3. Malformed data -> GRAPH_INVALID", async () => {
        // liquidity is passed as a number instead of string, failing Zod strict check
        const fetcher = mockFetcher({
            ok: true,
            status: 200,
            json: {
                data: {
                    pool: {
                        id: mockPool.toLowerCase(),
                        liquidity: 3000, // Should be string
                        volumeUSD: "1500000.00",
                        token0Price: "3000.5",
                        token1Price: "0.00033"
                    }
                }
            }
        });

        const obs = await fetchPoolObservation(mockEndpoint, mockPool, fetcher, now);
        expect(obs.status).toBe("GRAPH_INVALID");
        expect(obs.error).toBe("Malformed response");
    });

    it("4. Network Failure -> GRAPH_UNAVAILABLE", async () => {
        const fetcher = mockFetcher({ ok: false, status: 500, throwError: true, json: {} });
        const obs = await fetchPoolObservation(mockEndpoint, mockPool, fetcher, now);
        expect(obs.status).toBe("GRAPH_UNAVAILABLE");
        expect(obs.error).toBe("Network failure");
    });

    it("5. Non-200 HTTP response -> GRAPH_UNAVAILABLE", async () => {
        const fetcher = mockFetcher({ ok: false, status: 503, json: {} });
        const obs = await fetchPoolObservation(mockEndpoint, mockPool, fetcher, now);
        expect(obs.status).toBe("GRAPH_UNAVAILABLE");
        expect(obs.error).toBe("HTTP 503");
    });

    it("6. Very large numeric values are preserved exactly as strings", async () => {
        const giantLiquidity = "999999999999999999999999999999999999999999999999999";
        const fetcher = mockFetcher({
            ok: true,
            status: 200,
            json: {
                data: {
                    pool: {
                        id: mockPool.toLowerCase(),
                        liquidity: giantLiquidity,
                        volumeUSD: "1",
                        token0Price: "1",
                        token1Price: "1"
                    }
                }
            }
        });

        const obs = await fetchPoolObservation(mockEndpoint, mockPool, fetcher, now);
        expect(obs.status).toBe("GRAPH_OK");
        expect(obs.data?.liquidity).toBe(giantLiquidity); // Exact string match, no loss of precision
    });

    it("7. GraphQL explicit errors array -> GRAPH_INVALID", async () => {
        const fetcher = mockFetcher({
            ok: true,
            status: 200,
            json: {
                errors: [
                    { message: "Subgraph sync failed" }
                ]
            }
        });

        const obs = await fetchPoolObservation(mockEndpoint, mockPool, fetcher, now);
        expect(obs.status).toBe("GRAPH_INVALID");
        expect(obs.error).toBe("GraphQL errors present");
    });
});
