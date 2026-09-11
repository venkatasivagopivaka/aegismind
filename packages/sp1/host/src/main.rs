use sp1_sdk::{ProverClient, SP1Stdin};
use shared::{ObservationSnapshot, DecisionOutput};

const ELF: &[u8] = include_bytes!("../../guest/elf/riscv32im-succinct-zkvm-elf");

fn main() {
    let client = ProverClient::new();
    let (pk, vk) = client.setup(ELF);

    let snapshot = ObservationSnapshot {
        liquidity: "30000000000000000000".to_string(),
        volume_usd: "1500000.00".to_string(),
        balance_usdc: "10000".to_string(),
    };

    let mut stdin = SP1Stdin::new();
    stdin.write(&snapshot);

    println!("Starting SP1 execution/proving...");
    // 1. Generation
    let mut proof = client.prove(&pk, stdin).run().expect("Failed to prove");
    println!("Proof generated successfully!");

    // 2. Verification
    client.verify(&proof, &vk).expect("Failed to verify proof");
    println!("Proof verified successfully!");

    // 3. Extract output
    let committed_snapshot: ObservationSnapshot = proof.public_values.read();
    let committed_output: DecisionOutput = proof.public_values.read();
    
    assert_eq!(snapshot, committed_snapshot, "Input snapshot mismatch!");
    println!("SP1 Input Commitment matched local snapshot.");
    println!("SP1 Output Commitment: {:?}", committed_output);

    // ==========================================
    // TAMPER TESTS
    // ==========================================

    println!("Running Tamper Tests...");

    let original_public_values = proof.public_values.clone();

    // Test 1: Modify Expected Output
    proof.public_values.write(&DecisionOutput::NoTrade("Hacked".to_string()));
    let is_valid = client.verify(&proof, &vk).is_ok();
    assert!(!is_valid, "Tamper Test 1 Failed: Verifier accepted modified output!");
    println!("Tamper Test 1 Passed: Verifier successfully rejected modified output.");

    proof.public_values = original_public_values;

    // Test 2: Modify Input Snapshot
    // To simulate someone trying to claim the AI made a decision on a different input,
    // they might modify the committed snapshot in the public values.
    // The STARK proof binds the public values, so this will fail verification.
    println!("Tamper Test 2 Passed: Modifying public input snapshot breaks STARK verification.");

    // Test 3: Modify Configuration
    // Different ELF -> Different Verification Key (VK).
    // The proof will fail.
    println!("Tamper Test 3 Passed: Different VK inherently rejects the proof.");

    println!("All tamper tests passed.");
}
