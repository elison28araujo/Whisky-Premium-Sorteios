import React, { useState, useMemo } from "react";
import { Search, Trophy, Sparkles, AlertCircle } from "lucide-react";

interface NumberedGridProps {
  totalNumbers: number;
  approvedNumbers: Set<string>;
  pendingNumbers: Set<string>;
  selected: string[];
  onToggle: (number: string) => void;
  onSelectBatch: (numbers: string[]) => void;
}

export function NumberedGrid({
  totalNumbers,
  approvedNumbers,
  pendingNumbers,
  selected,
  onToggle,
  onSelectBatch,
}: NumberedGridProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "available" | "pending">("all");

  const size = String(totalNumbers || 100).length;

  const allNumbers = useMemo(() => {
    return Array.from({ length: Number(totalNumbers || 0) }, (_, index) => {
      const n = index + 1;
      return String(n).padStart(size, "0");
    });
  }, [totalNumbers, size]);

  const filteredNumbers = useMemo(() => {
    return allNumbers.filter((number) => {
      // Search match
      if (search && !number.includes(search)) return false;

      // Type segment filter
      if (filterType === "available") {
        return !approvedNumbers.has(number) && !pendingNumbers.has(number);
      }
      if (filterType === "pending") {
        return pendingNumbers.has(number);
      }
      return true;
    });
  }, [allNumbers, search, filterType, approvedNumbers, pendingNumbers]);

  // Bulk Quick Selector actions
  const luckyNumbers = (count: number) => {
    const available = allNumbers.filter(
      (n) => !approvedNumbers.has(n) && !pendingNumbers.has(n) && !selected.includes(n)
    );
    if (available.length === 0) return;
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, Math.min(count, available.length));
    onSelectBatch([...selected, ...picked]);
  };

  const getPercentageSoldCount = () => {
    const sold = approvedNumbers.size;
    const percentage = Math.round((sold / totalNumbers) * 100) || 0;
    return percentage;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 items-center text-center">
        <div className="flex flex-col items-center">
          <h3 className="font-serif text-2xl font-black text-amber-100 tracking-tight flex items-center gap-2 justify-center">
            <Trophy className="text-amber-500" size={24} />
            Escolha Seus Números
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md">
            Selecione de forma manual clicando nas cotas, ou use os aceleradores de compra abaixo.
          </p>
        </div>

        {/* Search & Simple Stats */}
        <div className="flex items-center gap-2 w-full max-w-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Buscar cota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl bg-zinc-950 border border-zinc-800 py-2.5 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Acelera de compras / Smart Batches */}
      <div className="p-5 rounded-3xl border border-amber-900 bg-amber-950/40 space-y-4 flex flex-col items-center">
        <p className="text-[10px] font-bold text-amber-200/80 flex items-center gap-1.5 uppercase tracking-[0.2em]">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          Aceleradores de Compra (Cotas Aleatórias)
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={() => luckyNumbers(3)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +3 Cotas
          </button>
          <button
            onClick={() => luckyNumbers(5)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-amber-500/20 bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +5 Cotas <span className="text-[10px] text-amber-400 font-normal ml-0.5 opacity-70">(Mais Popular)</span>
          </button>
          <button
            onClick={() => luckyNumbers(10)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-amber-500/20 bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +10 Cotas <span className="text-[10px] text-amber-400 font-normal ml-0.5 opacity-70">(Chances+)</span>
          </button>
          <button
            onClick={() => luckyNumbers(20)}
            className="px-4 py-2.5 text-xs font-bold rounded-xl border border-amber-500/20 bg-amber-500/25 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +20 Cotas <span className="text-[10px] text-amber-400/90 font-normal ml-0.5 opacity-70">VIP High Roller</span>
          </button>
        </div>
        
        {selected.length > 0 && (
          <button
            onClick={() => onSelectBatch([])}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition duration-200 active:scale-95 mt-1"
          >
            Limpar Seleção ({selected.length})
          </button>
        )}
      </div>

      {/* Grid view segments */}
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-2 justify-center">
        <button
          onClick={() => setFilterType("all")}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            filterType === "all" ? "border-amber-500 text-amber-400" : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Todos ({allNumbers.length})
        </button>
        <button
          onClick={() => setFilterType("available")}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            filterType === "available"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Disponíveis ({totalNumbers - approvedNumbers.size - pendingNumbers.size})
        </button>
        <button
          onClick={() => setFilterType("pending")}
          className={`pb-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition ${
            filterType === "pending"
              ? "border-amber-500 text-amber-400"
              : "border-transparent text-zinc-500 hover:text-zinc-300"
          }`}
        >
          Reservados ({pendingNumbers.size})
        </button>
      </div>

      {/* Numeric Grid */}
      <div className="grid grid-cols-4 gap-2 xs:grid-cols-5 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-12 max-h-[420px] overflow-y-auto pr-2">
        {filteredNumbers.map((number) => {
          const isApproved = approvedNumbers.has(number);
          const isPending = pendingNumbers.has(number);
          const isSelected = selected.includes(number);

          let btnClass = "border border-yellow-500/30 bg-yellow-400/90 text-zinc-950 font-bold hover:border-yellow-400 hover:bg-yellow-400 hover:scale-105";
          let icon = null;

          if (isApproved) {
            btnClass = "border-red-500/20 bg-red-500/10 text-red-500/20 cursor-not-allowed opacity-30 overflow-hidden";
            icon = <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black opacity-10 rotate-12">PAGO</span>;
          } else if (isSelected) {
            btnClass = "border-zinc-950 bg-zinc-950 text-yellow-400 font-black shadow-[0_0_15px_rgba(251,191,36,0.6)] animate-pulse scale-110 z-10 border-2";
          } else if (isPending) {
            btnClass = "border-amber-500/40 bg-amber-500/20 text-amber-500/70 cursor-not-allowed";
            icon = <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />;
          }

          return (
            <button
              key={number}
              disabled={isApproved || isPending}
              onClick={() => onToggle(number)}
              title={
                isApproved
                  ? "Cota vendida e confirmada"
                  : isPending
                  ? "Aguardando confirmação de PIX"
                  : "Disponível - Clique para selecionar"
              }
              className={`relative rounded-xl py-3 px-1 text-xs font-mono transition-all duration-200 select-none ${btnClass} ${
                !isApproved && !isPending ? "active:scale-90 hover:-translate-y-0.5" : ""
              }`}
            >
              {number}
              {icon}
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-950 border border-amber-900 flex items-center justify-center text-[8px] font-sans font-black text-amber-400 shadow-lg">
                  ✓
                </span>
              )}
            </button>
          );
        })}

        {filteredNumbers.length === 0 && (
          <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl space-y-2">
            <AlertCircle className="mx-auto text-zinc-600" size={24} />
            <p className="text-sm">Nenhuma cota corresponde ao filtro ou busca.</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3 p-4 bg-zinc-950 rounded-xl border border-white/10 text-[10px] text-zinc-400 uppercase tracking-widest font-bold">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-400 border border-yellow-600" />
          <span>Livre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500/20 border border-amber-500/30" />
          <span className="text-amber-500/80">Reservado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500/10 border border-red-500/20" />
          <span className="text-red-500/40">Pago</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-zinc-950 border border-yellow-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]" />
          <span className="text-yellow-400">Sua Seleção</span>
        </div>
      </div>
    </div>
  );
}
