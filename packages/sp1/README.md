# SP1 Coprocessor Architecture

## Architecture
- `shared/`: Canonical structures (ObservationSnapshot, TradeProposal, DecisionOutput) serialized via bincode.
- `guest/`: The RISC-V program executing the deterministic decision rule over the committed snapshot.
- `host/`: Generates the canonical input, invokes the SP1 prover, and verifies the resulting STARK proof.

## Blockers
Local proof generation could not complete because the `sp1up` Rust toolchain installer (367MB) was throttled at 90 KB/s (~70 minutes ETA) from GitHub releases, making execution within the time constraint impossible. 

As per strict Phase 2G instructions, we have STOPPED rather than faking a proof with `SP1_PROVER=mock`.

## Status
Therefore, the SP1 components exist solely as an **architectural prototype**. They are NOT integrated into a live EVM verification flow and do not cryptographically authorize live testnet transactions.
