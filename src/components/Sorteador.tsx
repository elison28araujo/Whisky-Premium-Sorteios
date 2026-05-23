import React, { useState, useEffect } from "react";
import { Sparkles, Trophy, Calendar, User, Phone, Play, RefreshCw, X } from "lucide-react";
import { Order } from "../types";

interface SorteadorProps {
  orders: Order[];
  onClose: () => void;
}

export function Sorteador({ orders, onClose }: SorteadorProps) {
  const [spinning, setSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<{ number: string; buyer: string; order: Order }[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [drawHistory, setDrawHistory] = useState<{ date: string; number: string; name: string }[]>(() => {
    const saved = localStorage.getItem("whisky_draw_history");
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate candidates list (all approved tickets paired with their buyer names)
  useEffect(() => {
    const list: { number: string; buyer: string; order: Order }[] = [];
    orders
      .filter((o) => o.status === "approved")
      .forEach((order) => {
        (order.numbers || []).forEach((n) => {
          list.push({ number: n, buyer: order.name, order });
        });
      });
    setCandidates(list.sort(() => 0.5 - Math.random())); // shuffle lightly
  }, [orders]);

  const handleStartDraw = () => {
    if (candidates.length === 0) return;
    setSpinning(true);
    setWinnerIndex(null);

    let speed = 40; // milliseconds interval
    let counter = 0;
    const totalTicks = 80 + Math.floor(Math.random() * 40); // length of roulette spin

    const tick = () => {
      setCurrentIndex((prev) => (prev + 1) % candidates.length);
      counter++;

      if (counter < totalTicks) {
        // Slow down spinning near the end
        if (totalTicks - counter < 20) {
          speed += 12;
        } else if (totalTicks - counter < 10) {
          speed += 30;
        }
        setTimeout(tick, speed);
      } else {
        // Pick winner
        const winIdx = (currentIndex + 1) % candidates.length;
        setWinnerIndex(winIdx);
        setSpinning(false);

        // Save to draw history
        const newWinner = candidates[winIdx];
        const record = {
          date: new Date().toLocaleString("pt-BR"),
          number: newWinner.number,
          name: newWinner.buyer,
        };
        const updatedHistory = [record, ...drawHistory];
        setDrawHistory(updatedHistory);
        localStorage.setItem("whisky_draw_history", JSON.stringify(updatedHistory));
      }
    };

    setTimeout(tick, speed);
  };

  const currentCandidate = candidates[currentIndex] || null;
  const finalWinner = winnerIndex !== null ? candidates[winnerIndex] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-900/40 bg-zinc-950 text-white shadow-2xl">
        
        {/* Decorative corner glow */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/20">
          <div className="flex items-center gap-2">
            <Trophy className="text-amber-500 animate-bounce" size={24} />
            <div>
              <h2 className="font-serif text-xl font-bold text-amber-100">Globo da Sorte Premium</h2>
              <p className="text-xs text-zinc-500 font-mono text-left">MECANISMO DE SORTEIO ULTRA-CONFIDENCIAL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={spinning}
            className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition hover:bg-zinc-800 disabled:opacity-40"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 text-center">
          {candidates.length === 0 ? (
            <div className="py-12 px-6 rounded-2xl border border-zinc-900 bg-zinc-950 flex flex-col items-center max-w-md mx-auto space-y-3">
              <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-500">
                <Trophy size={28} />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Nenhuma cota autorizada para o sorteio.</p>
              <p className="text-xs text-zinc-500">
                Navegue pela aba de pedidos e aprove os pagamentos via Pix antes de acionar a roleta.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dynamic spinning board */}
              <div className="relative py-14 px-4 rounded-3xl border border-amber-500/15 bg-gradient-to-br from-zinc-950 via-zinc-900/40 to-amber-950/20 overflow-hidden">
                
                {spinning ? (
                  <div className="space-y-4 animate-pulse">
                    <p className="text-amber-500 text-xs font-mono tracking-widest uppercase">Girando globo espiritual...</p>
                    <div className="text-7xl md:text-8xl font-black font-mono tracking-tight text-amber-300 select-none">
                      {currentCandidate?.number}
                    </div>
                    <p className="text-zinc-300 text-sm font-extrabold truncate max-w-xs mx-auto">
                      {currentCandidate?.buyer}
                    </p>
                  </div>
                ) : finalWinner ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="inline-flex items-center gap-1 bg-amber-500/25 text-amber-300 border border-amber-500/40 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase animate-bounce">
                      <Sparkles size={12} /> GANHADOR CONFIRMADO! <Sparkles size={12} />
                    </div>
                    <div className="text-7xl md:text-8xl font-black font-mono text-amber-400 select-none drop-shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                      {finalWinner.number}
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold tracking-tight text-zinc-100 flex items-center justify-center gap-2">
                        <User size={18} className="text-amber-500" />
                        {finalWinner.buyer}
                      </h4>
                      <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5 font-mono">
                        <Calendar size={12} /> Compra realizada em:{" "}
                        {finalWinner.order.createdAt
                          ? new Date(finalWinner.order.createdAt.seconds * 1000).toLocaleDateString("pt-BR")
                          : new Date().toLocaleDateString("pt-BR")}
                      </p>
                    </div>

                    {/* Masked Contact Details for Action */}
                    <div className="mt-4 pt-4 border-t border-zinc-900 inline-flex flex-col sm:flex-row gap-3 justify-center items-center w-full max-w-sm mx-auto text-xs text-zinc-400">
                      <div className="flex items-center gap-1.5">
                        <Phone size={14} className="text-green-500" />
                        <span>Whats: {finalWinner.order.whatsapp}</span>
                      </div>
                      <a
                        href={`https://wa.me/${finalWinner.order.whatsapp.replace(/\D/g, "")}?text=Parabéns%20${encodeURIComponent(
                          finalWinner.buyer
                        )}!%20Você%20foi%20o%20sortudo%20que%20ganhou%20no%20sorteio%20do%20Whisky%20Premium!`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
                      >
                        Enviar Parabéns ➔
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-zinc-500 text-xs font-mono tracking-widest uppercase">Pronto para sortear</p>
                    <div className="text-7xl md:text-8xl font-black font-mono text-zinc-700 select-none">
                      ---
                    </div>
                    <p className="text-zinc-400 text-sm max-w-sm mx-auto leading-relaxed">
                      Sorteio eletrônico e auditável entre as <span className="text-amber-400 font-bold">{candidates.length}</span> cotas ativas no sistema de rifa.
                    </p>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex justify-center">
                <button
                  onClick={handleStartDraw}
                  disabled={spinning || candidates.length === 0}
                  className="px-8 py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 font-black text-zinc-950 text-base glow-btn flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:pointer-events-none select-none uppercase tracking-wider"
                >
                  {spinning ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Girando...
                    </>
                  ) : (
                    <>
                      <Play size={18} className="fill-zinc-950" />
                      Sortear Cota Vencedora
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Sorteio history */}
          {drawHistory.length > 0 && (
            <div className="text-left space-y-3 pt-6 border-t border-zinc-900 max-h-[160px] overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 font-mono">Últimos Sorteados neste Navegador:</h4>
              <div className="grid gap-2">
                {drawHistory.map((h, i) => (
                  <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-900/80 font-mono">
                    <div className="flex items-center gap-2 text-zinc-300">
                      <span className="font-bold text-amber-400">Cota {h.number}</span>
                      <span className="text-zinc-500">•</span>
                      <span className="truncate max-w-32">{h.name}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{h.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
