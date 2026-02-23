import { VAULT_VERSION } from "@/lib/version-config";
import ProofVaultV1Client from "@/components/v1/ProofVaultV1Client";
import ProofVaultV2Client from "@/components/v2/ProofVaultV2Client";

export default function App() {
  const Client = VAULT_VERSION === 'v2' ? ProofVaultV2Client : ProofVaultV1Client;
  return (
    <main className="shell">
      <Client />
    </main>
  );
}
