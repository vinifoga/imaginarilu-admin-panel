// src/components/BarcodeScannerModal.tsx
'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { BarcodeScanner } from '@/utils/barcodeScanner';

interface BarcodeScannerModalProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  onClose: () => void;
}

export interface BarcodeScannerModalRef {
  stopScanner: () => void;
}

export const BarcodeScannerModal = forwardRef<BarcodeScannerModalRef, BarcodeScannerModalProps>(
  ({ onScan, onError, onClose }, ref) => {
    const scannerRef = useRef<BarcodeScanner | null>(null);
    const isScanning = useRef(false);

    useImperativeHandle(ref, () => ({
      stopScanner: () => {
        if (scannerRef.current && isScanning.current) {
          console.log("Parando scanner...");
          scannerRef.current.stop();
          isScanning.current = false;
          liberarCamera(); // Garante que a câmera seja desligada
        }
      }
    }));

    const liberarCamera = () => {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then((stream) => {
          stream.getTracks().forEach(track => {
            console.log('Parando track de vídeo:', track);
            track.stop(); // Força o encerramento
          });
        })
        .catch(error => console.error("Erro ao liberar câmera:", error));
    };    
    
    useEffect(() => {
      if (!isScanning.current && scannerRef.current === null) {
        isScanning.current = true;
        scannerRef.current = new BarcodeScanner({ 
          onSuccess: (decodedText) => {
            onScan(decodedText);
            if (scannerRef.current) {
              scannerRef.current.stop();
              isScanning.current = false;
              liberarCamera(); // Fecha a câmera antes de esconder o modal
            }
            onClose();
          },
          onError: (error) => {
            console.error('Scanner error:', error);
            onError?.(error);
          },
          preferredCamera: 'environment'
        });
        scannerRef.current.start('qr-reader');
      }
    
      return () => {
        if (scannerRef.current) {
          scannerRef.current.stop();
          scannerRef.current = null;
          isScanning.current = false;
        }
      };
    }, [onScan, onError, onClose]);
    

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
        <div className="bg-white p-4 rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Escanear Código de Barras</h2>
            <button 
              onClick={() => {
                if (scannerRef.current) {
                  scannerRef.current.stop();
                  isScanning.current = false;
                }
                onClose();
              }}  
              className="text-gray-700 hover:text-gray-900"
              aria-label="Fechar scanner"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div id="qr-reader" className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden"></div>
          <div className="mt-4 text-center text-sm text-gray-700">
            Aponte a câmera para o código de barras
          </div>
        </div>
      </div>
    );
  }
);

BarcodeScannerModal.displayName = 'BarcodeScannerModal';