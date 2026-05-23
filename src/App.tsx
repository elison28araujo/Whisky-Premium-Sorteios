/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  ShieldCheck,
  Copy,
  CheckCircle2,
  Clock3,
  XCircle,
  Settings,
  Ticket,
  LogOut,
  Search,
  Trophy,
  Activity,
  User,
  AlertCircle,
  FileCheck,
  Smartphone,
  Info,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Inbox,
  MessageCircle,
  QrCode,
} from "lucide-react";

import { Campaign, Order } from "./types";
import confetti from "canvas-confetti";
import { NumberedGrid } from "./components/NumberedGrid";
import { Sorteador } from "./components/Sorteador";
import { AdminStats } from "./components/AdminStats";

// 1. Image Asset Constants (Loaded from AI generated assets)
// @ts-ignore
import bgBrasilParaAsset from "./assets/images/brasil_para_world_cup_bg_1779514175253.png";
// @ts-ignore
import whiskyBannerAsset from "./assets/images/whisky_banner_1779503336702.png";
// @ts-ignore
import whiskyChestAsset from "./assets/images/whisky_chest_1779503353570.png";

// Raw Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHak7DH00OqAXD-IjOt3zRnOtuPGk2bxc",
  authDomain: "whisky-premium-sorteios.firebaseapp.com",
  projectId: "whisky-premium-sorteios",
  storageBucket: "whisky-premium-sorteios.firebasestorage.app",
  messagingSenderId: "53548867756",
  appId: "1:53548867756:web:414374eab99b11d2113f09",
  measurementId: "G-Y1R58WW4C2"
};

// Check if Firebase configuration has placeholder values
const isDemoConfig =
  !firebaseConfig.apiKey ||
  firebaseConfig.apiKey.includes("COLOQUE") ||
  firebaseConfig.projectId.includes("COLOQUE");

// Initialize Firebase safely
let appInstance;
let authInstance: any = null;
let dbInstance: any = null;
let isFirebaseActive = false;

if (!isDemoConfig) {
  try {
    appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
    isFirebaseActive = true;
  } catch (err) {
    console.error("Erro ao inicializar Firebase real; ativando redundância Local:", err);
    isFirebaseActive = false;
  }
}

const DEFAULT_CAMPAIGN: Campaign = {
  siteName: "Whisky Premium Sorteios",
  active: true,
  prizeName: "The Macallan Double Cask 15 Anos - Coleção Privada",
  prizeDescription:
    "Ganhador receberá um exemplar lacrado de The Macallan Double Cask 15 Anos, acompanhado de caixa original luxuosa em madeira e dois copos de cristal Lapidado. Um single malt majestoso, maturado nos melhores barris de xerez espanhóis e carvalho americano.",
  ticketPrice: 15,
  totalNumbers: 100,
  drawMode: "Ao concluir todas as vendas ou na data definida pelo administrador.",
  drawDate: "",
  pixKey: "91985066711",
  pixHolder: "ELISON DA SILVA ARAUJO - NUPAGAMENTOS",
  rules:
    "Participação permitida apenas para maiores de 18 anos. Os números são confirmados somente de forma eletrônica após confirmação instantânea do Pix pelo sistema. A entrega do produto é realizada via transportadora segurada ou em mãos conforme regulamento.",
  whatsappGroupUrl: "https://chat.whatsapp.com/GgGvOnfIasvEnT90pLaSeX",
  whatsappContact: "91985066711",
  pixType: "simulator",
  mpAccessToken: "",
  updatedAt: 0,
};

// Mask Formatters
function formatCPF(val: string): string {
  const clean = val.replace(/\D/g, "");
  return clean
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
    .slice(0, 14);
}

function formatWhatsApp(val: string): string {
  const clean = val.replace(/\D/g, "");
  if (clean.length <= 10) {
    return clean.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2").slice(0, 14);
  }
  return clean.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);
}

function money(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default function App() {
  const [campaign, setCampaign] = useState<Campaign>(() => {
    const local = localStorage.getItem("whisky_premium_settings");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed.updatedAt && parsed.updatedAt > 0) {
          return { ...DEFAULT_CAMPAIGN, ...parsed };
        }
      } catch (e) {}
    }
    return DEFAULT_CAMPAIGN;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const local = localStorage.getItem("whisky_premium_orders");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [ageConfirmed, setAgeConfirmed] = useState<boolean>(() => {
    return localStorage.getItem("whisky_age_confirmed") === "true";
  });
  const [adminMode, setAdminMode] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<string>("");
  // Sync / Load logic
  useEffect(() => {
    let unsubAuth = () => {};
    let unsubCampaign = () => {};
    let unsubOrders = () => {};

    if (isFirebaseActive && authInstance && dbInstance) {
      unsubAuth = onAuthStateChanged(authInstance, (user) => {
        setAdminUser(user);
      });

      // Synchronously load from localStorage first as instant cache/offline placeholder
      const localCampaign = localStorage.getItem("whisky_premium_settings");
      if (localCampaign) {
        try {
          const parsed = JSON.parse(localCampaign);
          if (parsed.updatedAt && parsed.updatedAt > 0) {
            setCampaign({ ...DEFAULT_CAMPAIGN, ...parsed });
          }
        } catch (e) {}
      }
      const localOrders = localStorage.getItem("whisky_premium_orders");
      if (localOrders) {
        try {
          setOrders(JSON.parse(localOrders));
        } catch (e) {}
      }

      unsubCampaign = onSnapshot(doc(dbInstance, "settings", "campaign"), async (snap) => {
        if (!snap.exists()) {
          const localStr = localStorage.getItem("whisky_premium_settings");
          if (localStr) {
            try {
              const localCampaign = JSON.parse(localStr);
              setDoc(doc(dbInstance, "settings", "campaign"), localCampaign).catch(e => console.warn("Background setup error:", e));
            } catch (e) {
              console.warn("Falha ao inicializar campanha no Firestore com dados locais:", e);
            }
          } else {
            try {
              setDoc(doc(dbInstance, "settings", "campaign"), DEFAULT_CAMPAIGN).catch(e => console.warn("Background setup error:", e));
            } catch (e) {}
          }
        } else {
          const serverData = snap.data();
          const serverUpdatedAt = Number(serverData?.updatedAt || 0);

          // Get newest local updatedAt property
          let localUpdatedAt = 0;
          const localStr = localStorage.getItem("whisky_premium_settings");
          if (localStr) {
            try {
              const parsed = JSON.parse(localStr);
              localUpdatedAt = Number(parsed.updatedAt || 0);
            } catch (e) {}
          }

          if (serverUpdatedAt > 0 && serverUpdatedAt > localUpdatedAt) {
            const loadedCampaign = { ...DEFAULT_CAMPAIGN, ...serverData };
            setCampaign(loadedCampaign);
            localStorage.setItem("whisky_premium_settings", JSON.stringify(loadedCampaign));
          } else if (serverUpdatedAt === 0 && localUpdatedAt === 0) {
            // Keep using the in-code DEFAULT_CAMPAIGN if neither admin nor local has saved
            setCampaign({ ...DEFAULT_CAMPAIGN });
          }
        }
        setLoading(false);
      }, (err) => {
        console.warn("Erro ao ler settings no Firestore, usando dados locais offline:", err);
        setLoading(false);
      });

      const q = query(collection(dbInstance, "orders"), orderBy("createdAt", "desc"));
      unsubOrders = onSnapshot(q, (snap) => {
        const loadedOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order));
        setOrders(loadedOrders);
        localStorage.setItem("whisky_premium_orders", JSON.stringify(loadedOrders));
      }, (error) => {
        console.warn("Erro ao escutar ordens de pagamento no Firestore, usando local:", error);
        setLoading(false);
      });
    } else {
      // Local setup fallback if Firebase gets initialized without configuration
      const localCampaign = localStorage.getItem("whisky_premium_settings");
      if (localCampaign) {
        try {
          const parsed = JSON.parse(localCampaign);
          if (parsed.updatedAt && parsed.updatedAt > 0) {
            setCampaign({ ...DEFAULT_CAMPAIGN, ...parsed });
          } else {
            setCampaign(DEFAULT_CAMPAIGN);
          }
        } catch (e) {
          setCampaign(DEFAULT_CAMPAIGN);
        }
      } else {
        localStorage.setItem("whisky_premium_settings", JSON.stringify(DEFAULT_CAMPAIGN));
      }
      const localOrders = localStorage.getItem("whisky_premium_orders");
      if (localOrders) {
        setOrders(JSON.parse(localOrders));
      }
      setLoading(false);
    }

    return () => {
      unsubAuth();
      unsubCampaign();
      unsubOrders();
    };
  }, []);

  // 3. Derived State: Grid calculations (cached for performance)
  const approvedNumbers = useMemo(() => {
    const set = new Set<string>();
    orders
      .filter((order) => order.status === "approved")
      .forEach((order) => (order.numbers || []).forEach((n) => set.add(n)));
    return set;
  }, [orders]);

  const pendingNumbers = useMemo(() => {
    const set = new Set<string>();
    const now = Date.now();
    orders
      .filter((order) => {
        if (order.status !== "pending") return false;
        // Optional: Filter out logic for EXPIRED pending orders (e.g. older than 15 mins)
        // If the admin doesn't manually approve or the automatic check fails, we release them after 15m
        const createdAt = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : 0;
        if (createdAt > 0 && now - createdAt > 15 * 60 * 1000) return false;
        return true;
      })
      .forEach((order) => (order.numbers || []).forEach((n) => set.add(n)));
    return set;
  }, [orders]);

  const availableNumbers = useMemo(() => {
    const targetLength = String(campaign.totalNumbers || 100).length;
    return Array.from({ length: Number(campaign.totalNumbers || 100) }, (_, i) => {
      return String(i + 1).padStart(targetLength, "0");
    }).filter((n) => !approvedNumbers.has(n));
  }, [campaign.totalNumbers, approvedNumbers]);

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast("");
    }, 3000);
  };

  // Age Gate verification callback
  const handleConfirmAge = () => {
    localStorage.setItem("whisky_age_confirmed", "true");
    setAgeConfirmed(true);
    triggerToast("Acesso autorizado! Boas compras.");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 font-sans text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin mb-4" />
        <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest">Carregando lounge premium...</p>
      </main>
    );
  }

  // Age Gate (Strict compliance for alcohol prize sweepstakes)
  if (!ageConfirmed) {
    return (
      <main className="min-h-screen font-sans bg-zinc-950 text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Amber Ambient Glow */}
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg z-10"
        >
          <div className="rounded-3xl border border-amber-500/15 bg-zinc-900/40 backdrop-blur-xl text-white p-8 md:p-10 shadow-2xl relative">
            <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 rounded-t-3xl" />
            
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/25 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <ShieldCheck size={36} />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] tracking-[0.4em] text-amber-500 font-bold uppercase">Área Altamente Restrita</p>
                <h1 className="text-3xl font-black font-serif text-amber-100 tracking-tight">
                  {campaign.siteName}
                </h1>
              </div>

              <p className="text-sm text-zinc-300 leading-relaxed">
                Este site hospeda campanhas com prêmios de bebidas alcoólicas refinadas de alta gradação. 
                Sua entrada está sujeita a verificação de idade legislativa.
              </p>

              <div className="rounded-2xl border border-amber-500/10 bg-amber-950/20 p-4 text-xs text-amber-200/90 text-left flex items-start gap-2">
                <Info size={16} className="shrink-0 text-amber-500 mt-0.5" />
                <p>
                  <strong>REGULAÇÃO FEDERAL:</strong> Proibida a participação de menores de 18 anos. 
                  A entrega do prêmio é estritamente condicionada à validação presencial de documento oficial com foto.
                </p>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleConfirmAge}
                  className="w-full text-zinc-950 font-black tracking-wider uppercase text-xs py-5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-98 transition duration-200 glow-btn"
                >
                  Tenho 18 anos ou mais (Entrar)
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <div 
      className="min-h-screen font-sans bg-zinc-950 text-amber-50 pb-20 selection:bg-amber-500/20 selection:text-amber-200 bg-cover bg-center bg-fixed"
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.0), rgba(0, 0, 0, 0.1)), url(${bgBrasilParaAsset})` }}
    >
      
      {/* Main Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-md border-b border-white/10">
        <div className="mx-auto max-w-7xl flex items-center justify-between p-4 md:p-5">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 items-center justify-center text-zinc-950 font-black shadow-lg">
              BR
            </div>
            <div>
              <p className="text-[10px] uppercase font-mono font-bold tracking-[0.3em] text-amber-500">VIP Lounges</p>
              <h1 className="text-lg md:text-xl font-black font-serif tracking-tight text-white">{campaign.siteName}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdminMode(!adminMode)}
              className="text-xs font-bold py-2.5 px-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 transition duration-200 active:scale-95 flex items-center gap-1.5"
            >
              {adminMode ? "Ver Campanha" : "Acesso Administrativo"}
            </button>
          </div>
        </div>
      </header>

      {/* Render Main Workspace */}
      <AnimatePresence mode="wait">
        {adminMode ? (
          <motion.div
            key="admin"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto max-w-7xl p-4 md:p-6"
          >
            <AdminPanel
              campaign={campaign}
              setCampaign={setCampaign}
              orders={orders}
              setOrders={setOrders}
              adminUser={adminUser}
              setAdminUser={setAdminUser}
              isFirebaseActive={isFirebaseActive}
              triggerToast={triggerToast}
            />
          </motion.div>
        ) : (
          <motion.div
            key="client"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-auto max-w-7xl p-4 md:p-6"
          >
            <ClientSite
              campaign={campaign}
              orders={orders}
              setOrders={setOrders}
              approvedNumbers={approvedNumbers}
              pendingNumbers={pendingNumbers}
              availableNumbers={availableNumbers}
              triggerToast={triggerToast}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Global Micro Toast notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl bg-zinc-900 border border-amber-500/30 text-amber-300 shadow-xl shadow-black/80 text-xs font-bold font-mono flex items-center gap-2"
          >
            <Sparkles size={14} className="text-amber-400" />
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// CLIENT WORKSPACE / MAIN RAFFLE VISUAL
// ==========================================
interface ClientSiteProps {
  campaign: Campaign;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  approvedNumbers: Set<string>;
  pendingNumbers: Set<string>;
  availableNumbers: string[];
  triggerToast: (msg: string) => void;
}

function ClientSite({
  campaign,
  orders,
  setOrders,
  approvedNumbers,
  pendingNumbers,
  availableNumbers,
  triggerToast,
}: ClientSiteProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", cpf: "", whatsapp: "", birthDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [searchCpf, setSearchCpf] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState<string>("");
  const [lastSubmittedOrder, setLastSubmittedOrder] = useState<Order | null>(null);

  const [activeCheckoutPayment, setActiveCheckoutPayment] = useState<{
    orderId: string;
    pixCopiaCola: string;
    qrCodeBase64?: string;
    paymentId?: string;
    expiresAt: number;
    type: "simulator" | "mp_pix";
  } | null>(null);
  const [checkingPaymentStatus, setCheckingPaymentStatus] = useState<boolean>(false);
  const [paymentApprovedAt, setPaymentApprovedAt] = useState<boolean>(false);

  const ticketPrice = Number(campaign.ticketPrice || 0);
  const totalCost = selected.length * ticketPrice;
  const progressPercent = campaign.totalNumbers
    ? Math.round((approvedNumbers.size / campaign.totalNumbers) * 100)
    : 0;

  const myOrders = useMemo(() => {
    const clean = searchCpf.replace(/\D/g, "");
    if (!clean) return [];
    return orders.filter((o) => String(o.cpf || "").replace(/\D/g, "") === clean);
  }, [orders, searchCpf]);

  const toggleNumber = (num: string) => {
    if (approvedNumbers.has(num)) return;
    setSelected((prev) =>
      prev.includes(num) ? prev.filter((item) => item !== num) : [...prev, num]
    );
  };

  const handleSelectBatch = (nums: string[]) => {
    setSelected(nums);
  };

  const handlePixCopy = () => {
    navigator.clipboard.writeText(campaign.pixKey);
    triggerToast("Chave PIX copiada para a área de transferência!");
  };

  const getWhatsAppReceiptLink = (order: Order) => {
    const adminPhone = campaign.whatsappContact || campaign.pixKey || "5591985066711";
    const cleanPhone = adminPhone.replace(/\D/g, "");
    const phone = cleanPhone.length === 11 ? `55${cleanPhone}` : cleanPhone;
    const text = `*ENVIO DE COMPROVANTE - ${campaign.siteName}*\n\n` +
                 `Olá! Acabei de enviar o meu pedido de cotas no site.\n\n` +
                 `*ID do Pedido:* \`${order.id}\`\n` +
                 `*Nome:* ${order.name}\n` +
                 `*Cotas:* ${order.numbers.join(", ")}\n` +
                 `*Valor:* ${money(order.amount)}\n\n` +
                 `Estou enviando o comprovante em anexo para aprovação. Obrigado!`;
    return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(text)}`;
  };

  const handleAutoApproveOrder = async (orderId: string) => {
    try {
      // Optimistically update local state for instant feedback
      const updated = orders.map((o) => {
        if (o.id === orderId) {
          return { ...o, status: "approved" as const, reviewedAt: { seconds: Date.now() / 1000 } };
        }
        return o;
      });
      setOrders(updated);
      localStorage.setItem("whisky_premium_orders", JSON.stringify(updated));

      if (isFirebaseActive && dbInstance) {
        updateDoc(doc(dbInstance, "orders", orderId), {
          status: "approved",
          reviewedAt: serverTimestamp(),
        }).catch(e => {
          console.warn("Firestore update blocked by rules:", e);
          // If updateDoc fails, explain why the server status didn't change (likely rules)
          if (e.message?.includes("permission") || e.code === "permission-denied") {
            alert("AVISO: O pagamento foi detectado, mas o Firebase bloqueou a atualização automática no banco de dados. Por favor, aprove este pedido manualmente no painel ADM usando o comprovante.");
          }
        });
      }
      triggerToast("Pagamento Pix confirmado automaticamente!");
    } catch (err: any) {
      console.error("Erro na confirmação automática:", err);
    }
  };

  useEffect(() => {
    if (!activeCheckoutPayment) return;

    let intervalId: any = null;
    let timeoutId: any = null;

    if (activeCheckoutPayment.type === "simulator") {
      timeoutId = setTimeout(() => {
        handleAutoApproveOrder(activeCheckoutPayment.orderId);
        setPaymentApprovedAt(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }, 7000);
    } else if (activeCheckoutPayment.type === "mp_pix" && activeCheckoutPayment.paymentId) {
      setCheckingPaymentStatus(true);
      // Explicitly check status on mount once to avoid waiting 3s
      const checkStatus = async () => {
        try {
          const res = await fetch(`/api/mercadopago/payment/${activeCheckoutPayment.paymentId}`, {
            headers: {
              "Authorization": `Bearer ${campaign.mpAccessToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.status === "approved") {
              if (intervalId) clearInterval(intervalId);
              handleAutoApproveOrder(activeCheckoutPayment.orderId);
              setPaymentApprovedAt(true);
              setCheckingPaymentStatus(false);
              confetti({
                particleCount: 180,
                spread: 90,
                origin: { y: 0.6 }
              });
              return true;
            }
          }
        } catch (err) {
          console.error("Status check fail:", err);
        }
        return false;
      };

      checkStatus();

      intervalId = setInterval(async () => {
        const approved = await checkStatus();
        if (approved) clearInterval(intervalId);
      }, 3500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeCheckoutPayment]);

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess("");
    setLastSubmittedOrder(null);

    if (!campaign.active) {
      alert("Atenção: Esta campanha está pausada ou finalizada no momento.");
      return;
    }
    if (selected.length === 0) {
      alert("Nenhum número selecionado! Selecione ao menos 1 cota.");
      return;
    }
    if (!form.name || !form.cpf || !form.whatsapp || !form.birthDate) {
      alert("Por favor preencha todos os dados no formulário.");
      return;
    }

    // Age calculation
    const birthday = new Date(form.birthDate);
    const ageDiff = Date.now() - birthday.getTime();
    const ageDate = new Date(ageDiff);
    const age = Math.abs(ageDate.getUTCFullYear() - 1970);

    if (age < 18) {
      alert("Entrada proibida. Participação permitida apenas para maiores de 18 anos.");
      return;
    }

    setSubmitting(true);
    setPaymentApprovedAt(false);
    setActiveCheckoutPayment(null);
    const newOrderId = "ord-" + Date.now();

    try {
      const newOrder: Order = {
        id: newOrderId,
        name: form.name,
        cpf: form.cpf,
        whatsapp: form.whatsapp,
        birthDate: form.birthDate,
        numbers: selected,
        amount: totalCost,
        status: "pending",
        createdAt: isFirebaseActive ? serverTimestamp() : { seconds: Date.now() / 1000 },
      };

      let finalOrderId = newOrderId;

      // Always save locally first for instant feedback, offline search, and resilience
      const updatedLocalOrders = [{ ...newOrder, id: finalOrderId }, ...orders];
      setOrders(updatedLocalOrders);
      localStorage.setItem("whisky_premium_orders", JSON.stringify(updatedLocalOrders));

      if (isFirebaseActive && dbInstance) {
        try {
          // Real Firebase persistence synchronously generated ID
          const docTarget = doc(collection(dbInstance, "orders"));
          finalOrderId = docTarget.id;
          
          setDoc(docTarget, { ...newOrder, id: finalOrderId }).catch(firebaseErr => {
             console.warn("Erro ao persistir pedido no Firestore:", firebaseErr);
             if (firebaseErr.message?.includes("permission") || firebaseErr.code === "permission-denied") {
               alert("ERRO: O Firebase bloqueou a criação do pedido (Permissão Negada). Verifique as Regras de Segurança (Firestore Rules) no seu console Firebase. Por enquanto, o pedido funcionará apenas localmente neste navegador.");
             }
          });
          
          // Keep localstorage in sync with the real document ID
          const updatedWithServerId = [{ ...newOrder, id: finalOrderId }, ...orders];
          setOrders(updatedWithServerId);
          localStorage.setItem("whisky_premium_orders", JSON.stringify(updatedWithServerId));
        } catch (firebaseErr: any) {
          console.warn("Sync error setup:", firebaseErr);
        }
      }

      if (campaign.pixType === "mp_pix") {
        try {
          const bodyPayload = {
            transaction_amount: Number(totalCost),
            payment_method_id: "pix",
            payer: {
              email: `${form.cpf.replace(/\D/g, "")}@whiskypremium.com.br`,
              first_name: form.name.split(" ")[0] || "Comprador",
              last_name: form.name.split(" ").slice(1).join(" ") || "Privado",
              identification: {
                type: "CPF",
                number: form.cpf.replace(/\D/g, "")
              }
            },
            description: `Reserva - ${campaign.siteName}`
          };

          const mpRes = await fetch("/api/mercadopago/payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              token: campaign.mpAccessToken,
              body: bodyPayload
            })
          });

          if (!mpRes.ok) {
            const errData = await mpRes.json();
            throw new Error(errData.message || "Erro retornado pelo Mercado Pago. Verifique as credenciais.");
          }

          const mpData = await mpRes.json();
          const paymentId = String(mpData.id);
          const qrCodeString = mpData.point_of_interaction?.transaction_data?.qr_code || "";
          const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || "";

          if (!qrCodeString) {
            throw new Error("Não foi possível carregar o código Copia e Cola do Mercado Pago.");
          }

          setActiveCheckoutPayment({
            orderId: finalOrderId,
            pixCopiaCola: qrCodeString,
            qrCodeBase64: qrCodeBase64,
            paymentId: paymentId,
            expiresAt: Date.now() + 10 * 60 * 1000,
            type: "mp_pix"
          });
        } catch (mpErr: any) {
          console.error("Erro MP API:", mpErr);
          setLoadingCheckout(false);
          alert(`Falha na comunicação com o Mercado Pago: ${mpErr.message}\n\nPara o administrador: Caso o erro seja 'Unauthorized use of live credentials', significa que a sua conta do Mercado Pago ainda não está aprovada para Produção. Vá ao painel do Mercado Pago Developers, selecione sua aplicação e preencha o formulário 'Ir para Produção', ou utilize uma Credencial de Teste (TEST-...) enquanto o sistema não for publicado.`);
          // Remove the order from local state since it failed
          setOrders(prev => prev.filter(o => o.id !== finalOrderId));
          return;
        }
      } else {
        // Simulator
        setActiveCheckoutPayment({
          orderId: finalOrderId,
          pixCopiaCola: `00020101021226830014br.gov.bcb.pix2561whiskypremium.com.br/pix/sim-${finalOrderId}`,
          expiresAt: Date.now() + 10 * 60 * 1000,
          type: "simulator"
        });
      }

      setSubmitSuccess("Seu código de pagamento PIX automático foi gerado com sucesso!");
      setLastSubmittedOrder({ ...newOrder, id: finalOrderId });
      setSelected([]);
      setForm({ name: "", cpf: "", whatsapp: "", birthDate: "" });
      triggerToast("Pedido gerado com sucesso!");
    } catch (err: any) {
      alert("Ocorreu um erro ao enviar o pedido: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      
      {/* Client main grid panel */}
      <div className="space-y-6">
        
        {/* Hero visual header containing generated images */}
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-black/10 backdrop-blur-sm shadow-2xl">
          
          {/* Main Visual Banner */}
          <div className="relative h-60 md:h-[320px] w-full overflow-hidden flex items-center justify-center">
            <img
              src={campaign.bannerImageUrl || whiskyBannerAsset}
              alt="Macallan Premium Scotch Whiskey Luxury Shot"
              className="w-full h-full object-cover select-none"
              referrerPolicy="no-referrer"
            />
            {/* Dark vignette blending */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-black/35" />
            <div className="absolute bottom-5 left-5 right-5 space-y-1 md:space-y-2 text-left">
              <span className="bg-amber-500/25 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">
                CAMPANHA PRINCIPAL VIP
              </span>
              <h2 className="font-serif text-2xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] leading-tight">
                {campaign.prizeName}
              </h2>
            </div>
          </div>

          {/* Sorteio Specifications dashboard */}
          <div className="grid gap-4 p-5 md:p-6 sm:grid-cols-3 bg-black/10 backdrop-blur-sm border-t border-white/10">
            <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Valor do Bilhete</span>
              <p className="text-xl font-bold text-amber-500 font-mono">{money(ticketPrice)}</p>
            </div>
            <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Disponibilidade</span>
              <p className="text-xl font-bold text-white font-mono">
                {availableNumbers.length} <span className="text-xs text-zinc-500 font-semibold uppercase">Restantes</span>
              </p>
            </div>
            <div className="p-3 bg-zinc-900/40 border border-zinc-900 rounded-xl space-y-1">
              <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">Tipo de Determinação</span>
              <p className="text-xs font-semibold text-zinc-300 line-clamp-2 leading-relaxed">
                {campaign.drawDate ? `Data: ${campaign.drawDate}` : campaign.drawMode}
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="px-5 pb-5 md:px-6 md:pb-6 space-y-2">
            <div className="flex justify-between items-center text-xs text-zinc-400">
              <span className="font-mono">Progresso das reservas confirmadas:</span>
              <span className="font-black text-amber-400 font-mono">{progressPercent}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-zinc-900 border border-zinc-800 p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Cota Selector Container */}
        <div className="rounded-3xl border border-white/10 bg-black/10 backdrop-blur-sm p-5 md:p-6 shadow-xl">
          <NumberedGrid
            totalNumbers={campaign.totalNumbers}
            approvedNumbers={approvedNumbers}
            pendingNumbers={pendingNumbers}
            selected={selected}
            onToggle={toggleNumber}
            onSelectBatch={handleSelectBatch}
          />
        </div>

        {/* Prize description + second generated Image */}
        <div className="rounded-3xl border border-white/10 bg-black/10 backdrop-blur-sm p-5 md:p-6 space-y-5">
          <h4 className="font-serif text-lg font-bold text-amber-100 flex items-center gap-1.5 uppercase tracking-wide">
            <Info size={18} className="text-amber-500" />
            Especificações do Prêmio Premium
          </h4>

          <div className="grid gap-6 md:grid-cols-[0.4fr_0.6fr] items-center">
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 relative aspect-square w-full max-w-44 mx-auto md:max-w-none">
              <img
                src={campaign.secondaryImageUrl || whiskyChestAsset}
                alt="Macallan Premium collectors chest packaging"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 to-transparent" />
            </div>
            <div className="space-y-3">
              <p className="text-sm text-zinc-300 leading-relaxed font-sans mt-1">
                {campaign.prizeDescription}
              </p>
              <div className="rounded-xl bg-zinc-900/50 border border-zinc-900 p-3 flex items-center gap-3">
                <ShieldCheck className="text-amber-500 shrink-0" size={18} />
                <span className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider font-extrabold leading-tight">
                  Autenticidade assegurada por selo do importador oficial
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Client transaction / query side panels */}
      <div className="space-y-6">
        
        {/* PIX Checkout processing panel */}
        <div className="rounded-3xl border border-white/10 bg-black/10 backdrop-blur-sm p-5 md:p-6 shadow-xl space-y-5 relative">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400 rounded-t-3xl" />
          
          <div>
            <h3 className="font-serif text-xl font-bold text-zinc-100">Finalizar Reserva</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Realize a transferência e envie os dados cadastrais.</p>
          </div>

          {/* Pix copy section */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
            <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Chave do Pix Destinatária (Celular)</span>
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-mono font-black text-amber-300 text-sm select-all tracking-wide">{campaign.pixKey}</p>
              <button
                type="button"
                onClick={handlePixCopy}
                className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center justify-center transition hover:scale-105 active:scale-95 shrink-0"
                title="Copiar Chave PIX"
              >
                <Copy size={14} />
              </button>
            </div>
            <div className="pt-2 border-t border-zinc-800/60 text-xs text-zinc-400 mt-1">
              Beneficiário: <strong className="text-zinc-200">{campaign.pixHolder}</strong>
            </div>
          </div>

          {/* Current Selection summary */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-900 flex justify-between items-center text-sm">
            <div>
              <p className="text-xs text-zinc-500 font-bold uppercase font-mono">Resumo selecionado</p>
              <p className="font-mono mt-1 text-zinc-200">
                {selected.length ? `${selected.length} cotas: ${selected.slice(0, 5).join(", ")}${selected.length > 5 ? "..." : ""}` : "Nenhuma selecionada"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 font-bold uppercase font-mono">Subtotal</p>
              <p className="text-lg font-black text-amber-400 font-mono mt-0.5">{money(totalCost)}</p>
            </div>
          </div>

          {/* Participant Form */}
          <form onSubmit={handleSubmitOrder} className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Nome de Titularidade (Físico)</label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva Santos"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-850 py-3 px-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 transition"
              />
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">CPF do Comprador</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-855 py-3 px-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 transition font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Whatsapp (Contato)</label>
                <input
                  type="text"
                  required
                  placeholder="(00) 00000-0000"
                  value={form.whatsapp}
                  onChange={(e) => setForm({ ...form, whatsapp: formatWhatsApp(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-860 py-3 px-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 transition font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Data de Nascimento (Maioridade Check)</label>
              <input
                type="date"
                required
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-865 py-3 px-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 transition font-mono"
              />
            </div>

            <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4.5 space-y-2 text-left animate-fade-in font-sans">
              <div className="flex items-center gap-2 text-amber-500">
                <Sparkles size={16} className="animate-pulse" />
                <span className="text-xs font-serif font-black uppercase tracking-wider">⚡ Baixa Automática de Cotas</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                Ao prosseguir, nosso sistema gerará um QR Code e código Copia e Cola dinâmico do Pix. Transfira pelo seu banco e seus números serão confirmados instantaneamente! Não é necessário tirar foto ou enviar o comprovante.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting || selected.length === 0}
              className="w-full py-4 px-5 rounded-2xl bg-amber-500 text-zinc-950 hover:bg-amber-400 font-extrabold text-xs uppercase tracking-wider active:scale-98 transition duration-200 flex items-center justify-center gap-2 glow-btn disabled:opacity-40 disabled:pointer-events-none select-none mt-4 cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-950 border-t-transparent animate-spin" />
                  Gerando Pix de Pagamento...
                </>
              ) : (
                `Gerar Pix Copia e Cola - ${money(totalCost)}`
              )}
            </button>
          </form>

          {submitSuccess && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-5 space-y-4 text-left animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <h4 className="font-serif font-black text-xs text-emerald-300 uppercase tracking-widest">Reserva Efetuada!</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {submitSuccess}
                  </p>
                </div>
              </div>

              {lastSubmittedOrder && (
                <div className="pt-3 border-t border-emerald-950/60 space-y-3">
                  <div className="p-3 rounded-xl bg-zinc-90 w-full bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 space-y-1 font-mono">
                    <p><span className="text-zinc-500 font-sans font-semibold">Nome:</span> {lastSubmittedOrder.name}</p>
                    <p><span className="text-zinc-500 font-sans font-semibold">Cotas:</span> {lastSubmittedOrder.numbers.join(", ")}</p>
                    <p><span className="text-zinc-500 font-sans font-semibold">Total:</span> {money(lastSubmittedOrder.amount)}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Query orders panel */}
        <div className="rounded-3xl border border-white/10 bg-black/10 backdrop-blur-sm p-5 md:p-6 shadow-xl space-y-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-zinc-100 flex items-center gap-1">
              <Search className="text-amber-500" size={18} />
              Minhas Cotas Reservadas
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">Consulte o status do seu bilhete informando o CPF.</p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Digite seu CPF cadastrado"
              value={searchCpf}
              onChange={(e) => setSearchCpf(formatCPF(e.target.value))}
              className="grow rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 transition font-mono"
            />
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {myOrders.map((order) => (
              <div
                key={order.id}
                className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/10 text-xs flex flex-col items-start gap-2 animate-fade-in"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold text-[10px] uppercase font-mono text-zinc-500">
                    ID: {order.id.slice(0, 10)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      order.status === "approved"
                        ? "bg-green-500/10 text-green-400 border border-green-500/10"
                        : order.status === "rejected"
                        ? "bg-red-500/10 text-red-400 border border-red-500/10"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/10 animate-pulse"
                    }`}
                  >
                    {order.status === "approved"
                      ? "Aprovado"
                      : order.status === "rejected"
                      ? "Cancelado"
                      : "Aguardando Pagamento"}
                  </span>
                </div>

                <div className="space-y-1 text-zinc-300 w-full">
                  <p>
                    Comprador: <strong className="text-zinc-100">{order.name}</strong>
                  </p>
                  <p>
                    Cotas:{" "}
                    <strong className="text-amber-400 font-mono text-xs">
                      {(order.numbers || []).join(", ")}
                    </strong>
                  </p>
                  <p>
                    Valor total pago:{" "}
                    <strong className="text-zinc-100 font-mono">{money(order.amount)}</strong>
                  </p>
                </div>
              </div>
            ))}

            {searchCpf && myOrders.length === 0 && (
              <div className="p-4 text-center text-zinc-600 text-xs border border-dashed border-zinc-900 rounded-xl">
                Nenhuma cota encontrada para este CPF.
              </div>
            )}
          </div>
        </div>

        {/* WhatsApp Group & Support Community Panel */}
        <div className="rounded-3xl border border-white/10 bg-black/10 backdrop-blur-sm p-5 md:p-6 shadow-xl space-y-4 text-left">
          <div className="space-y-1">
            <h4 className="font-serif text-base font-bold text-zinc-100 flex items-center gap-1.5 uppercase tracking-wide">
              <MessageCircle className="text-emerald-500" size={18} />
              Suporte & Grupo Vip
            </h4>
            <p className="text-xs text-zinc-500">Entre no canal oficial ou contate o administrador se preferir.</p>
          </div>

          <div className="grid gap-2.5">
            {campaign.whatsappGroupUrl && (
              <a
                href={campaign.whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-400 text-xs font-bold transition flex items-center justify-center gap-2 select-none"
              >
                <MessageCircle size={14} className="animate-pulse" />
                Entrar no Grupo de Sorteios
              </a>
            )}
            
            <a
              href={`https://api.whatsapp.com/send?phone=${(campaign.whatsappContact || "5591985066711").replace(/\D/g, "")}&text=${encodeURIComponent(`Olá! Estou acessando o site ${campaign.siteName} e gostaria de tirar uma dúvida ou enviar meu comprovante Pix.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 text-xs font-bold transition flex items-center justify-center gap-2 select-none"
            >
              Falar com o Suporte / Enviar Comprovante
            </a>
          </div>
        </div>

        {/* Rules container */}
        <div className="rounded-3xl border border-amber-500/10 bg-amber-950/5 p-5 md:p-6 text-xs text-amber-200/80 leading-relaxed text-left space-y-2">
          <p className="font-serif font-black text-amber-500 uppercase tracking-widest text-xs">Termos & Organização</p>
          <p className="whitespace-pre-wrap leading-relaxed">{campaign.rules}</p>
        </div>
      </div>

      {/* Dynamic Pix Checkout Overlay (Baixa Automática) */}
      <AnimatePresence>
        {activeCheckoutPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl text-center space-y-5"
            >
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-400" />
              
              {!paymentApprovedAt ? (
                <>
                  <div className="space-y-1">
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase inline-block">
                      ⚡ Pagamento Automático
                    </span>
                    <h3 className="font-serif text-xl font-bold text-zinc-100">
                      {activeCheckoutPayment.type === "simulator" ? "Simulador de Pix Ativo" : "Código Pix Gerado"}
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Transfira o valor exato para confirmar e liberar suas cotas na hora!
                    </p>
                  </div>

                  {/* QR Code section */}
                  <div className="relative p-6 rounded-2xl bg-zinc-900/40 border border-zinc-900 inline-block mx-auto min-w-[200px] text-center">
                    {activeCheckoutPayment.qrCodeBase64 ? (
                      <img
                        src={`data:image/jpeg;base64,${activeCheckoutPayment.qrCodeBase64}`}
                        alt="QR Code Pix"
                        className="w-44 h-44 mx-auto rounded-lg bg-white p-1.5 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                    ) : activeCheckoutPayment.pixCopiaCola ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(activeCheckoutPayment.pixCopiaCola)}`}
                        alt="QR Code Pix"
                        className="w-44 h-44 mx-auto rounded-lg bg-white p-1.5 shadow-md"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-44 h-44 mx-auto rounded-lg w-full bg-zinc-900 flex items-center justify-center border border-zinc-800 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/10 to-transparent animate-[pulse_2s_infinite] pointer-events-none" />
                        <div className="absolute left-0 right-0 h-0.5 bg-amber-500/30 animate-[bounce_3s_infinite]" style={{ top: '50%' }} />
                        <QrCode size={48} className="text-zinc-500 animate-pulse" />
                      </div>
                    )}
                    
                    <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-zinc-450 text-zinc-400">
                      <Clock3 className="animate-spin text-amber-550 text-amber-500" size={12} />
                      <span>Aguardando transferência...</span>
                    </div>
                  </div>

                  {/* Price & numbers info */}
                  <div className="grid grid-cols-2 p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 text-left text-xs font-mono">
                    <div className="border-r border-zinc-800 pr-3">
                      <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">Total a Pagar</span>
                      <strong className="text-sm text-amber-500">{money(lastSubmittedOrder ? lastSubmittedOrder.amount : totalCost)}</strong>
                    </div>
                    <div className="pl-3">
                      <span className="text-[10px] text-zinc-500 uppercase block font-sans font-bold">Cotas Selecionadas</span>
                      <strong className="text-zinc-200 block truncate">{lastSubmittedOrder?.numbers.join(", ") || selected.join(", ")}</strong>
                    </div>
                  </div>

                  {/* Pix copy section inside modal */}
                  <div className="space-y-1.5 text-left">
                    <span className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block font-sans">Pix Copia e Cola</span>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-950 border border-zinc-850">
                      <p className="truncate font-mono text-zinc-300 text-xs grow select-all">{activeCheckoutPayment.pixCopiaCola}</p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeCheckoutPayment.pixCopiaCola);
                          triggerToast("Código Copia e Cola copiado!");
                        }}
                        className="p-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[10px] font-bold uppercase tracking-wider transition shrink-0"
                      >
                        Copiar
                      </button>
                    </div>
                  </div>

                  {/* Simulator option helper */}
                  {activeCheckoutPayment.type === "simulator" && (
                    <button
                      type="button"
                      onClick={() => {
                        handleAutoApproveOrder(activeCheckoutPayment.orderId);
                        setPaymentApprovedAt(true);
                        confetti({
                          particleCount: 150,
                          spread: 80,
                          origin: { y: 0.6 }
                        });
                      }}
                      className="w-full py-2.5 px-3 rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-wider transition"
                    >
                      💡 Confirmar Pagamento de Teste (Simulador)
                    </button>
                  )}

                  <p className="text-[10px] text-zinc-500 text-left leading-relaxed">
                    Instruções: Abra o aplicativo de pagamentos do seu Banco, escolha a opção "Pagar via Pix QR Code" ou "Copia e Cola" e escaneie ou cole o código acima. O site atualizará de tela automaticamente assim que o pagamento for registrado.
                  </p>
                </>
              ) : (
                <div className="space-y-6 pt-4 text-center">
                  <div className="relative inline-block mx-auto">
                    <div className="absolute -inset-1 rounded-full bg-emerald-500/10 blur-md animate-pulse" />
                    <CheckCircle2 size={64} className="text-emerald-400 relative animate-bounce mx-auto" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl font-black text-emerald-400 tracking-wide uppercase">
                      Pagamento Aprovado!
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed max-w-sm mx-auto">
                      Parabéns! Sua compra foi identificada com sucesso por nosso sistema automático. Seus bilhetes já estão confirmados e garantidos!
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block font-bold mb-1">Seus Bilhetes Ativos</span>
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1.5">
                      {lastSubmittedOrder?.numbers.map((n) => (
                        <span key={n} className="inline-block py-1 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 font-mono text-xs font-bold leading-none animate-pulse">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    {campaign.whatsappGroupUrl && (
                      <a
                        href={campaign.whatsappGroupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center gap-2 select-none"
                      >
                        <MessageCircle size={15} /> Entrar no Grupo Oficial Vip
                      </a>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => {
                        setActiveCheckoutPayment(null);
                        setPaymentApprovedAt(false);
                      }}
                      className="w-full py-3 px-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 text-zinc-300 font-extrabold text-xs uppercase tracking-wider transition select-none"
                    >
                      Fechar e Voltar ao Início
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// ADMIN WORKSPACE / SYSTEM CONTROL PANEL
// ==========================================
interface AdminPanelProps {
  campaign: Campaign;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  adminUser: FirebaseUser | null;
  setAdminUser: React.Dispatch<any>;
  isFirebaseActive: boolean;
  triggerToast: (msg: string) => void;
}

function AdminPanel({
  campaign,
  setCampaign,
  orders,
  setOrders,
  adminUser,
  setAdminUser,
  isFirebaseActive,
  triggerToast,
}: AdminPanelProps) {
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [showRaffleGlobus, setShowRaffleGlobus] = useState<boolean>(false);
  const [zoomedReceipt, setZoomedReceipt] = useState<{ url: string; orderName: string } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return filter === "all" ? orders : orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  // Handle real admin authorization strictly via Firebase
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!authInstance) {
      setLoginError("Serviço de autenticação Firebase não disponível ou inativo. Verifique as configurações.");
      return;
    }
    try {
      await signInWithEmailAndPassword(authInstance, loginForm.email, loginForm.password);
      triggerToast("Sessão autenticada via Firebase!");
    } catch (err: any) {
      setLoginError(err.message || String(err));
    }
  };

  const handleLogout = async () => {
    if (!authInstance) {
      setAdminUser(null);
      return;
    }
    try {
      await signOut(authInstance);
      setAdminUser(null);
      triggerToast("Sessão finalizada!");
    } catch (err: any) {
      alert("Erro ao realizar logout: " + err.message);
    }
  };

  const handleSaveCampaign = async () => {
    setSavingCampaign(true);
    try {
      const updatedCampaign = {
        ...campaign,
        ticketPrice: Number(campaign.ticketPrice),
        totalNumbers: Number(campaign.totalNumbers),
        updatedAt: Date.now(), // Unique increment timestamp for offline-first replication safety
      };

      // Always save to localStorage and React state first for zero-latency, offline-first reliability
      localStorage.setItem("whisky_premium_settings", JSON.stringify(updatedCampaign));
      setCampaign(updatedCampaign);

      if (isFirebaseActive && dbInstance) {
        try {
          setDoc(doc(dbInstance, "settings", "campaign"), updatedCampaign)
            .then(() => triggerToast("Salvo online com sucesso!"))
            .catch(fbErr => {
               console.warn("Erro ao sincronizar com Firestore (Salvo apenas localmente no seu navegador):", fbErr);
               alert("ATENÇÃO: O Firebase bloqueou o envio para o banco de dados (provavelmente devido às Regras de Segurança). Os dados foram salvos APENAS no seu navegador e não ficarão visíveis para os clientes.");
            });
        } catch (fbErr: any) {
          console.warn("Erro logic com Firestore :", fbErr);
        }
      }
      triggerToast("Configurações da campanha salvas com sucesso!");
    } catch (err: any) {
      alert("Erro ao gravar dados: " + err.message);
    } finally {
      setSavingCampaign(false);
    }
  };

  const handleChangeOrderStatus = async (orderId: string, status: "approved" | "rejected" | "pending") => {
    try {
      // Always update local React state and local storage instantly for instant feedback & offline sync
      const updated = orders.map((o) => {
        if (o.id === orderId) {
          return { ...o, status, reviewedAt: { seconds: Date.now() / 1000 } };
        }
        return o;
      });
      setOrders(updated);
      localStorage.setItem("whisky_premium_orders", JSON.stringify(updated));

      if (isFirebaseActive && dbInstance) {
        try {
          updateDoc(doc(dbInstance, "orders", orderId), {
            status,
            reviewedAt: serverTimestamp(),
          }).catch(fbErr => {
             console.warn("Erro ao salvar status no Firestore (atualizado apenas localmente):", fbErr);
          });
        } catch (fbErr) {
          console.warn("Update setup err:", fbErr);
        }
      }
      triggerToast(`Status do pedido atualizado para ${status === "approved" ? "Aprovado" : "Cancelado"}!`);
    } catch (err: any) {
      alert("Erro ao atualizar status: " + err.message);
    }
  };

  const handlePurgeTestOrders = () => {
    setOrders([]);
    localStorage.setItem("whisky_premium_orders", JSON.stringify([]));
    triggerToast("Banco de dados de testes locais resetado!");
  };

  // Login Gate
  if (!adminUser) {
    const isConfigError = loginError && (
      loginError.includes("auth/configuration-not-found") ||
      loginError.includes("configuration-not-found")
    );

    return (
      <div className="mx-auto flex max-w-md flex-col gap-4 py-8 md:py-16">
        <div className="w-full rounded-3xl border border-zinc-900 bg-zinc-950 p-6 md:p-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-600 to-amber-400 rounded-t-3xl" />
          
          <div className="text-center space-y-4 mb-6">
            <div className="mx-auto w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-550 border border-amber-500/20">
              <Lock size={22} />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-black text-white">Lounge Administrativo</h2>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                Insira suas credenciais cadastradas no console do Firebase Authentication.
              </p>
            </div>
          </div>

          {loginError && (
            <div className="mb-5 p-4 rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-3.5 text-left text-xs text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="shrink-0 text-rose-500 mt-0.5" size={16} />
                <div className="space-y-1">
                  <h4 className="font-serif font-black uppercase text-[10px] tracking-wider text-rose-400">Falha ao Autenticar</h4>
                  <p className="leading-relaxed text-[11px] text-zinc-300">{loginError}</p>
                </div>
              </div>

              {isConfigError && (
                <div className="pt-3 border-t border-rose-950/50 space-y-3 text-[10.5px] leading-relaxed text-zinc-350 font-medium">
                  <p className="font-semibold text-rose-350 flex items-center gap-1.5 font-serif uppercase tracking-wider text-[9.5px]">
                    <Sparkles size={11} className="text-amber-500" /> Como resolver este erro no console:
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 pl-1 text-zinc-400 select-all leading-normal">
                    <li>Acesse o <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-450 text-amber-500 font-bold hover:underline inline-flex items-center gap-0.5">Console do Firebase <ExternalLink size={10} /></a>.</li>
                    <li>No menu esquerdo, vá em <strong className="text-zinc-300">Autenticação</strong> (Authentication).</li>
                    <li>Clique na aba <strong className="text-zinc-300">Sign-in method</strong> (Método de login).</li>
                    <li>Clique em <strong className="text-zinc-300">Adicionar novo provedor</strong> (Add new provider).</li>
                    <li>Selecione <strong className="text-zinc-300">E-mail/Senha</strong> (Email/Password), ative a primeira chave de autenticação e clique em <strong className="text-zinc-305">Salvar</strong>.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">E-mail Administrativo</label>
              <input
                type="email"
                required
                placeholder="Ex: admin@seusite.com"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3 px-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/85 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Senha Segura</label>
              <input
                type="password"
                required
                placeholder="Sua senha de administrador"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3 px-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/85 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 px-5 rounded-2xl bg-amber-500 text-zinc-950 hover:bg-amber-400 font-extrabold text-xs uppercase tracking-wider active:scale-98 transition duration-200 shadow-md flex items-center justify-center cursor-pointer"
            >
              Autenticar Painel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Bento Grid Analytics */}
      <AdminStats
        orders={orders}
        campaign={campaign}
        onPurgeLocalStorage={handlePurgeTestOrders}
      />

      {/* Drawing Launch controller */}
      <div className="p-5 md:p-6 rounded-3xl border border-amber-500/15 bg-gradient-to-br from-zinc-950 to-amber-950/15 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-serif text-lg font-bold text-amber-100 uppercase tracking-wide flex items-center gap-1.5">
            <Trophy className="text-amber-500 hover:rotate-12 transition duration-300" size={18} />
            Sorteador Eletrônico Ativo
          </h4>
          <p className="text-xs text-zinc-400">
            Abra a roleta interativa inspirada em cassinos de Las Vegas para sortear o ganhador oficial entre as cotas faturadas.
          </p>
        </div>
        <button
          onClick={() => setShowRaffleGlobus(true)}
          className="px-6 py-3.5 text-xs font-extrabold rounded-2xl bg-amber-500 text-zinc-950 hover:bg-amber-400 active:scale-95 transition flex items-center gap-2 select-none shrink-0"
        >
          <Sparkles size={14} /> Abrir Globo de Sorteios
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        
        {/* Left pane: edit campaign form */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 md:p-6 space-y-5 shadow-xl relative">
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-amber-600 to-amber-500 rounded-t-3xl" />
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-zinc-100">Campanha Editorial</h3>
              <p className="text-xs text-zinc-500">Edite os prêmios, limites e formas de pagamento.</p>
            </div>
            <Settings className="text-amber-500" size={20} />
          </div>

          <div className="space-y-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Nome Fantasia do Site</label>
              <input
                type="text"
                placeholder="Título do Site"
                value={campaign.siteName}
                onChange={(e) => setCampaign({ ...campaign, siteName: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Nome Oficial do Prêmio</label>
              <input
                type="text"
                placeholder="Produto sorteado"
                value={campaign.prizeName}
                onChange={(e) => setCampaign({ ...campaign, prizeName: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">URL da Imagem do Banner (Principal)</label>
              <input
                type="text"
                placeholder="https://exemplo.com/banner.png"
                value={campaign.bannerImageUrl || ""}
                onChange={(e) => setCampaign({ ...campaign, bannerImageUrl: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">URL da Imagem Secundária (Caixa/Detalhe)</label>
              <input
                type="text"
                placeholder="https://exemplo.com/caixa.png"
                value={campaign.secondaryImageUrl || ""}
                onChange={(e) => setCampaign({ ...campaign, secondaryImageUrl: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Detalhes de Autenticação / Descrição</label>
              <textarea
                placeholder="Volume, raridade, especificações..."
                rows={4}
                value={campaign.prizeDescription}
                onChange={(e) => setCampaign({ ...campaign, prizeDescription: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition resize-none leading-relaxed"
              />
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400">Valor Unitário da Cota</label>
                <input
                  type="number"
                  placeholder="Preço R$"
                  value={campaign.ticketPrice}
                  onChange={(e) => setCampaign({ ...campaign, ticketPrice: Number(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 font-sans">Quantidade Total</label>
                <input
                  type="number"
                  placeholder="Números"
                  value={campaign.totalNumbers}
                  onChange={(e) => setCampaign({ ...campaign, totalNumbers: Number(e.target.value) })}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Chave PIX Cadastrada</label>
              <input
                type="text"
                placeholder="Chave Celular/CPF..."
                value={campaign.pixKey}
                onChange={(e) => setCampaign({ ...campaign, pixKey: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Titular do Recebimento</label>
              <input
                type="text"
                placeholder="Nome Titular"
                value={campaign.pixHolder}
                onChange={(e) => setCampaign({ ...campaign, pixHolder: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition"
              />
            </div>

            <div className="space-y-2.5 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
              <label className="text-xs font-serif font-black text-amber-500 uppercase tracking-widest block">Método de Baixa/Confirmação Pix</label>
              
              <div className="grid gap-2 grid-cols-2">
                <button
                  type="button"
                  onClick={() => setCampaign({ ...campaign, pixType: "simulator" })}
                  className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition ${
                    (!campaign.pixType || campaign.pixType === "simulator" || campaign.pixType === "manual")
                      ? "bg-amber-500/10 border-amber-500 text-amber-500"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"
                  }`}
                >
                  Simulador
                </button>
                <button
                  type="button"
                  onClick={() => setCampaign({ ...campaign, pixType: "mp_pix" })}
                  className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider text-center border transition ${
                    campaign.pixType === "mp_pix"
                      ? "bg-amber-500/10 border-amber-500 text-amber-500"
                      : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white"
                  }`}
                >
                  Mercado Pago
                </button>
              </div>

              {campaign.pixType === "mp_pix" && (
                <div className="pt-2.5 space-y-1.5 border-t border-zinc-800/80 animate-fade-in text-left">
                  <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-widest block">Mercado Pago Access Token</span>
                  <input
                    type="password"
                    placeholder="Ex: APP_USR-XXXXXXXXXXXXXXXX"
                    value={campaign.mpAccessToken || ""}
                    onChange={(e) => setCampaign({ ...campaign, mpAccessToken: e.target.value })}
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-850 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition font-mono"
                  />
                  <p className="text-[9px] text-zinc-500 leading-relaxed font-sans font-medium">
                    Insira o token de produção do Mercado Pago. Ele é usado client-side de forma segura para criar as cobranças Pix dinâmicas no seu checkout.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Link do Grupo do WhatsApp (Opcional)</label>
              <input
                type="url"
                placeholder="Ex e original: https://chat.whatsapp.com/GgGvOnfIasvEnT90pLaSeX"
                value={campaign.whatsappGroupUrl || ""}
                onChange={(e) => setCampaign({ ...campaign, whatsappGroupUrl: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">WhatsApp Oficial de Suporte / Envio de Comprovantes (Apenas números com DDD)</label>
              <input
                type="text"
                placeholder="Ex: 91985066711"
                value={campaign.whatsappContact || ""}
                onChange={(e) => setCampaign({ ...campaign, whatsappContact: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400">Termos Legais & Regulamento de Sorteios</label>
              <textarea
                placeholder="Inserir regras gerais de transporte, entrega, restrições..."
                rows={3}
                value={campaign.rules}
                onChange={(e) => setCampaign({ ...campaign, rules: e.target.value })}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-amber-500/80 transition resize-none leading-relaxed"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer py-1 text-zinc-300">
              <input
                type="checkbox"
                checked={campaign.active}
                onChange={(e) => setCampaign({ ...campaign, active: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-amber-500 focus:ring-0 cursor-pointer"
              />
              Manter campanha pública e ativa para recebimento de novas inscrições
            </label>

            <button
              onClick={handleSaveCampaign}
              disabled={savingCampaign}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black uppercase tracking-wider active:scale-98 transition flex items-center justify-center"
            >
              {savingCampaign ? "Salvando..." : "Gravar Atualizações"}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl border border-zinc-800 bg-transparent text-zinc-400 hover:text-red-400 hover:border-red-900/40 text-xs font-bold transition flex items-center justify-center gap-1"
          >
            <LogOut size={14} /> Encerrar Sessão Administrativa
          </button>
        </div>

        {/* Right pane: orders queue checking */}
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 md:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-900 pb-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-zinc-100">Fila de Conferência Pix</h3>
              <p className="text-xs text-zinc-500">Confronte o extrato bancário com os bilhetes preenchidos.</p>
            </div>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-900 text-xs py-2 px-3 text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">Filtro: Todos ({orders.length})</option>
              <option value="pending">Apenas Pendentes ({orders.filter((o) => o.status === "pending").length})</option>
              <option value="approved">Apenas Aprovados ({orders.filter((o) => o.status === "approved").length})</option>
              <option value="rejected">Apenas Cancelados ({orders.filter((o) => o.status === "rejected").length})</option>
            </select>
          </div>

          <div className="space-y-4 max-h-[660px] overflow-y-auto pr-2">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="p-4 rounded-2xl border border-zinc-900 bg-zinc-900/10 space-y-3 flex flex-col justify-between"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between pb-3 border-b border-zinc-900">
                  <div className="space-y-1.5 text-left">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        order.status === "approved"
                          ? "bg-green-500/10 text-green-400 border border-green-500/10"
                          : order.status === "rejected"
                          ? "bg-red-500/10 text-red-500 border border-red-500/10"
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/10 animate-pulse"
                      }`}
                    >
                      {order.status === "approved"
                        ? "Aprovado"
                        : order.status === "rejected"
                        ? "Cancelado"
                        : "Pendente"}
                    </span>
                    <h4 className="text-base font-black text-white">{order.name}</h4>
                    <p className="text-xs text-zinc-400 flex flex-wrap gap-x-3 gap-y-1 font-mono">
                      <span>CPF: {order.cpf}</span>
                      <span>Whats: {order.whatsapp}</span>
                    </p>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="text-[10px] text-zinc-500 font-mono font-bold block uppercase">Subtotal Pix</span>
                    <span className="text-base font-black text-amber-400 font-mono leading-tight">{money(order.amount)}</span>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono font-bold uppercase block text-left">Números Comprados</span>
                    <p className="text-sm font-black text-purple-300 font-mono text-left">{(order.numbers || []).join(", ")}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {order.receiptUrl && (
                      <button
                        type="button"
                        onClick={() => setZoomedReceipt({ url: order.receiptUrl || "", orderName: order.name })}
                        className="py-1.5 px-3 rounded-lg border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
                      >
                        <Search size={12} /> Ver Recibo
                      </button>
                    )}
                    
                    {order.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleChangeOrderStatus(order.id, "approved")}
                          className="py-1.5 px-3 rounded-lg bg-green-600 hover:bg-green-500 text-white text-[11px] font-bold transition"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleChangeOrderStatus(order.id, "rejected")}
                          className="py-1.5 px-3 rounded-lg border border-red-900/50 text-red-400 hover:bg-red-950/20 text-[11px] font-bold transition"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {order.status !== "pending" && (
                      <button
                        onClick={() => handleChangeOrderStatus(order.id, "pending")}
                        className="py-1.5 px-2 rounded-lg border border-zinc-800 text-zinc-500 hover:text-zinc-400 text-[10px] font-semibold transition"
                        title="Reverter para pendente para reconfigurar"
                      >
                        Reverter Status
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredOrders.length === 0 && (
              <div className="p-12 text-center text-zinc-600 border border-dashed border-zinc-900 rounded-3xl space-y-2">
                <Inbox size={28} className="mx-auto text-zinc-700" />
                <p className="text-sm">Nenhuma comissão de Pix filtrada na fila.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive spinning Raffle Draw globu */}
      {showRaffleGlobus && (
        <Sorteador orders={orders} onClose={() => setShowRaffleGlobus(false)} />
      )}

      {/* Receipt zooming modal */}
      {zoomedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950 text-white p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-900 mb-4">
              <h4 className="text-sm font-bold truncate">Recibo de {zoomedReceipt.orderName}</h4>
              <button
                type="button"
                onClick={() => setZoomedReceipt(null)}
                className="text-xs text-zinc-400 hover:text-white font-black"
              >
                Fechar
              </button>
            </div>
            
            <div className="aspect-[3/4] rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden relative flex items-center justify-center p-2">
              <img
                src={zoomedReceipt.url}
                alt="Comprovante de pagamento"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="mt-4 pt-3 border-t border-zinc-900 text-center text-[11px] text-zinc-500 font-mono">
              COMPROVANTE DIGITADO ELETRONICAMENTE NO BANCO CENTRAL DO BRASIL
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
