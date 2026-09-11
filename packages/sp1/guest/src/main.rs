#![no_main]
sp1_zkvm::entrypoint!(main);

use shared::{DecisionOutput, ObservationSnapshot, TradeProposal};
use sp1_zkvm::io;

pub fn main() {
    // 1. Read the committed canonical input (ObservationSnapshot)
    let snapshot: ObservationSnapshot = io::read();

    // 2. Perform the deterministic computation
    let decision = if snapshot.liquidity.len() > 18 {
        DecisionOutput::Trade(TradeProposal {
            action: "SWAP_EXACT_IN".to_string(),
            token_in: "USDC".to_string(),
            token_out: "WETH".to_string(),
            amount_in_units: "100".to_string(),
            reasoning: "Liquidity is sufficient.".to_string(),
            confidence_bps: 9500,
        })
    } else {
        DecisionOutput::NoTrade("Liquidity insufficient".to_string())
    };

    // 3. Commit to the INPUT and OUTPUT.
    // By committing the input, the verifier can mathematically guarantee that THIS specific 
    // proof output was derived from THIS specific input snapshot.
    io::commit(&snapshot);
    io::commit(&decision);
}
