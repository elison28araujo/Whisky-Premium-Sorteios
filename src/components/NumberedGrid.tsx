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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-serif text-2xl font-black text-amber-100 tracking-tight flex items-center gap-2">
            <Trophy className="text-amber-500" size={24} />
            Escolha Seus Números
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Selecione de forma manual clicando nas cotas, ou use os aceleradores de compra abaixo.
          </p>
        </div>

        {/* Search & Simple Stats */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Buscar cota..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-40 rounded-xl bg-zinc-900 border border-zinc-800 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Acelera de compras / Smart Batches */}
      <div className="p-4 rounded-xl border border-amber-900/30 bg-amber-950/10 space-y-3">
        <p className="text-xs font-semibold text-amber-200/80 flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles size={14} className="text-amber-400 animate-pulse" />
          Aceleradores de Compra (Cotas Aleatórias)
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => luckyNumbers(3)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +3 Cotas
          </button>
          <button
            onClick={() => luckyNumbers(5)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-amber-500/20 bg-amber-500/15 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +5 Cotas <span className="text-[10px] text-amber-400 font-normal">(Mais Popular)</span>
          </button>
          <button
            onClick={() => luckyNumbers(10)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-amber-500/20 bg-amber-500/20 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +10 Cotas <span className="text-[10px] text-amber-400 font-normal">(Chances+)</span>
          </button>
          <button
            onClick={() => luckyNumbers(20)}
            className="px-3 py-2 text-xs font-bold rounded-lg border border-amber-500/20 bg-amber-500/25 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95"
          >
            +20 Cotas <span className="text-[10px] text-amber-400/90 font-normal">VIP High Roller</span>
          </button>
          {selected.length > 0 && (
            <button
              onClick={() => onSelectBatch([])}
              className="px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition duration-200 active:scale-95 ml-auto"
            >
              Limpar Seleção ({selected.length})
            </button>
          )}
        </div>
      </div>

      {/* Grid view segments */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-2">
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

          let btnClass = "border border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-amber-500/50 hover:bg-amber-500/5";
          if (isApproved) {
            btnClass = "border-zinc-800/80 bg-zinc-800/25 text-zinc-600 line-through cursor-not-allowed";
          } else if (isSelected) {
            btnClass = "border-amber-500 bg-gradient-to-br from-amber-500 to-amber-600 text-zinc-950 font-black shadow-lg shadow-amber-500/20";
          } else if (isPending) {
            // Make it look more "Occupied" but distinct from fully approved
            btnClass = "border-zinc-700 bg-zinc-800/10 text-zinc-500 opacity-60 cursor-not-allowed grayscale";
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
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-zinc-950 border border-amber-300 flex items-center justify-center text-[6px] font-sans font-black text-amber-400">
                  ✓
                </span>
              )}
              {isPending && (
                <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500" />
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

      {/* Colour Legends */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 p-3 bg-zinc-900/30 rounded-lg border border-zinc-900 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zinc-900 border border-zinc-800" />
          <span>Livre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zinc-800/10 border border-zinc-700 grayscale" />
          <span>Em Processamento (Reservado)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-zinc-800/40 border border-zinc-800 strike-through" />
          <span className="line-through text-zinc-500">Comprado (Confirmado)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-500 to-amber-600" />
          <span className="text-amber-400 font-medium">Sua Seleção</span>
        </div>
      </div>
    </div>
  );
}
