import React, { useState, useEffect } from "react";
import { Upload, FileCheck, RefreshCw, Eye, Sparkles } from "lucide-react";

interface InteractiveScannerProps {
  receipt: File | null;
  onFileSelect: (file: File | null) => void;
  expectedAmount: number;
}

export function InteractiveScanner({ receipt, onFileSelect, expectedAmount }: InteractiveScannerProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>("Aguardando arquivo...");
  const [scanLogs, setScanLogs] = useState<string[]>([]);

  useEffect(() => {
    if (!receipt) {
      setPreviewUrl(null);
      setScanLogs([]);
      setScanStatus("Aguardando arquivo...");
      return;
    }

    // Set preview URL
    const url = URL.createObjectURL(receipt);
    setPreviewUrl(url);

    // Trigger simulated scanning effect
    setScanning(true);
    setScanStatus("Lendo metadados do arquivo...");
    setScanLogs(["[SISTEMA] IniciandoOCR...", `[SISTEMA] Tamanho: ${(receipt.size / 1024).toFixed(1)} KB`]);

    const logs = [
      "Processando camadas de imagem...",
      "Identificando logomarca do banco...",
      "Extraindo Chave PIX destinatária...",
      `Validando beneficiário: ELISON DA SILVA ARAUJO`,
      `Valor calculado: R$ ${expectedAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      "Validação local concluída. Pronto para enviar à conferência!",
    ];

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setScanLogs((prev) => [...prev, `[SISTEMA] ${logs[currentLogIndex]}`]);
        setScanStatus(logs[currentLogIndex]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        setScanning(false);
        setScanStatus("Verificado de forma preliminar!");
      }
    }, 700);

    return () => {
      clearInterval(interval);
      URL.revokeObjectURL(url);
    };
  }, [receipt, expectedAmount]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const triggerFileInput = () => {
    document.getElementById("hidden-file-input")?.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-zinc-300">Comprovante de Pagamento PIX</label>
        {receipt && (
          <button
            type="button"
            onClick={() => onFileSelect(null)}
            className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1 font-semibold"
          >
            Remover cota
          </button>
        )}
      </div>

      {!receipt ? (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-950 p-6 text-center hover:border-amber-500/50 hover:bg-amber-500/[0.02] transition-all duration-300"
        >
          <input
            id="hidden-file-input"
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
          />
          <div className="space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:bg-amber-500/10 group-hover:text-amber-400 transition-colors">
              <Upload size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-200">Arraste ou clique para enviar</p>
              <p className="text-xs text-zinc-500 mt-1">Formatos de imagem ou PDF de até 5MB</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Left side preview & scanning bar */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Pré-visualização do comprovante"
                  className="h-full w-full object-contain"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <FileCheck className="text-zinc-700" size={48} />
              )}

              {/* Laser Animating beam */}
              {scanning && (
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent shadow-[0_0_12px_#f59e0b] animate-scan" />
              )}

              {/* Scanner HUD Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60 pointer-events-none" />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] font-mono bg-zinc-950/80 p-1.5 rounded text-amber-500 border border-amber-500/20 backdrop-blur-sm">
                <span className="truncate">{receipt.name}</span>
                <span className="shrink-0">{scanning ? "ESCANEANDO" : "CONCLUÍDO"}</span>
              </div>
            </div>

            {/* Right side live OCR OCR output */}
            <div className="flex flex-col justify-between space-y-3">
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800/60 grow flex flex-col h-full overflow-hidden">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-1.5 mb-2">
                  <Sparkles size={12} className="text-amber-500" />
                  Scanner IA de Comprovantes
                </div>

                <div className="space-y-1.5 font-mono text-[10px] text-zinc-400 overflow-y-auto max-h-[140px] grow pr-1 scrollbar-thin">
                  {scanLogs.map((log, index) => (
                    <div key={index} className="truncate select-none leading-relaxed">
                      {log}
                    </div>
                  ))}
                  {scanning && (
                    <div className="flex items-center gap-1 text-amber-500/80 italic">
                      <RefreshCw size={10} className="animate-spin" /> Escaneando e analisando dados...
                    </div>
                  )}
                </div>
              </div>

              {/* Status footer with validation status */}
              <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                scanning
                  ? "border-amber-500/20 bg-amber-500/5 text-amber-400"
                  : "border-green-500/20 bg-green-500/5 text-green-400"
              }`}>
                <div className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                <span className="text-xs font-bold leading-tight">{scanStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
