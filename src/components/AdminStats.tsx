import React, { useMemo } from "react";
import { DollarSign, ShieldCheck, Clock3, UserCheck, Inbox, Flame, Trash2 } from "lucide-react";
import { Order, Campaign } from "../types";

interface AdminStatsProps {
  orders: Order[];
  campaign: Campaign;
  onPurgeLocalStorage?: () => void;
}

export function AdminStats({ orders, campaign, onPurgeLocalStorage }: AdminStatsProps) {
  // Statistics Calculations
  const stats = useMemo(() => {
    const totalPotential = (campaign.totalNumbers || 100) * (campaign.ticketPrice || 10);
    
    let approvedTotal = 0;
    let pendingTotal = 0;
    const acceptedNumbersSet = new Set<string>();
    const pendingNumbersSet = new Set<string>();
    const uniqueParticipantsSet = new Set<string>();

    orders.forEach((o) => {
      uniqueParticipantsSet.add(o.cpf);
      if (o.status === "approved") {
        approvedTotal += o.amount || 0;
        (o.numbers || []).forEach((num) => acceptedNumbersSet.add(num));
      } else if (o.status === "pending") {
        pendingTotal += o.amount || 0;
        (o.numbers || []).forEach((num) => pendingNumbersSet.add(num));
      }
    });

    const soldCount = acceptedNumbersSet.size;
    const pendingCount = pendingNumbersSet.size;
    const percentageSold = campaign.totalNumbers ? Math.round((soldCount / campaign.totalNumbers) * 100) : 0;

    return {
      totalPotential,
      approvedTotal,
      pendingTotal,
      soldCount,
      pendingCount,
      percentageSold,
      uniqueParticipants: uniqueParticipantsSet.size,
    };
  }, [orders, campaign]);

  const money = (val: number) => {
    return val.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  return (
    <div className="space-y-6">
      {/* Cards stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Faturamento Confirmado */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
            <DollarSign size={16} />
          </div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Caixa Confirmado</p>
          <p className="text-2xl font-black text-green-400 font-sans tracking-tight">
            {money(stats.approvedTotal)}
          </p>
          <div className="text-[10px] text-zinc-500 font-mono">
            Recebido com comprovantes conferidos
          </div>
        </div>

        {/* Metric 2: Faturamento Pendente */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Clock3 size={16} />
          </div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Caixa Pendente</p>
          <p className="text-2xl font-black text-amber-400 font-sans tracking-tight">
            {money(stats.pendingTotal)}
          </p>
          <div className="text-[10px] text-zinc-500 font-mono">
            Aguardando aprovação manual do pix
          </div>
        </div>

        {/* Metric 3: Total Cotas Vendidas */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Flame size={16} />
          </div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Cotas Vendidas</p>
          <p className="text-2xl font-black text-zinc-100 font-sans tracking-tight">
            {stats.soldCount} <span className="text-sm text-zinc-500">/ {campaign.totalNumbers}</span>
          </p>
          <div className="text-[10px] text-zinc-500 flex items-center justify-between font-mono">
            <span>Progresso da Rifa:</span>
            <span className="font-bold text-amber-500">{stats.percentageSold}%</span>
          </div>
        </div>

        {/* Metric 4: Participantes Únicos */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-2 relative overflow-hidden">
          <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
            <UserCheck size={16} />
          </div>
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider font-mono">Participantes</p>
          <p className="text-2xl font-black text-zinc-100 font-sans tracking-tight">
            {stats.uniqueParticipants}
          </p>
          <div className="text-[10px] text-zinc-500 font-mono">
            Compradores com CPFs cadastrados
          </div>
        </div>
      </div>

      {/* Progress visual section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-wider text-amber-500 font-mono flex items-center justify-between">
          <span>Relatório de Vendas Gerais</span>
          {onPurgeLocalStorage && (
            <button
              onClick={() => {
                if (confirm("Deseja realmente apagar todos os pedidos de teste salvos LOCALMENTE?")) {
                  onPurgeLocalStorage();
                }
              }}
              className="text-[10px] text-red-400 hover:text-red-300 transition flex items-center gap-1 font-semibold uppercase font-sans border border-red-900/40 hover:border-red-500/30 px-2 py-1 rounded bg-red-950/25 active:scale-95"
            >
              <Trash2 size={11} /> Resetar Vendas Locais para Teste
            </button>
          )}
        </h4>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Capacidade de receita total: {money(stats.totalPotential)}</span>
            <span>{stats.soldCount} cotas confirmadas</span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-zinc-900 border border-zinc-800 p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all duration-500"
              style={{ width: `${stats.percentageSold}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono pt-1">
            <span>Disponíveis: {campaign.totalNumbers - stats.soldCount - stats.pendingCount}</span>
            <span>Pendentes de Pix: {stats.pendingCount}</span>
            <span>Vendido: {stats.soldCount} ({stats.percentageSold}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
