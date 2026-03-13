import React, { useState, useCallback } from "react";
import { Radio, ExternalLink, Zap } from "lucide-react";

/// Format raw BigInt token amount to a human-readable string (2 decimal places).
/// Works without importing ethers at module level.
function fmtTokens(raw, dec) {
  if (raw == null || dec == null) return "—";
  const d = typeof dec === "bigint" ? Number(dec) : Number(dec);
  const divisor = 10n ** BigInt(d);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(d, "0").slice(0, 2);
  return `${Number(whole).toLocaleString()}.${fracStr}`;
}

/**
 * VaultTestnetDevPanel — shown only in testnet mode.
 *
 * Provides:
 *  - Testnet environment badge (visual indicator)
 *  - Live data row: TVL, cycle count, wallet mock-USDT balance
 *  - "Mint 10k USDT" button (calls MockERC20.mint — unrestricted on mock contract)
 */
export function VaultTestnetDevPanel({
  tokenAddress,
  signer,
  walletAddress,
  userTokenBalance,
  decimals,
  totalAssetsRaw,
  cycleCountVal,
  blockExplorer,
  onMinted,
  onMintStatus, // New callback for global notification
  networkLabel = "BSC Testnet",
  chainIdNum = 97,
  logoUrl,
  isPolkadotHub = false,
}) {
  const [mintBusy, setMintBusy] = useState(false);

  const handleMint = useCallback(async () => {
    if (!signer || !walletAddress) {
      if (onMintStatus) onMintStatus("error", "Connect wallet first");
      return;
    }
    setMintBusy(true);
    try {
      const { Contract, getAddress, parseUnits } = await import("ethers");
      const mockToken = new Contract(
        getAddress(tokenAddress),
        ["function mint(address to, uint256 amount) external"],
        signer
      );
      const tokenSym = isPolkadotHub ? "USDC" : "USDT";
      const amountStr = "10000";
      const amount = parseUnits(
        amountStr,
        decimals != null ? Number(decimals) : 18
      );
      const tx = await mockToken.mint(walletAddress, amount, {
        gasLimit: 100000,
      });
      await tx.wait();
      
      if (onMintStatus) onMintStatus("success", `Minted ${Number(amountStr).toLocaleString()} mock ${tokenSym}`);
      if (onMinted) onMinted();
    } catch (e) {
      const msg = e.shortMessage || e.message?.slice(0, 80) || "Mint failed";
      if (onMintStatus) onMintStatus("error", msg);
    } finally {
      setMintBusy(false);
    }
  }, [signer, walletAddress, tokenAddress, decimals, onMinted, onMintStatus, isPolkadotHub]);

  return (
    <div
      style={{
        margin: "0 12px 6px",
        padding: "10px 16px",
        background: "rgba(234, 179, 8, 0.06)",
        border: "1px solid rgba(234, 179, 8, 0.25)",
        borderRadius: "8px",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
        fontSize: "12px",
        fontFamily: "inherit",
      }}
    >
      {/* Testnet badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          color: "#FBBF24",
          fontWeight: 700,
          letterSpacing: "0.03em",
        }}
      >
        {logoUrl ? (
          <img src={logoUrl} alt={networkLabel} style={{ width: 16, height: 16, borderRadius: "50%" }} />
        ) : (
          <Radio size={14} />
        )}
        <span>TESTNET · {networkLabel} · Chain {chainIdNum}</span>
        <span style={{ color: "rgba(251,191,36,0.45)", fontWeight: 400 }}>
          — mock contracts
        </span>
      </div>

      {/* Live stats */}
      <div
        style={{
          display: "flex",
          gap: "18px",
          color: "rgba(251, 191, 36, 0.75)",
        }}
      >
        <span>
          TVL:{" "}
          <strong style={{ color: "#FBBF24" }}>
            {fmtTokens(totalAssetsRaw, decimals)}
          </strong>
        </span>
        <span>
          Cycles:{" "}
          <strong style={{ color: "#FBBF24" }}>{cycleCountVal ?? "—"}</strong>
        </span>
        <span>
          Wallet:{" "}
          <strong style={{ color: "#FBBF24" }}>
            {fmtTokens(userTokenBalance, decimals)} {isPolkadotHub ? "USDC" : "USDT"}
          </strong>
        </span>
      </div>

      {/* Mint button + explorer link */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginLeft: "auto",
        }}
      >
        <button
          onClick={handleMint}
          disabled={mintBusy || !signer}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            padding: "4px 14px",
            borderRadius: "6px",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            background: mintBusy
              ? "rgba(234, 179, 8, 0.04)"
              : "rgba(234, 179, 8, 0.12)",
            color: "#FBBF24",
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: "inherit",
            cursor: mintBusy || !signer ? "not-allowed" : "pointer",
            opacity: mintBusy || !signer ? 0.55 : 1,
            transition: "opacity 0.15s",
            width: "fit-content",
          }}
        >
          <Zap size={11} />
          {mintBusy ? "Minting…" : `Mint 10k ${isPolkadotHub ? "USDC" : "USDT"}`}
          {tokenAddress && blockExplorer && (
            <a
              href={`${blockExplorer}/address/${tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`View mock ${isPolkadotHub ? "USDC" : "USDT"} on explorer`}
              onClick={(e) => e.stopPropagation()}
              style={{
                color: "rgba(251,191,36,0.5)",
                display: "inline-flex",
                alignItems: "center",
                marginLeft: "4px",
              }}
            >
              <ExternalLink size={10} />
            </a>
          )}
        </button>
      </div>
    </div>
  );
}

export default VaultTestnetDevPanel;
