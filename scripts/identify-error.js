const { ethers } = require("hardhat");

async function main() {
  const errors = [
    "StrategyEngine__ZeroAddress()",
    "StrategyEngine__ZeroPrice()",
    "StrategyEngine__BreakerPaused()",
    "StrategyEngine__NotExecutable(bytes32)",
    "StrategyEngine__InvalidFlashPool()",
    "StrategyEngine__InvalidFlashAmount()",
    "StrategyEngine__InvalidFlashCaller()",
    "StrategyEngine__InvalidFlashData()",
    "StrategyEngine__InvalidFlashAsset()",
    "StrategyEngine__NoActiveFlash()",
    "StrategyEngine__YieldOverflow()",
    "ProofVault__CallerNotEngine()",
    "ProofVault__ConfigurationLocked()",
    "ProofVault__ZeroAddress()",
    "ProofVault__BufferTooHigh()",
    "ProofVault__NotLocked()",
    "ProofVault__EngineNotSet()",
    "ProofVault__AsterNotSet()",
    "ProofVault__SecondaryNotSet()",
    "ProofVault__LpNotSet()",
    "ProofVault__InsufficientLiquidity()",
    "ProofVault__PegArbNotApproved()",
    "ProofVault__SlippageExceeded(uint256,uint256,uint256)",
    "ProofVault__FlashLoanBlocked()",
    "ProofVault__InvalidFlashAdapter()",
    "ProofVault__InvalidFlashRoute()",
    "ProofVault__FlashPrincipalMissing()",
    "ProofVault__FlashRepayShortfall(uint256,uint256)",
    "ProofVault__VenusDecimalsInvalid()",
    "ProofVault__VenusMintFailed(uint256)",
    "ProofVault__VenusRedeemFailed(uint256)",
    "ProofVault__AdapterReportingFailure(address)",
    "ExecutionAuction__ZeroAddress()",
    "ExecutionAuction__ZeroWindow()",
    "ExecutionAuction__EngineNotReady()",
    "ExecutionAuction__NotBidPhase()",
    "ExecutionAuction__BelowMinBid()",
    "ExecutionAuction__BidTooLow()",
    "ExecutionAuction__NotExecutePhase()",
    "ExecutionAuction__NotWinner()",
    "ExecutionAuction__NotFallbackPhase()",
    "ExecutionAuction__NoRefund()",
    "ExecutionAuction__BidIncrementTooLow(uint256,uint256)",
  ];

  console.log("Searching for selector 0x6dc4cc12...");
  for (const err of errors) {
    const selector = ethers.id(err).slice(0, 10);
    if (selector === "0x6dc4cc12") {
      console.log(`MATCH FOUND: ${err} => ${selector}`);
    }
  }
}

main().catch(console.error);
