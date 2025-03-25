// src/utils/barcodeScanner.ts
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";

export interface BarcodeScannerOptions {
  onSuccess: (decodedText: string) => void;
  onError?: (errorMessage: string) => void;
  preferredCamera?: "environment" | "user";
}

export class BarcodeScanner {
  private scanner: Html5QrcodeScanner | null = null;
  private isStopped = false;

  constructor(private options: BarcodeScannerOptions) {}

  public start(elementId: string = "qr-reader"): void {
    if (this.scanner) {
      this.stop();
    }

    this.isStopped = false;

    const config = {
      fps: 10,
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      videoConstraints: {
        facingMode: this.options.preferredCamera || "environment",
      },
    };

    this.scanner = new Html5QrcodeScanner(elementId, config, false);

    this.scanner.render(
      (decodedText) => {
        if (this.isStopped) return;
        this.options.onSuccess(decodedText);
        this.stop();
      },
      (errorMessage) => {
        if (this.isStopped) return;
        // Ignora erros comuns de "não encontrado"
        if (!errorMessage.includes("No MultiFormat Readers")) {
          this.options.onError?.(errorMessage);
        }
      }
    );
  }

  public stop(): void {
    if (this.scanner && !this.isStopped) {
      this.isStopped = true;
      this.scanner.clear().catch(() => {});
      this.scanner = null;
    }
  }
}
