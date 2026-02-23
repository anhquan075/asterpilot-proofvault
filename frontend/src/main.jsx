import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import "./globals.css";
import App from "./App.jsx";
import { wagmiConfig } from "../lib/wagmi-config.js";

const queryClient = new QueryClient();

// Aster brand theme for RainbowKit wallet modal
const matrixTheme = darkTheme({
  accentColor: '#C8935A',
  accentColorForeground: '#000000',
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small',
});

// Override modal background and surface colors to match Aster palette
matrixTheme.colors.modalBackground = '#0D0B09';
matrixTheme.colors.modalBorder = 'rgba(200,147,90,0.2)';
matrixTheme.colors.modalText = '#F0D4A8';
matrixTheme.colors.modalTextDim = '#C8935A';
matrixTheme.colors.menuItemBackground = 'rgba(200,147,90,0.06)';
matrixTheme.colors.profileAction = 'rgba(200,147,90,0.08)';
matrixTheme.colors.profileActionHover = 'rgba(200,147,90,0.15)';
matrixTheme.colors.profileForeground = '#0D0B09';
// Connected state: black panel with Aster text
matrixTheme.colors.connectButtonBackground = '#0D0B09';
matrixTheme.colors.connectButtonBackgroundError = '#140A06';
matrixTheme.colors.connectButtonInnerBackground = '#000000';
matrixTheme.colors.connectButtonText = '#F0D4A8';
matrixTheme.colors.connectButtonTextError = '#E05A4A';
matrixTheme.colors.connectionIndicator = '#C8935A';
matrixTheme.colors.downloadBottomCardBackground = '#0D0B09';
matrixTheme.colors.downloadTopCardBackground = '#000000';
matrixTheme.colors.error = '#E05A4A';
matrixTheme.colors.generalBorder = 'rgba(200,147,90,0.15)';
matrixTheme.colors.generalBorderDim = 'rgba(200,147,90,0.08)';
matrixTheme.colors.selectedOptionBorder = 'rgba(200,147,90,0.4)';
matrixTheme.colors.standby = '#7A5030';

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={matrixTheme}>
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
