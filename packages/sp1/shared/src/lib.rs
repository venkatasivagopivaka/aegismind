use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct ObservationSnapshot {
    pub liquidity: String,
    pub volume_usd: String,
    pub balance_usdc: String,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct TradeProposal {
    pub action: String,
    pub token_in: String,
    pub token_out: String,
    pub amount_in_units: String,
    pub reasoning: String,
    pub confidence_bps: u32,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub enum DecisionOutput {
    Trade(TradeProposal),
    NoTrade(String),
}
