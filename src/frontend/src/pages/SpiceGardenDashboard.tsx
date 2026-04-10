import Chart from "chart.js/auto";
import { jsPDF } from "jspdf";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "jspdf-autotable";
import "./SpiceGardenDashboard.css";
import type {
  Customer as BackendCustomer,
  Feedback as BackendFeedback,
  Order as BackendOrder,
  Payment as BackendPayment,
} from "../backend";
import {
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatusToUiKey,
  useCustomers,
  useDashboardStats,
  useFeedbacks,
  useOrders,
  usePayments,
  useSeedInitialData,
} from "../hooks/useQueries";

// jspdf-autotable type augmentation
declare module "jspdf" {
  interface jsPDF {
    // biome-ignore lint/suspicious/noExplicitAny: jspdf-autotable augmentation
    autoTable: (options: any) => jsPDF;
  }
}

interface Customer {
  name: string;
  phone: string;
  avatar: string;
}
interface Payment {
  id: string;
  customer: Customer;
  items: string;
  amount: number;
  method: string;
  date: Date;
  status: string;
  discount: number;
}

// ─── Backend → UI Mapping ──────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  "Priya Sharma": "#E8631A",
  "Rahul Mehta": "#1A7A4A",
  "Anita Kumar": "#C0392B",
  "Suresh Nair": "#D4A017",
  "Kavya Reddy": "#2980B9",
  "Vikram Singh": "#8E44AD",
  "Meera Pillai": "#E91E63",
  "Arjun Rao": "#00796B",
  "Deepika Joshi": "#5D4037",
  "Karthik Menon": "#37474F",
};

const AVATAR_DEFAULTS = [
  "#E8631A",
  "#1A7A4A",
  "#C0392B",
  "#D4A017",
  "#2980B9",
  "#8E44AD",
  "#E91E63",
  "#00796B",
  "#5D4037",
  "#37474F",
];

function getAvatar(name: string): string {
  return (
    AVATAR_COLORS[name] ??
    AVATAR_DEFAULTS[name.charCodeAt(0) % AVATAR_DEFAULTS.length]
  );
}

function mapBackendPayment(bp: BackendPayment): Payment {
  const statusUi = paymentStatusToUiKey(bp.status);
  const methodUi = paymentMethodLabel(bp.method);
  let date: Date;
  try {
    date = new Date(bp.date);
  } catch {
    date = new Date();
  }
  if (Number.isNaN(date.getTime())) date = new Date();
  return {
    id: bp.id.toString(),
    customer: {
      name: bp.customer,
      phone: "",
      avatar: getAvatar(bp.customer),
    },
    items: bp.items,
    amount: Number(bp.amount),
    method: methodUi,
    date,
    status: statusUi,
    discount: Number(bp.discount),
  };
}
interface ChatMessage {
  text: string;
  who: "bot" | "user";
  ts: string;
  isTyping?: boolean;
}
interface FlowStep {
  bot: string;
  replies: string[] | null;
  key: string;
  step: number;
}

const PANEL_META: Record<string, [string, string]> = {
  dashboard: [
    "Live Dashboard",
    "Real-time intelligence · Auto-updating every 5s",
  ],
  feedback: ["Feedback Analysis", "AI sentiment and complaint detection"],
  payments: ["Payment History", "Full transaction ledger with PDF export"],
  orders: ["Orders & Smart Discounts", "Personalised AI offers"],
  segments: ["Customer Segmentation", "Age group and gender analytics"],
  analytics: ["Visual Analytics", "Sales trends and return rates"],
  intelligence: ["AI Intelligence Layer", "Return predictions and campaigns"],
  mood: ["Mood-Based Sales Engine", "Automated mood detection"],
  chatbot: ["AI Chatbot", "Interactive 6-question customer journey"],
  architecture: ["System Architecture", "Full-stack platform overview"],
  jotform: ["JotForm AI Agent", "Embedded AI agent integration"],
  "live-app": ["Live Platform", "AI Business Autopilot deployed"],
};

const METHODS = ["UPI", "Card", "Cash"];
const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  pending: "Pending",
  refunded: "Refunded",
  partial: "Partial",
  completed: "Paid",
};

const CHAT_FLOW: FlowStep[] = [
  {
    bot: "👋 Hello! Welcome to **Spice Garden**!\n\nI'm your AI assistant. How can I help you today?",
    replies: [
      "🍽️ View Menu",
      "📦 Track Order",
      "⭐ Give Feedback",
      "💸 Offers",
      "📞 Contact",
    ],
    key: "intent",
    step: 1,
  },
  {
    bot: "Great! Are you a **new visitor** or a **returning guest**?",
    replies: ["🆕 First Time", "🔁 Regular Customer", "👥 With Family"],
    key: "ctype",
    step: 2,
  },
  {
    bot: "Perfect! What are you looking for today?",
    replies: [
      "🍛 Full Menu",
      "⭐ Best Sellers",
      "🎁 Combo Deals",
      "🥗 Healthy Options",
      "🌶️ Chef Special",
    ],
    key: "looking",
    step: 3,
  },
  {
    bot: "How was your **last experience** at Spice Garden?",
    replies: [
      "⭐⭐⭐⭐⭐ Amazing!",
      "⭐⭐⭐⭐ Good",
      "⭐⭐⭐ Okay",
      "⭐⭐ Could be better",
      "⭐ Disappointing",
    ],
    key: "exp",
    step: 4,
  },
  {
    bot: "🎉 Use code **SPICE20** — 20% off your next order!",
    replies: ["✅ Yes, 20% off!", "🎁 Show all offers", "❌ No thanks"],
    key: "offer",
    step: 5,
  },
  {
    bot: "How would you like to **stay updated**?",
    replies: ["📱 WhatsApp", "💬 SMS", "📧 Email", "🔔 All channels"],
    key: "contact",
    step: 6,
  },
];

const PER_PAGE = 15;
const CS = "#E8631A";
const CL = "#1A7A4A";
const CT = "#D4A017";
const CR = "#C0392B";
const CS2 = "rgba(232,99,26,.12)";
const CL2 = "rgba(26,122,74,.12)";
const CT2 = "rgba(212,160,23,.12)";

export default function SpiceGardenDashboard() {
  // ─── Backend data ────────────────────────────────────────────────────────
  useSeedInitialData();
  const { data: backendPayments = [] } = usePayments();
  const { data: dashboardStats } = useDashboardStats();
  const { data: _backendFeedbacks = [] } = useFeedbacks();
  const { data: _backendOrders = [] } = useOrders();
  const { data: backendCustomers = [] } = useCustomers();

  // Map backend payments to UI format
  const ALL_PAYMENTS = useMemo(
    () =>
      backendPayments
        .map(mapBackendPayment)
        .sort((a, b) => b.date.getTime() - a.date.getTime()),
    [backendPayments],
  );
  // Stable ref so callbacks always see latest payments without re-memoizing
  const allPaymentsRef = useRef<Payment[]>(ALL_PAYMENTS);
  useEffect(() => {
    allPaymentsRef.current = ALL_PAYMENTS;
  }, [ALL_PAYMENTS]);

  // Derive dashboard stats for display
  const totalCustomers = dashboardStats
    ? Number(dashboardStats.totalCustomers)
    : backendCustomers.length || 247;
  const totalRevenue = dashboardStats
    ? Number(dashboardStats.totalRevenue)
    : 18400;
  const ordersToday = dashboardStats ? Number(dashboardStats.ordersToday) : 38;

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState("dashboard");
  const [clockTime, setClockTime] = useState("--:--:--");
  const [activeCount, setActiveCount] = useState(47);
  const [ordersPerHour, setOrdersPerHour] = useState(38);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");
  const [activeMethodFilter, setActiveMethodFilter] = useState("all-m");
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatStatus, setChatStatus] = useState("Online · Ready to help");
  const [chatStepLabel, setChatStepLabel] = useState("Step 0 of 6");
  const [chatProgWidth, setChatProgWidth] = useState(0);
  const [collectedData, setCollectedData] = useState<Record<string, string>>(
    {},
  );
  const [chatInput, setChatInput] = useState("");
  const [showDataPanel, setShowDataPanel] = useState(false);

  // Sync filteredPayments when ALL_PAYMENTS changes (backend data loaded)
  useEffect(() => {
    setFilteredPayments(ALL_PAYMENTS);
  }, [ALL_PAYMENTS]);

  const chartRefs = useRef<Record<string, Chart>>({});
  const chatMsgsRef = useRef<HTMLDivElement>(null);
  const chatStepRef = useRef(0);

  // Clock
  useEffect(() => {
    const update = () =>
      setClockTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    update();
    const iv = setInterval(() => {
      update();
      setActiveCount(44 + Math.round(Math.random() * 7));
      setOrdersPerHour(35 + Math.round(Math.random() * 6));
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const destroyChart = useCallback((id: string) => {
    if (chartRefs.current[id]) {
      chartRefs.current[id].destroy();
      delete chartRefs.current[id];
    }
  }, []);

  const mkChart = useCallback(
    (id: string, cfg: object) => {
      destroyChart(id);
      const canvas = document.getElementById(id) as HTMLCanvasElement | null;
      if (!canvas) return;
      // biome-ignore lint/suspicious/noExplicitAny: Chart.js constructor
      chartRefs.current[id] = new Chart(canvas, cfg as any);
    },
    [destroyChart],
  );

  const renderCharts = useCallback(
    (panel: string) => {
      const hrs = [
        "9AM",
        "10",
        "11",
        "12PM",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7PM",
      ];
      const bOpts = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { color: "rgba(0,0,0,.05)" },
            ticks: {
              color: "#8A9490",
              font: { size: 11, family: "Instrument Sans" },
            },
          },
          y: {
            grid: { color: "rgba(0,0,0,.05)" },
            ticks: {
              color: "#8A9490",
              font: { size: 11, family: "Instrument Sans" },
            },
            beginAtZero: true,
          },
        },
      };
      setTimeout(() => {
        if (panel === "dashboard") {
          mkChart("c-footfall", {
            type: "line",
            data: {
              labels: hrs,
              datasets: [
                {
                  data: [12, 18, 24, 42, 56, 61, 58, 47, 35, 28, 19],
                  borderColor: CS,
                  backgroundColor: CS2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 3,
                  pointBackgroundColor: CS,
                },
              ],
            },
            options: bOpts,
          });
          mkChart("c-ordhr", {
            type: "bar",
            data: {
              labels: hrs,
              datasets: [
                {
                  data: [8, 14, 19, 34, 48, 52, 49, 38, 28, 22, 14],
                  backgroundColor: CS2,
                  borderColor: CS,
                  borderWidth: 1.5,
                  borderRadius: 5,
                },
              ],
            },
            options: bOpts,
          });
        }
        if (panel === "payments") {
          const days30 = Array.from({ length: 30 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - 29 + i);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          });
          const rev30 = Array.from(
            { length: 30 },
            () => 6000 + Math.round(Math.random() * 14000),
          );
          mkChart("c-paytrend", {
            type: "line",
            data: {
              labels: days30,
              datasets: [
                {
                  data: rev30,
                  borderColor: CS,
                  backgroundColor: CS2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 2,
                  pointBackgroundColor: CS,
                },
              ],
            },
            options: {
              ...bOpts,
              scales: {
                x: {
                  ...bOpts.scales.x,
                  ticks: {
                    ...bOpts.scales.x.ticks,
                    maxRotation: 0,
                    maxTicksLimit: 8,
                  },
                },
                y: {
                  ...bOpts.scales.y,
                  ticks: {
                    callback: (v: number) => `₹${(v / 1000).toFixed(0)}K`,
                    color: "#8A9490",
                    font: { size: 11 },
                  },
                },
              },
            },
          });
          mkChart("c-paymethods", {
            type: "doughnut",
            data: {
              labels: ["UPI", "Card", "Cash", "Wallet"],
              datasets: [
                {
                  data: [52, 24, 16, 8],
                  backgroundColor: [CS, CL, CT, CR],
                  borderWidth: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: "65%",
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",
                  labels: {
                    boxWidth: 11,
                    padding: 12,
                    font: { size: 12 },
                    color: "#2D3A32",
                  },
                },
              },
            },
          });
        }
        if (panel === "feedback") {
          mkChart("c-sentiment", {
            type: "doughnut",
            data: {
              labels: ["Positive", "Negative", "Neutral"],
              datasets: [
                {
                  data: [68, 21, 11],
                  backgroundColor: [CL, CR, CT],
                  borderWidth: 0,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              cutout: "66%",
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",
                  labels: { boxWidth: 11, padding: 12, font: { size: 11 } },
                },
              },
            },
          });
          mkChart("c-complaints", {
            type: "bar",
            data: {
              labels: [
                "Long Wait",
                "Cold Food",
                "Small Portions",
                "Noise",
                "Service",
              ],
              datasets: [
                {
                  data: [34, 28, 19, 12, 7],
                  backgroundColor: CS2,
                  borderColor: CS,
                  borderWidth: 1.5,
                  borderRadius: 4,
                },
              ],
            },
            options: { ...bOpts, indexAxis: "y" },
          });
        }
        if (panel === "segments") {
          mkChart("c-age", {
            type: "bar",
            data: {
              labels: ["Below 20", "Age 21–35", "Age 36+"],
              datasets: [
                {
                  data: [18, 52, 30],
                  backgroundColor: [CS2, CL2, CT2],
                  borderColor: [CS, CL, CT],
                  borderWidth: 1.5,
                  borderRadius: 6,
                },
              ],
            },
            options: {
              ...bOpts,
              scales: {
                x: bOpts.scales.x,
                y: {
                  ...bOpts.scales.y,
                  max: 70,
                  ticks: {
                    callback: (v: number) => `${v}%`,
                    color: "#8A9490",
                    font: { size: 11 },
                  },
                },
              },
            },
          });
          mkChart("c-gender", {
            type: "pie",
            data: {
              labels: ["Men 58%", "Women 42%"],
              datasets: [
                { data: [58, 42], backgroundColor: [CS, CL], borderWidth: 0 },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: true,
                  position: "bottom",
                  labels: { boxWidth: 11, padding: 12, font: { size: 11 } },
                },
              },
            },
          });
        }
        if (panel === "analytics") {
          const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
          mkChart("c-sales", {
            type: "line",
            data: {
              labels: days,
              datasets: [
                {
                  data: [14200, 16800, 15400, 18200, 21000, 28400, 22100],
                  borderColor: CS,
                  backgroundColor: CS2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 4,
                  pointBackgroundColor: CS,
                },
              ],
            },
            options: {
              ...bOpts,
              scales: {
                x: bOpts.scales.x,
                y: {
                  ...bOpts.scales.y,
                  ticks: {
                    callback: (v: number) => `₹${(v / 1000).toFixed(0)}K`,
                    color: "#8A9490",
                    font: { size: 11 },
                  },
                },
              },
            },
          });
          mkChart("c-return", {
            type: "line",
            data: {
              labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
              datasets: [
                {
                  data: [61, 65, 68, 70, 71, 73],
                  borderColor: CL,
                  backgroundColor: CL2,
                  tension: 0.4,
                  fill: true,
                  pointRadius: 4,
                  pointBackgroundColor: CL,
                },
              ],
            },
            options: {
              ...bOpts,
              scales: {
                x: bOpts.scales.x,
                y: {
                  ...bOpts.scales.y,
                  min: 50,
                  max: 85,
                  ticks: {
                    callback: (v: number) => `${v}%`,
                    color: "#8A9490",
                    font: { size: 11 },
                  },
                },
              },
            },
          });
          mkChart("c-revcat", {
            type: "bar",
            data: {
              labels: days,
              datasets: [
                {
                  label: "Mains",
                  data: [6200, 7400, 6800, 8200, 9800, 13200, 10100],
                  backgroundColor: CS,
                  borderRadius: { topLeft: 4, topRight: 4 },
                },
                {
                  label: "Drinks",
                  data: [2100, 2400, 2200, 2600, 3200, 4200, 3300],
                  backgroundColor: CL,
                },
                {
                  label: "Desserts",
                  data: [1100, 1400, 1200, 1400, 1800, 2400, 1900],
                  backgroundColor: CT,
                },
              ],
            },
            options: {
              ...bOpts,
              scales: {
                x: { ...bOpts.scales.x, stacked: true },
                y: {
                  ...bOpts.scales.y,
                  stacked: true,
                  ticks: {
                    callback: (v: number) => `₹${(v / 1000).toFixed(0)}K`,
                    color: "#8A9490",
                    font: { size: 11 },
                  },
                },
              },
              plugins: {
                legend: {
                  display: true,
                  position: "top",
                  labels: {
                    boxWidth: 10,
                    padding: 10,
                    font: { size: 11 },
                    color: "#2D3A32",
                  },
                },
              },
            },
          });
        }
      }, 50);
    },
    [mkChart],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: renderCharts and destroyChart are stable
  useEffect(() => {
    renderCharts("dashboard");
    return () => {
      Object.keys(chartRefs.current).forEach(destroyChart);
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: renderCharts is stable
  useEffect(() => {
    renderCharts(activePanel);
  }, [activePanel]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: allPaymentsRef is a stable ref
  const showPanel = useCallback((id: string) => {
    setActivePanel(id);
    if (id === "payments") {
      setFilteredPayments(allPaymentsRef.current);
      setCurrentPage(1);
      setActiveStatusFilter("all");
      setActiveMethodFilter("all-m");
      setSearchQuery("");
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2800);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: allPaymentsRef is a stable ref
  const applyFilters = useCallback(
    (status: string, method: string, search: string) => {
      const result = allPaymentsRef.current.filter((p) => {
        const statusOk = status === "all" || p.status === status;
        const methodOk = method === "all-m" || p.method === method;
        const searchOk =
          !search ||
          p.customer.name.toLowerCase().includes(search.toLowerCase()) ||
          p.id.toLowerCase().includes(search.toLowerCase());
        return statusOk && methodOk && searchOk;
      });
      setFilteredPayments(result);
      setCurrentPage(1);
    },
    [],
  );

  const buildReceiptPDF = useCallback(
    (payments: Payment[], title = "Payment History Report") => {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });
      const W = 297;
      const pageH = 210;
      const saffron: [number, number, number] = [232, 99, 26];
      const ink: [number, number, number] = [15, 26, 18];
      const mutedBg: [number, number, number] = [251, 247, 240];
      const leaf: [number, number, number] = [26, 122, 74];
      doc.setFillColor(...saffron);
      doc.rect(0, 0, W, 28, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text("Spice Garden", 14, 12);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("AI Customer Intelligence Platform", 14, 18.5);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(title, W / 2, 12, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(
        `Generated: ${new Date().toLocaleString("en-IN")}`,
        W / 2,
        18.5,
        { align: "center" },
      );
      doc.text(`Total Transactions: ${payments.length}`, W - 14, 12, {
        align: "right",
      });
      const totalRev = payments.reduce((s, p) => s + p.amount, 0);
      doc.text(
        `Total Revenue: Rs. ${totalRev.toLocaleString("en-IN")}`,
        W - 14,
        18.5,
        { align: "right" },
      );
      const paid = payments.filter((p) => p.status === "paid");
      const pending = payments.filter((p) => p.status === "pending");
      const refunded = payments.filter((p) => p.status === "refunded");
      const summaryY = 32;
      const boxes = [
        {
          label: "Paid",
          value: paid.length,
          sub: `Rs. ${paid.reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN")}`,
          color: leaf,
        },
        {
          label: "Pending",
          value: pending.length,
          sub: `Rs. ${pending.reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN")}`,
          color: [212, 160, 23] as [number, number, number],
        },
        {
          label: "Refunded",
          value: refunded.length,
          sub: `Rs. ${refunded.reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN")}`,
          color: [192, 57, 43] as [number, number, number],
        },
        {
          label: "Total Revenue",
          value: `Rs. ${totalRev.toLocaleString("en-IN")}`,
          sub: `${payments.length} transactions`,
          color: saffron,
        },
      ];
      const bw = (W - 28 - 12) / 4;
      for (const [i, b] of boxes.entries()) {
        const bx = 14 + i * (bw + 4);
        doc.setFillColor(...mutedBg);
        doc.roundedRect(bx, summaryY, bw, 18, 2, 2, "F");
        doc.setDrawColor(...b.color);
        doc.setLineWidth(0.5);
        doc.roundedRect(bx, summaryY, bw, 18, 2, 2, "S");
        doc.setFillColor(...b.color);
        doc.roundedRect(bx, summaryY, bw, 2.5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(...b.color);
        doc.text(String(b.value), bx + bw / 2, summaryY + 11, {
          align: "center",
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...ink);
        doc.text(b.label, bx + bw / 2, summaryY + 15.5, { align: "center" });
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(7);
        doc.text(b.sub, bx + bw / 2, summaryY + 18.5, { align: "center" });
      }
      const tableData = payments.map((p) => [
        `#${p.id}`,
        p.customer.name,
        p.customer.phone,
        p.items.length > 30 ? `${p.items.substring(0, 28)}…` : p.items,
        `Rs. ${p.amount.toLocaleString("en-IN")}`,
        p.method,
        p.date.toLocaleDateString("en-IN"),
        p.date.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        p.discount > 0 ? `₹${p.discount} off` : "—",
        STATUS_LABELS[p.status],
      ]);
      doc.autoTable({
        startY: summaryY + 22,
        head: [
          [
            "Txn ID",
            "Customer",
            "Phone",
            "Items",
            "Amount",
            "Method",
            "Date",
            "Time",
            "Discount",
            "Status",
          ],
        ],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: [...ink],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: "bold",
          halign: "left",
          cellPadding: 3,
        },
        bodyStyles: { fontSize: 8, cellPadding: 2.5, textColor: [...ink] },
        alternateRowStyles: { fillColor: [...mutedBg] },
        columnStyles: {
          0: { fontStyle: "bold", textColor: [100, 100, 100], cellWidth: 20 },
          1: { fontStyle: "bold", cellWidth: 32 },
          2: { textColor: [100, 100, 100], cellWidth: 26 },
          3: { cellWidth: 52 },
          4: { fontStyle: "bold", halign: "right", cellWidth: 24 },
          5: { cellWidth: 18 },
          6: { cellWidth: 22 },
          7: { cellWidth: 16 },
          8: { textColor: [26, 122, 74], cellWidth: 16 },
          9: { halign: "center", cellWidth: 20 },
        },
        didParseCell: (data: {
          section: string;
          column: { index: number };
          cell: { raw: string; styles: { textColor: number[] } };
        }) => {
          if (data.section === "body" && data.column.index === 9) {
            if (data.cell.raw === "Paid")
              data.cell.styles.textColor = [...leaf];
            else if (data.cell.raw === "Pending")
              data.cell.styles.textColor = [212, 160, 23];
            else if (data.cell.raw === "Refunded")
              data.cell.styles.textColor = [192, 57, 43];
          }
        },
        margin: { left: 14, right: 14 },
      });
      const pageCount = (
        doc.internal as unknown as { getNumberOfPages: () => number }
      ).getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          "Spice Garden · AI Business Platform · Confidential",
          14,
          pageH - 6,
        );
        doc.text(`Page ${i} of ${pageCount}`, W - 14, pageH - 6, {
          align: "right",
        });
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(14, pageH - 9, W - 14, pageH - 9);
      }
      return doc;
    },
    [],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: allPaymentsRef is a stable ref
  const exportAllPDF = useCallback(() => {
    showToast("⏳ Generating PDF report…");
    setTimeout(() => {
      const doc = buildReceiptPDF(
        allPaymentsRef.current,
        "Full Payment History Report",
      );
      doc.save(
        `SpiceGarden_All_Payments_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      showToast("✅ PDF downloaded successfully!");
    }, 300);
  }, [buildReceiptPDF, showToast]);

  const exportFilteredPDF = useCallback(() => {
    if (!filteredPayments.length) {
      showToast("⚠️ No transactions match the current filter");
      return;
    }
    showToast("⏳ Generating filtered report…");
    setTimeout(() => {
      const doc = buildReceiptPDF(
        filteredPayments,
        `Filtered Payment Report (${filteredPayments.length} transactions)`,
      );
      doc.save(
        `SpiceGarden_Filtered_Payments_${new Date().toISOString().slice(0, 10)}.pdf`,
      );
      showToast("✅ Filtered PDF downloaded!");
    }, 300);
  }, [filteredPayments, buildReceiptPDF, showToast]);

  const downloadSingleReceipt = useCallback(
    (p: Payment) => {
      showToast(`⏳ Generating receipt for ${p.customer.name}…`);
      setTimeout(() => {
        const doc = new jsPDF({ unit: "mm", format: [80, 120] });
        const saffron: [number, number, number] = [232, 99, 26];
        const ink: [number, number, number] = [15, 26, 18];
        const leaf: [number, number, number] = [26, 122, 74];
        doc.setFillColor(...saffron);
        doc.rect(0, 0, 80, 22, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text("Spice Garden", 40, 9, { align: "center" });
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("AI Customer Intelligence Platform", 40, 14, {
          align: "center",
        });
        doc.text("PAYMENT RECEIPT", 40, 19, { align: "center" });
        let y = 26;
        const row = (key: string, val: string) => {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(...ink);
          doc.text(`${key}:`, 6, y);
          doc.setFont("helvetica", "bold");
          doc.text(val, 74, y, { align: "right" });
          y += 5.5;
        };
        const divider = () => {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);
          doc.line(6, y, 74, y);
          y += 3;
        };
        row("Txn ID", `#${p.id}`);
        row("Date", p.date.toLocaleDateString("en-IN"));
        row(
          "Time",
          p.date.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        );
        divider();
        row("Customer", p.customer.name);
        row("Phone", p.customer.phone);
        divider();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...ink);
        doc.text("Items:", 6, y);
        y += 4.5;
        doc.setFont("helvetica", "italic");
        doc.setTextColor(100, 100, 100);
        const itemLines = doc.splitTextToSize(p.items, 62);
        doc.text(itemLines, 6, y);
        y += itemLines.length * 4 + 1;
        divider();
        if (p.discount > 0) {
          row("Discount", `₹${p.discount} off`);
        }
        row("Method", p.method);
        divider();
        doc.setFillColor(251, 247, 240);
        doc.rect(4, y - 1, 72, 9, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(...saffron);
        doc.text("TOTAL:", 6, y + 5.5);
        doc.text(`Rs. ${p.amount.toLocaleString("en-IN")}`, 74, y + 5.5, {
          align: "right",
        });
        y += 12;
        const statusColors: { [k: string]: [number, number, number] } = {
          paid: leaf,
          pending: [212, 160, 23],
          refunded: [192, 57, 43],
        };
        const sColor = statusColors[p.status] || ink;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...sColor);
        doc.text(`Status: ${STATUS_LABELS[p.status].toUpperCase()}`, 40, y, {
          align: "center",
        });
        y += 7;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Thank you for dining at Spice Garden!", 40, y, {
          align: "center",
        });
        doc.save(`Receipt_${p.id}_${p.customer.name.replace(/\s+/g, "_")}.pdf`);
        showToast(`✅ Receipt for ${p.customer.name} downloaded!`);
      }, 200);
    },
    [showToast],
  );

  const scrollChat = useCallback(() => {
    setTimeout(() => {
      if (chatMsgsRef.current)
        chatMsgsRef.current.scrollTop = chatMsgsRef.current.scrollHeight;
    }, 50);
  }, []);

  const addBubble = useCallback(
    (text: string, who: "bot" | "user") => {
      const ts = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setChatMessages((prev) => [...prev, { text, who, ts }]);
      scrollChat();
    },
    [scrollChat],
  );

  const renderBotMsg = useCallback(
    (f: FlowStep, overrideText?: string) => {
      setChatStatus("Typing…");
      setChatBusy(true);
      setChatMessages((prev) => [
        ...prev,
        { text: "", who: "bot", ts: "", isTyping: true },
      ]);
      scrollChat();
      setTimeout(
        () => {
          setChatBusy(false);
          setChatStatus("Online · Ready to help");
          setChatMessages((prev) => prev.filter((m) => !m.isTyping));
          addBubble(overrideText || f.bot, "bot");
          setQuickReplies(f.replies || []);
          setChatProgWidth((f.step / 6) * 100);
          setChatStepLabel(`Step ${f.step} of 6`);
          scrollChat();
        },
        700 + Math.random() * 400,
      );
    },
    [addBubble, scrollChat],
  );

  const startChat = useCallback(() => {
    chatStepRef.current = 0;
    setChatMessages([]);
    setQuickReplies([]);
    setCollectedData({});
    setShowDataPanel(false);
    setChatProgWidth(0);
    setChatStepLabel("Step 0 of 6");
    renderBotMsg(CHAT_FLOW[0]);
    chatStepRef.current = 1;
  }, [renderBotMsg]);

  const openChat = useCallback(() => {
    setChatOpen(true);
    if (chatStepRef.current === 0) setTimeout(startChat, 350);
  }, [startChat]);

  const advance = useCallback(
    (userText: string, stepAtTime: number) => {
      if (stepAtTime >= CHAT_FLOW.length) {
        renderBotMsg({
          bot: `🎉 **All done!** Thank you!\n\n✅ Code: SPICE20 (20% off)\n📱 Contact: ${userText}\n\nSee you soon! 🍛❤️`,
          replies: null,
          key: "done",
          step: 6,
        });
        setTimeout(() => setQuickReplies(["🔄 New Chat"]), 1200);
        return;
      }
      const f = CHAT_FLOW[stepAtTime];
      let txt = f.bot;
      if (stepAtTime === 3) {
        const l = userText.toLowerCase();
        if (l.includes("disappoint") || l.includes("could be"))
          txt = `😔 We're so sorry! Our manager has been notified.\n\nPlease accept **30% off** today's order — no code needed! 🙏\n\n${f.bot}`;
        else if (l.includes("amazing") || l.includes("⭐⭐⭐⭐⭐"))
          txt = `🌟 You just made our day!\n\nMind leaving a **Google review**? Share with a friend — you both get **10% off**! 🎉\n\n${f.bot}`;
      }
      chatStepRef.current = stepAtTime + 1;
      renderBotMsg({ ...f, bot: txt });
    },
    [renderBotMsg],
  );

  const pick = useCallback(
    (text: string) => {
      if (chatBusy) return;
      if (text === "🔄 New Chat") {
        startChat();
        return;
      }
      setQuickReplies([]);
      addBubble(text, "user");
      const step = chatStepRef.current;
      if (CHAT_FLOW[step - 1]) {
        const key = CHAT_FLOW[step - 1].key;
        setCollectedData((prev) => {
          const next = { ...prev, [key]: text };
          setShowDataPanel(Object.keys(next).length > 0);
          return next;
        });
      }
      advance(text, step);
    },
    [chatBusy, addBubble, advance, startChat],
  );

  const sendMsg = useCallback(() => {
    if (!chatInput.trim() || chatBusy) return;
    const text = chatInput.trim();
    setChatInput("");
    setQuickReplies([]);
    addBubble(text, "user");
    const step = chatStepRef.current;
    if (CHAT_FLOW[step - 1]) {
      const key = CHAT_FLOW[step - 1].key;
      setCollectedData((prev) => {
        const next = { ...prev, [key]: text };
        setShowDataPanel(Object.keys(next).length > 0);
        return next;
      });
    }
    advance(text, step);
  }, [chatInput, chatBusy, addBubble, advance]);

  const total = filteredPayments.length;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const pageSlice = filteredPayments.slice(start, start + PER_PAGE);
  const renderPageBtns = () => {
    const sp: (number | string)[] = [];
    if (pages <= 7) {
      for (let i = 1; i <= pages; i++) sp.push(i);
    } else {
      sp.push(1);
      if (currentPage > 3) sp.push("…");
      for (
        let i = Math.max(2, currentPage - 1);
        i <= Math.min(pages - 1, currentPage + 1);
        i++
      )
        sp.push(i);
      if (currentPage < pages - 2) sp.push("…");
      sp.push(pages);
    }
    return sp;
  };

  const B = (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props} />
  );

  return (
    <div className="sg-app">
      {/* SIDEBAR */}
      <aside className="sg-sidebar">
        <div className="sg-logo-zone">
          <div className="sg-logo-row">
            <div className="sg-logo-gem">SG</div>
            <div>
              <div className="sg-logo-name">Spice Garden</div>
              <div className="sg-logo-sub">AI Growth Engine</div>
            </div>
          </div>
        </div>
        <nav className="sg-nav">
          <div className="sg-nav-section">
            <div className="sg-nav-label">Integrations</div>
            <B
              className={`sg-nav-item${activePanel === "jotform" ? " active" : ""}`}
              onClick={() => showPanel("jotform")}
            >
              <span className="sg-nav-icon">🤖</span>JotForm AI Agent
              <span className="sg-nav-badge sg-nb-saffron">AI</span>
            </B>
            <B
              className={`sg-nav-item${activePanel === "live-app" ? " active" : ""}`}
              onClick={() => showPanel("live-app")}
            >
              <span className="sg-nav-icon">🚀</span>Live Platform
              <span className="sg-nav-badge sg-nb-leaf">Live</span>
            </B>
          </div>
          <div className="sg-nav-section">
            <div className="sg-nav-label">Dashboard</div>
            <B
              className={`sg-nav-item${activePanel === "dashboard" ? " active" : ""}`}
              onClick={() => showPanel("dashboard")}
            >
              <span className="sg-nav-icon">📊</span>Live Dashboard
            </B>
            <B
              className={`sg-nav-item${activePanel === "feedback" ? " active" : ""}`}
              onClick={() => showPanel("feedback")}
            >
              <span className="sg-nav-icon">💬</span>Feedback AI
            </B>
          </div>
          <div className="sg-nav-section">
            <div className="sg-nav-label">Customers</div>
            <B
              className={`sg-nav-item${activePanel === "payments" ? " active" : ""}`}
              onClick={() => showPanel("payments")}
            >
              <span className="sg-nav-icon">💳</span>Payment History
              <span className="sg-nav-badge sg-nb-new">New</span>
            </B>
            <B
              className={`sg-nav-item${activePanel === "orders" ? " active" : ""}`}
              onClick={() => showPanel("orders")}
            >
              <span className="sg-nav-icon">🛒</span>Orders &amp; Discounts
            </B>
            <B
              className={`sg-nav-item${activePanel === "segments" ? " active" : ""}`}
              onClick={() => showPanel("segments")}
            >
              <span className="sg-nav-icon">👥</span>Segmentation
            </B>
          </div>
          <div className="sg-nav-section">
            <div className="sg-nav-label">Analytics</div>
            <B
              className={`sg-nav-item${activePanel === "analytics" ? " active" : ""}`}
              onClick={() => showPanel("analytics")}
            >
              <span className="sg-nav-icon">📈</span>Visual Analytics
            </B>
            <B
              className={`sg-nav-item${activePanel === "intelligence" ? " active" : ""}`}
              onClick={() => showPanel("intelligence")}
            >
              <span className="sg-nav-icon">🧠</span>AI Intelligence
            </B>
          </div>
          <div className="sg-nav-section">
            <div className="sg-nav-label">Features</div>
            <B
              className={`sg-nav-item${activePanel === "mood" ? " active" : ""}`}
              onClick={() => showPanel("mood")}
            >
              <span className="sg-nav-icon">😊</span>Mood Engine
            </B>
            <B
              className={`sg-nav-item${activePanel === "chatbot" ? " active" : ""}`}
              onClick={() => showPanel("chatbot")}
            >
              <span className="sg-nav-icon">🤖</span>AI Chatbot
            </B>
            <B
              className={`sg-nav-item${activePanel === "architecture" ? " active" : ""}`}
              onClick={() => showPanel("architecture")}
            >
              <span className="sg-nav-icon">🏗️</span>Architecture
            </B>
          </div>
        </nav>
        <div className="sg-sidebar-foot">
          <div className="sg-live-pill">
            <div className="sg-pdot" />
            <span>{activeCount} customers active</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="sg-main">
        <header className="sg-topbar">
          <div className="sg-topbar-info">
            <div className="sg-topbar-title">
              {PANEL_META[activePanel]?.[0] || "Dashboard"}
            </div>
            <div className="sg-topbar-sub">
              {PANEL_META[activePanel]?.[1] || ""}
            </div>
          </div>
          <div className="sg-topbar-right">
            <div className="sg-clock">{clockTime}</div>
            <B
              className="sg-btn sg-btn-ghost"
              onClick={() =>
                window.open(
                  "https://www.jotform.com/agent/019d733c25a178878c98d2bc0ca317eed8c7",
                  "_blank",
                )
              }
            >
              🤖 AI Agent
            </B>
            <B
              className="sg-btn sg-btn-leaf"
              onClick={() =>
                window.open(
                  "https://ai-business-autopilot-rv5.caffeine.xyz",
                  "_blank",
                )
              }
            >
              🚀 Live App
            </B>
            <B className="sg-btn sg-btn-saffron" onClick={openChat}>
              💬 Chat
            </B>
          </div>
        </header>
        <div className="sg-content">
          {/* JOTFORM */}
          <div
            className={`sg-panel${activePanel === "jotform" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">🤖 JotForm AI Agent</div>
                <div className="sg-sec-sub">
                  Embedded AI agent — interact with customers directly
                </div>
              </div>
            </div>
            <div className="sg-hero sg-hero-saffron sg-mb-4">
              <div>
                <h2>AI Customer Agent</h2>
                <p>
                  Powered by JotForm AI — handles queries, collects feedback,
                  triggers smart automations.
                </p>
              </div>
              <div className="sg-hero-btns">
                <B
                  className="sg-hb-w"
                  onClick={() =>
                    window.open(
                      "https://www.jotform.com/agent/019d733c25a178878c98d2bc0ca317eed8c7",
                      "_blank",
                    )
                  }
                >
                  ↗ Open Full Screen
                </B>
                <B className="sg-hb-o" onClick={() => showPanel("chatbot")}>
                  Try Internal Bot
                </B>
              </div>
            </div>
            <div className="sg-link-preview">
              <div className="sg-lp-head">
                <div className="sg-lp-logo" style={{ background: "#FFF4E6" }}>
                  🤖
                </div>
                <div className="sg-lp-info">
                  <h3>JotForm AI Agent — Spice Garden</h3>
                  <p style={{ color: "var(--muted)", fontSize: "12px" }}>
                    jotform.com/agent/019d733c25a178878c98d2bc0ca317eed8c7
                  </p>
                </div>
                <div className="sg-lp-acts">
                  <span className="sg-badge sg-b-live">● Live</span>
                  <B
                    className="sg-btn sg-btn-saffron sg-btn-sm"
                    onClick={() =>
                      window.open(
                        "https://www.jotform.com/agent/019d733c25a178878c98d2bc0ca317eed8c7",
                        "_blank",
                      )
                    }
                  >
                    Open ↗
                  </B>
                </div>
              </div>
              <div
                className="sg-iframe-bar"
                style={{ background: "var(--saffron)" }}
              >
                <div className="sg-iframe-dots">
                  <div className="sg-iframe-dot" />
                  <div className="sg-iframe-dot" />
                  <div className="sg-iframe-dot" />
                </div>
                <div className="sg-iframe-url">
                  https://www.jotform.com/agent/019d733c25a178878c98d2bc0ca317eed8c7
                </div>
              </div>
              <div
                style={{
                  background: "var(--cream)",
                  padding: "50px 20px",
                  textAlign: "center",
                  minHeight: "480px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                }}
              >
                <div style={{ fontSize: "60px" }}>🤖</div>
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 800,
                    fontSize: "20px",
                  }}
                >
                  JotForm AI Agent
                </div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: "13px",
                    maxWidth: "360px",
                    lineHeight: 1.7,
                  }}
                >
                  JotForm requires direct browser access. Click below to open
                  the AI agent in a new tab.
                </div>
                <B
                  className="sg-btn sg-btn-saffron"
                  style={{ fontSize: "14px", padding: "11px 26px" }}
                  onClick={() =>
                    window.open(
                      "https://www.jotform.com/agent/019d733c25a178878c98d2bc0ca317eed8c7",
                      "_blank",
                    )
                  }
                >
                  🤖 Open JotForm AI Agent ↗
                </B>
                <div style={{ display: "flex", gap: "24px", marginTop: "8px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: "Syne",
                        fontWeight: 800,
                        fontSize: "20px",
                        color: "var(--saffron)",
                      }}
                    >
                      6
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Questions
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: "Syne",
                        fontWeight: 800,
                        fontSize: "20px",
                        color: "var(--leaf)",
                      }}
                    >
                      AI
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Powered
                    </div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontFamily: "Syne",
                        fontWeight: 800,
                        fontSize: "20px",
                        color: "var(--turmeric)",
                      }}
                    >
                      24/7
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Available
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* LIVE APP */}
          <div
            className={`sg-panel${activePanel === "live-app" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">🚀 Live Platform</div>
                <div className="sg-sec-sub">
                  Your deployed AI Business Autopilot — running live at
                  caffeine.xyz
                </div>
              </div>
            </div>
            <div className="sg-hero sg-hero-leaf sg-mb-4">
              <div>
                <h2>AI Business Autopilot — Live</h2>
                <p>
                  Fully deployed platform with AI receptionist, lead management,
                  and chat. Running 24/7.
                </p>
              </div>
              <div className="sg-hero-btns">
                <B
                  className="sg-hb-w"
                  style={{ color: "var(--leaf)" }}
                  onClick={() =>
                    window.open(
                      "https://ai-business-autopilot-rv5.caffeine.xyz",
                      "_blank",
                    )
                  }
                >
                  ↗ Open Full Screen
                </B>
                <B className="sg-hb-o" onClick={() => showPanel("dashboard")}>
                  View Analytics
                </B>
              </div>
            </div>
            <div className="sg-link-preview">
              <div className="sg-lp-head">
                <div className="sg-lp-logo" style={{ background: "#F0FDF4" }}>
                  🚀
                </div>
                <div className="sg-lp-info">
                  <h3>AI Business Autopilot — Spice Garden</h3>
                  <p style={{ color: "var(--muted)", fontSize: "12px" }}>
                    ai-business-autopilot-rv5.caffeine.xyz
                  </p>
                </div>
                <div className="sg-lp-acts">
                  <span className="sg-badge sg-b-leaf">● Deployed</span>
                  <B
                    className="sg-btn sg-btn-leaf sg-btn-sm"
                    onClick={() =>
                      window.open(
                        "https://ai-business-autopilot-rv5.caffeine.xyz",
                        "_blank",
                      )
                    }
                  >
                    Open ↗
                  </B>
                </div>
              </div>
              <div
                className="sg-iframe-bar"
                style={{ background: "var(--leaf)" }}
              >
                <div className="sg-iframe-dots">
                  <div className="sg-iframe-dot" />
                  <div className="sg-iframe-dot" />
                  <div className="sg-iframe-dot" />
                </div>
                <div className="sg-iframe-url">
                  https://ai-business-autopilot-rv5.caffeine.xyz
                </div>
              </div>
              <iframe
                src="https://ai-business-autopilot-rv5.caffeine.xyz"
                title="AI Business Autopilot"
                height={580}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                loading="lazy"
                style={{ width: "100%", border: "none", display: "block" }}
              />
              <div
                style={{
                  padding: "12px 18px",
                  background: "var(--cream)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                  ⚡ Powered by Caffeine · AI Business Autopilot v1
                </span>
                <B
                  className="sg-btn sg-btn-leaf sg-btn-sm"
                  onClick={() =>
                    window.open(
                      "https://ai-business-autopilot-rv5.caffeine.xyz",
                      "_blank",
                    )
                  }
                >
                  Open Full Screen ↗
                </B>
              </div>
            </div>
          </div>

          {/* DASHBOARD */}
          <div
            className={`sg-panel${activePanel === "dashboard" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">Live Monitoring Dashboard</div>
                <div className="sg-sec-sub">
                  Real-time footfall, orders, and revenue — updates every 5
                  seconds
                </div>
              </div>
              <div className="sg-sec-actions">
                <B
                  className="sg-btn sg-btn-outline sg-btn-sm"
                  onClick={() => showPanel("jotform")}
                >
                  🤖 JotForm AI ↗
                </B>
                <B
                  className="sg-btn sg-btn-leaf sg-btn-sm"
                  onClick={() => showPanel("live-app")}
                >
                  🚀 Live App ↗
                </B>
                <B className="sg-btn sg-btn-ghost sg-btn-sm" onClick={openChat}>
                  💬 AI Chat
                </B>
              </div>
            </div>
            <div className="sg-grid-4 sg-mb-4">
              <div className="sg-metric sg-m-saffron">
                <div className="sg-m-label">Customers Today</div>
                <div className="sg-m-val">{totalCustomers}</div>
                <div className="sg-m-up">↑ 12% vs yesterday</div>
                <div className="sg-m-icon">👥</div>
              </div>
              <div className="sg-metric sg-m-leaf">
                <div className="sg-m-label">Active Now</div>
                <div className="sg-m-val">{activeCount}</div>
                <div className="sg-m-up">↑ Peak hour</div>
                <div className="sg-m-icon">🟢</div>
              </div>
              <div className="sg-metric sg-m-turmeric">
                <div className="sg-m-label">Orders / Hour</div>
                <div className="sg-m-val">{ordersToday || ordersPerHour}</div>
                <div className="sg-m-up">↑ 8% above avg</div>
                <div className="sg-m-icon">📋</div>
              </div>
              <div className="sg-metric sg-m-chili">
                <div className="sg-m-label">Revenue Today</div>
                <div className="sg-m-val">
                  ₹
                  {totalRevenue >= 1000
                    ? `${(totalRevenue / 1000).toFixed(1)}K`
                    : totalRevenue}
                </div>
                <div className="sg-m-up">↑ ₹2.1K vs avg</div>
                <div className="sg-m-icon">💰</div>
              </div>
            </div>
            <div className="sg-grid-2 sg-mb-4">
              <div className="sg-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "Syne", fontWeight: 700 }}>
                      Footfall Trend
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Customers per hour today
                    </div>
                  </div>
                  <span className="sg-badge sg-b-live">● Live</span>
                </div>
                <div className="sg-chart-wrap" style={{ height: "190px" }}>
                  <canvas id="c-footfall" />
                </div>
              </div>
              <div className="sg-card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "14px",
                  }}
                >
                  <div>
                    <div style={{ fontFamily: "Syne", fontWeight: 700 }}>
                      Orders Per Hour
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                      Peak: 1PM–3PM 🔥
                    </div>
                  </div>
                  <span className="sg-badge sg-b-turmeric">Peak</span>
                </div>
                <div className="sg-chart-wrap" style={{ height: "190px" }}>
                  <canvas id="c-ordhr" />
                </div>
              </div>
            </div>
            <div className="sg-card">
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 700,
                  marginBottom: "10px",
                }}
              >
                🔴 Live Customer Feed
              </div>
              <div className="sg-live-feed">
                <div className="sg-fi">
                  <div
                    className="sg-fdot"
                    style={{ background: "var(--leaf)" }}
                  />
                  <span>
                    <strong>Priya S.</strong> ordered Paneer Butter Masala +
                    Naan · ₹340
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      fontSize: "11px",
                    }}
                  >
                    now
                  </span>
                </div>
                <div className="sg-fi">
                  <div
                    className="sg-fdot"
                    style={{ background: "var(--saffron)" }}
                  />
                  <span>
                    <strong>Rahul M.</strong> left 5★ feedback — "Amazing dal
                    makhani!"
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      fontSize: "11px",
                    }}
                  >
                    2m
                  </span>
                </div>
                <div className="sg-fi">
                  <div
                    className="sg-fdot"
                    style={{ background: "var(--turmeric)" }}
                  />
                  <span>
                    <strong>New customer</strong> placed first order via JotForm
                    AI Agent
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      fontSize: "11px",
                    }}
                  >
                    4m
                  </span>
                </div>
                <div className="sg-fi">
                  <div
                    className="sg-fdot"
                    style={{ background: "var(--leaf)" }}
                  />
                  <span>
                    <strong>Anita K.</strong> redeemed 15% loyalty discount ·
                    ₹280 saved
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      fontSize: "11px",
                    }}
                  >
                    6m
                  </span>
                </div>
                <div className="sg-fi">
                  <div
                    className="sg-fdot"
                    style={{ background: "var(--chili)" }}
                  />
                  <span>
                    ⚠️ <strong>AI Alert:</strong> Table 7 waiting 22 min — send
                    apology offer?
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                      fontSize: "11px",
                    }}
                  >
                    8m
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* PAYMENTS */}
          <div
            className={`sg-panel${activePanel === "payments" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">💳 Payment History</div>
                <div className="sg-sec-sub">
                  Complete transaction ledger with PDF export and smart filters
                </div>
              </div>
              <div className="sg-sec-actions">
                <B
                  className="sg-btn sg-btn-ghost sg-btn-sm"
                  onClick={exportAllPDF}
                >
                  ⬇ Export All PDF
                </B>
                <B
                  className="sg-btn sg-btn-saffron sg-btn-sm"
                  onClick={exportAllPDF}
                >
                  📄 Download Report
                </B>
              </div>
            </div>
            <div className="sg-pay-stats">
              <div className="sg-metric sg-m-saffron">
                <div className="sg-m-label">Total Revenue</div>
                <div className="sg-m-val" style={{ color: "var(--saffron)" }}>
                  ₹2.84L
                </div>
                <div className="sg-m-up">↑ 18% this month</div>
                <div className="sg-m-icon">💰</div>
              </div>
              <div className="sg-metric sg-m-leaf">
                <div className="sg-m-label">Transactions</div>
                <div className="sg-m-val" style={{ color: "var(--leaf)" }}>
                  847
                </div>
                <div className="sg-m-up">↑ 124 this week</div>
                <div className="sg-m-icon">🧾</div>
              </div>
              <div className="sg-metric sg-m-turmeric">
                <div className="sg-m-label">Avg Order Value</div>
                <div className="sg-m-val" style={{ color: "var(--turmeric)" }}>
                  ₹336
                </div>
                <div className="sg-m-up">↑ ₹24 vs last month</div>
                <div className="sg-m-icon">📊</div>
              </div>
              <div className="sg-metric sg-m-chili">
                <div className="sg-m-label">Refunds</div>
                <div className="sg-m-val" style={{ color: "var(--chili)" }}>
                  ₹3,840
                </div>
                <div className="sg-m-down">↑ 2 refunds today</div>
                <div className="sg-m-icon">↩</div>
              </div>
            </div>
            <div className="sg-grid-2 sg-mb-4">
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "14px",
                  }}
                >
                  Revenue Trend (30 Days)
                </div>
                <div className="sg-chart-wrap" style={{ height: "190px" }}>
                  <canvas id="c-paytrend" />
                </div>
              </div>
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "14px",
                  }}
                >
                  Payment Methods
                </div>
                <div className="sg-chart-wrap" style={{ height: "190px" }}>
                  <canvas id="c-paymethods" />
                </div>
              </div>
            </div>
            <div className="sg-filter-bar">
              <div className="sg-filter-group">
                <span className="sg-filter-label">Status:</span>
                {["all", "paid", "pending", "refunded"].map((s) => (
                  <B
                    key={s}
                    className={`sg-filter-pill${activeStatusFilter === s ? " active" : ""}`}
                    onClick={() => {
                      setActiveStatusFilter(s);
                      applyFilters(s, activeMethodFilter, searchQuery);
                    }}
                  >
                    {s === "all"
                      ? "All"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                  </B>
                ))}
              </div>
              <div className="sg-filter-group">
                <span className="sg-filter-label">Method:</span>
                {[
                  { val: "all-m", label: "All" },
                  ...METHODS.map((m) => ({ val: m, label: m })),
                ].map((m) => (
                  <B
                    key={m.val}
                    className={`sg-filter-pill${activeMethodFilter === m.val ? " active" : ""}`}
                    onClick={() => {
                      setActiveMethodFilter(m.val);
                      applyFilters(activeStatusFilter, m.val, searchQuery);
                    }}
                  >
                    {m.label}
                  </B>
                ))}
              </div>
              <input
                className="sg-search-inp"
                type="text"
                placeholder="🔍 Search customer…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  applyFilters(
                    activeStatusFilter,
                    activeMethodFilter,
                    e.target.value,
                  );
                }}
              />
            </div>
            <div className="sg-pay-table-wrap">
              <div className="sg-pay-table-head">
                <div className="sg-pay-table-title">Transaction Log</div>
                <div className="sg-pay-table-actions">
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Showing {Math.min(PER_PAGE, pageSlice.length)} of {total}{" "}
                    transactions
                  </span>
                  <B
                    className="sg-btn sg-btn-ghost sg-btn-sm"
                    onClick={exportFilteredPDF}
                  >
                    📄 Export Filtered
                  </B>
                  <B
                    className="sg-btn sg-btn-saffron sg-btn-sm"
                    onClick={exportAllPDF}
                  >
                    ⬇ Download All
                  </B>
                </div>
              </div>
              <div className="sg-tbl-wrap">
                <table className="sg-pay-tbl">
                  <thead>
                    <tr>
                      <th>Txn ID</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date &amp; Time</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageSlice.map((p) => {
                      const sc =
                        {
                          paid: "sg-ps-paid sg-b-leaf",
                          pending: "sg-ps-pending sg-b-turmeric",
                          refunded: "sg-ps-refunded sg-b-chili",
                          partial: "sg-ps-partial sg-b-saffron",
                        }[p.status] || "sg-b-gray";
                      const mic =
                        {
                          UPI: "sg-mi-upi",
                          Card: "sg-mi-card",
                          Cash: "sg-mi-cash",
                          Wallet: "sg-mi-wallet",
                        }[p.method] || "sg-mi-upi";
                      const ms =
                        p.method === "UPI"
                          ? "₹"
                          : p.method === "Card"
                            ? "💳"
                            : "₹";
                      const ini = p.customer.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("");
                      return (
                        <tr key={p.id}>
                          <td>
                            <div className="sg-pay-id">#{p.id}</div>
                          </td>
                          <td>
                            <div className="sg-pay-customer">
                              <div
                                className="sg-pay-avatar"
                                style={{ background: p.customer.avatar }}
                              >
                                {ini}
                              </div>
                              <div>
                                <div className="sg-pay-cname">
                                  {p.customer.name}
                                </div>
                                <div className="sg-pay-cphone">
                                  {p.customer.phone}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="sg-pay-items" title={p.items}>
                              {p.items}
                            </div>
                          </td>
                          <td>
                            <div className="sg-pay-amount">
                              ₹{p.amount.toLocaleString("en-IN")}
                            </div>
                            {p.discount > 0 && (
                              <div
                                style={{
                                  fontSize: "10px",
                                  color: "var(--leaf)",
                                  fontWeight: 600,
                                  marginTop: "2px",
                                }}
                              >
                                −₹{p.discount} off
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="sg-pay-method">
                              <div className={`sg-method-icon ${mic}`}>
                                {ms}
                              </div>
                              {p.method}
                            </div>
                          </td>
                          <td>
                            <div className="sg-pay-date">
                              {p.date.toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </div>
                            <div className="sg-pay-time">
                              {p.date.toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </td>
                          <td>
                            <span className={`sg-badge ${sc}`}>
                              {STATUS_LABELS[p.status]}
                            </span>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <B
                                className="sg-pay-dl-btn"
                                title="Download Receipt"
                                onClick={() => downloadSingleReceipt(p)}
                              >
                                📄
                              </B>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="sg-pagination">
                <span>
                  Page {currentPage} of {pages} · {start + 1}–
                  {Math.min(start + PER_PAGE, total)} of {total} entries
                </span>
                <div className="sg-page-btns">
                  <B
                    className="sg-page-btn"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </B>
                  {renderPageBtns().map((p, i) => (
                    <B
                      key={`page-${i}-${p}`}
                      className={`sg-page-btn${p === currentPage ? " active" : ""}`}
                      disabled={p === "…"}
                      onClick={() => typeof p === "number" && setCurrentPage(p)}
                    >
                      {p}
                    </B>
                  ))}
                  <B
                    className="sg-page-btn"
                    disabled={currentPage === pages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(pages, p + 1))
                    }
                  >
                    ›
                  </B>
                </div>
              </div>
            </div>
          </div>

          {/* FEEDBACK */}
          <div
            className={`sg-panel${activePanel === "feedback" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">Customer Feedback Analysis</div>
                <div className="sg-sec-sub">
                  AI-classified sentiment, complaints, and improvement
                  suggestions
                </div>
              </div>
            </div>
            <div className="sg-grid-3 sg-mb-4">
              <div className="sg-card" style={{ textAlign: "center" }}>
                <div
                  className="sg-m-val"
                  style={{
                    color: "var(--leaf)",
                    fontFamily: "Syne",
                    fontSize: "28px",
                    fontWeight: 800,
                  }}
                >
                  68%
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    margin: "4px 0 8px",
                  }}
                >
                  Positive
                </div>
                <div className="sg-bar">
                  <div
                    className="sg-bar-fill sg-bf-leaf"
                    style={{ width: "68%" }}
                  />
                </div>
              </div>
              <div className="sg-card" style={{ textAlign: "center" }}>
                <div
                  className="sg-m-val"
                  style={{
                    color: "var(--chili)",
                    fontFamily: "Syne",
                    fontSize: "28px",
                    fontWeight: 800,
                  }}
                >
                  21%
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    margin: "4px 0 8px",
                  }}
                >
                  Negative
                </div>
                <div className="sg-bar">
                  <div
                    className="sg-bar-fill sg-bf-chili"
                    style={{ width: "21%" }}
                  />
                </div>
              </div>
              <div className="sg-card" style={{ textAlign: "center" }}>
                <div
                  className="sg-m-val"
                  style={{
                    color: "var(--turmeric)",
                    fontFamily: "Syne",
                    fontSize: "28px",
                    fontWeight: 800,
                  }}
                >
                  11%
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    margin: "4px 0 8px",
                  }}
                >
                  Neutral
                </div>
                <div className="sg-bar">
                  <div
                    className="sg-bar-fill sg-bf-turmeric"
                    style={{ width: "11%" }}
                  />
                </div>
              </div>
            </div>
            <div className="sg-grid-2 sg-mb-4">
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  Sentiment Donut
                </div>
                <div className="sg-chart-wrap" style={{ height: "200px" }}>
                  <canvas id="c-sentiment" />
                </div>
              </div>
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  Top Complaints
                </div>
                <div className="sg-chart-wrap" style={{ height: "200px" }}>
                  <canvas id="c-complaints" />
                </div>
              </div>
            </div>
            <div className="sg-card sg-mb-4">
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                Recent Classified Feedback
              </div>
              <div className="sg-fb sg-fb-pos">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span className="sg-badge sg-b-leaf">Positive</span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Priya S. · 10 min
                  </span>
                </div>
                <div style={{ fontSize: "13px" }}>
                  "Amazing food! The dal makhani was perfect. Will definitely be
                  back."
                </div>
              </div>
              <div className="sg-fb sg-fb-neg">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span className="sg-badge sg-b-chili">Negative</span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Akash R. · 25 min
                  </span>
                </div>
                <div style={{ fontSize: "13px" }}>
                  "Waited 35 minutes, food arrived cold. Really disappointed."
                </div>
              </div>
              <div className="sg-fb sg-fb-neu">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: "5px",
                  }}
                >
                  <span className="sg-badge sg-b-turmeric">Neutral</span>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Meera K. · 1h
                  </span>
                </div>
                <div style={{ fontSize: "13px" }}>
                  "It was okay. Service decent, food average today."
                </div>
              </div>
            </div>
            <div className="sg-card">
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                🤖 AI Improvement Suggestions
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div className="sg-ai-ic">
                  <div className="sg-ai-tag">Priority 1</div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Reduce wait times
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Add 2 prep staff 1–3PM. Est. wait reduction: 40%.
                  </div>
                </div>
                <div className="sg-ai-ic">
                  <div className="sg-ai-tag">Priority 2</div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Food temperature alerts
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Delivery confirm within 8 min of prep.
                  </div>
                </div>
                <div className="sg-ai-ic">
                  <div className="sg-ai-tag">Priority 3</div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Proactive follow-up
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Auto-send apology within 5 min of negative feedback.
                  </div>
                </div>
                <div className="sg-ai-ic">
                  <div className="sg-ai-tag">Priority 4</div>
                  <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                    Review collection
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                    Ask happy customers for Google review. Target 4.8★.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ORDERS */}
          <div
            className={`sg-panel${activePanel === "orders" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">Orders &amp; Smart Discounts</div>
                <div className="sg-sec-sub">
                  AI identifies frequent customers and triggers personalised
                  offers automatically
                </div>
              </div>
            </div>
            <div className="sg-grid-3 sg-mb-4">
              <div className="sg-disc-card">
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--saffron)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: "6px",
                  }}
                >
                  🎯 AI Offer
                </div>
                <div style={{ fontWeight: 700, marginBottom: "3px" }}>
                  Priya Sharma
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Ordered Paneer Butter Masala 6×
                </div>
                <div
                  style={{
                    marginTop: "9px",
                    padding: "8px",
                    background: "var(--leaf-dim)",
                    borderRadius: "7px",
                    fontSize: "12px",
                    color: "var(--leaf)",
                    fontWeight: 600,
                  }}
                >
                  "You ordered this before — 15% off today!"
                </div>
                <B
                  className="sg-btn sg-btn-leaf"
                  style={{
                    width: "100%",
                    marginTop: "9px",
                    justifyContent: "center",
                    fontSize: "12px",
                  }}
                >
                  Send via WhatsApp
                </B>
              </div>
              <div className="sg-disc-card">
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--saffron)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: "6px",
                  }}
                >
                  🎯 VIP Offer
                </div>
                <div style={{ fontWeight: 700, marginBottom: "3px" }}>
                  Rahul Mehta
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  VIP — 18 visits this month
                </div>
                <div
                  style={{
                    marginTop: "9px",
                    padding: "8px",
                    background: "var(--leaf-dim)",
                    borderRadius: "7px",
                    fontSize: "12px",
                    color: "var(--leaf)",
                    fontWeight: 600,
                  }}
                >
                  "Your loyalty = 20% off next order. We value you!"
                </div>
                <B
                  className="sg-btn sg-btn-leaf"
                  style={{
                    width: "100%",
                    marginTop: "9px",
                    justifyContent: "center",
                    fontSize: "12px",
                  }}
                >
                  Send via WhatsApp
                </B>
              </div>
              <div
                className="sg-disc-card"
                style={{
                  borderColor: "rgba(212,160,23,.35)",
                  background: "rgba(212,160,23,.04)",
                }}
              >
                <div
                  style={{
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "var(--turmeric)",
                    textTransform: "uppercase",
                    letterSpacing: ".08em",
                    marginBottom: "6px",
                  }}
                >
                  ⚠️ Win-Back
                </div>
                <div style={{ fontWeight: 700, marginBottom: "3px" }}>
                  Anita Kumar
                </div>
                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                  Last visit: 18 days ago
                </div>
                <div
                  style={{
                    marginTop: "9px",
                    padding: "8px",
                    background: "var(--turmeric-dim)",
                    borderRadius: "7px",
                    fontSize: "12px",
                    color: "var(--turmeric)",
                    fontWeight: 600,
                  }}
                >
                  "We miss you! Free dessert on your next visit."
                </div>
                <B
                  className="sg-btn sg-btn-saffron"
                  style={{
                    width: "100%",
                    marginTop: "9px",
                    justifyContent: "center",
                    fontSize: "12px",
                  }}
                >
                  Send Win-Back SMS
                </B>
              </div>
            </div>
            <div className="sg-card">
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                Customer Order History
              </div>
              <table className="sg-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Visits</th>
                    <th>Favourite</th>
                    <th>Last Visit</th>
                    <th>Total Spend</th>
                    <th>AI Discount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Priya Sharma</strong>
                    </td>
                    <td>24</td>
                    <td>Paneer Butter Masala</td>
                    <td>Today</td>
                    <td>₹8,420</td>
                    <td>
                      <span className="sg-badge sg-b-leaf">15% Off</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Rahul Mehta</strong>
                    </td>
                    <td>18</td>
                    <td>Dal Makhani + Naan</td>
                    <td>Today</td>
                    <td>₹12,180</td>
                    <td>
                      <span className="sg-badge sg-b-saffron">VIP 20%</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Anita Kumar</strong>
                    </td>
                    <td>9</td>
                    <td>Chicken Tikka</td>
                    <td>18d ago</td>
                    <td>₹3,290</td>
                    <td>
                      <span className="sg-badge sg-b-turmeric">Win-Back</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Suresh Nair</strong>
                    </td>
                    <td>7</td>
                    <td>Biryani Special</td>
                    <td>3d ago</td>
                    <td>₹2,870</td>
                    <td>
                      <span className="sg-badge sg-b-leaf">10% Off</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Kavya Reddy</strong>
                    </td>
                    <td>3</td>
                    <td>Masala Dosa</td>
                    <td>1d ago</td>
                    <td>₹940</td>
                    <td>
                      <span className="sg-badge sg-b-gray">New</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SEGMENTS */}
          <div
            className={`sg-panel${activePanel === "segments" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">Customer Segmentation</div>
                <div className="sg-sec-sub">
                  Age group and gender breakdown with AI-powered campaign
                  recommendations
                </div>
              </div>
            </div>
            <div className="sg-grid-2 sg-mb-4">
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  Age Group Distribution
                </div>
                <div className="sg-chart-wrap" style={{ height: "220px" }}>
                  <canvas id="c-age" />
                </div>
              </div>
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  Gender Split
                </div>
                <div className="sg-chart-wrap" style={{ height: "220px" }}>
                  <canvas id="c-gender" />
                </div>
              </div>
            </div>
            <div className="sg-grid-3">
              <div className="sg-card sg-card-sm">
                <div style={{ fontSize: "20px", marginBottom: "7px" }}>
                  🧑‍🎓
                </div>
                <div style={{ fontWeight: 700 }}>Below 20</div>
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 800,
                    fontSize: "22px",
                    color: "var(--saffron)",
                    margin: "4px 0",
                  }}
                >
                  18%
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    marginBottom: "8px",
                  }}
                >
                  44 customers
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    padding: "8px",
                    background: "var(--cream)",
                    borderRadius: "7px",
                    color: "var(--muted)",
                  }}
                >
                  🤖 Target: student combos, social media, lunch deals
                </div>
              </div>
              <div
                className="sg-card sg-card-sm"
                style={{
                  borderColor: "rgba(26,122,74,.2)",
                  background: "rgba(26,122,74,.02)",
                }}
              >
                <div style={{ fontSize: "20px", marginBottom: "7px" }}>
                  👨‍💼
                </div>
                <div style={{ fontWeight: 700 }}>
                  Age 21–35{" "}
                  <span
                    className="sg-badge sg-b-saffron"
                    style={{ fontSize: "10px", marginLeft: "4px" }}
                  >
                    Primary
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 800,
                    fontSize: "22px",
                    color: "var(--leaf)",
                    margin: "4px 0",
                  }}
                >
                  52%
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    marginBottom: "8px",
                  }}
                >
                  128 customers
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    padding: "8px",
                    background: "var(--leaf-dim)",
                    borderRadius: "7px",
                    color: "var(--leaf)",
                  }}
                >
                  🤖 Target: loyalty app, quick lunch, weekend specials
                </div>
              </div>
              <div className="sg-card sg-card-sm">
                <div style={{ fontSize: "20px", marginBottom: "7px" }}>👴</div>
                <div style={{ fontWeight: 700 }}>Age 36–100</div>
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 800,
                    fontSize: "22px",
                    color: "var(--turmeric)",
                    margin: "4px 0",
                  }}
                >
                  30%
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--muted)",
                    marginBottom: "8px",
                  }}
                >
                  75 customers
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    padding: "8px",
                    background: "var(--turmeric-dim)",
                    borderRadius: "7px",
                    color: "var(--turmeric)",
                  }}
                >
                  🤖 Target: family meals, health menus, senior discounts
                </div>
              </div>
            </div>
          </div>

          {/* ANALYTICS */}
          <div
            className={`sg-panel${activePanel === "analytics" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">Visual Analytics</div>
                <div className="sg-sec-sub">
                  Sales trends, return rates, and revenue by category
                </div>
              </div>
            </div>
            <div className="sg-grid-4 sg-mb-4">
              <div className="sg-metric sg-m-saffron">
                <div className="sg-m-label">Avg Order Value</div>
                <div className="sg-m-val" style={{ color: "var(--saffron)" }}>
                  ₹342
                </div>
                <div className="sg-m-up">↑ 7%</div>
                <div className="sg-m-icon">💳</div>
              </div>
              <div className="sg-metric sg-m-leaf">
                <div className="sg-m-label">Return Rate</div>
                <div className="sg-m-val" style={{ color: "var(--leaf)" }}>
                  73%
                </div>
                <div className="sg-m-up">↑ 4%</div>
                <div className="sg-m-icon">🔁</div>
              </div>
              <div className="sg-metric sg-m-turmeric">
                <div className="sg-m-label">Weekly Revenue</div>
                <div className="sg-m-val" style={{ color: "var(--turmeric)" }}>
                  ₹1.2L
                </div>
                <div className="sg-m-up">↑ 15%</div>
                <div className="sg-m-icon">📈</div>
              </div>
              <div className="sg-metric sg-m-chili">
                <div className="sg-m-label">NPS Score</div>
                <div className="sg-m-val" style={{ color: "var(--chili)" }}>
                  72
                </div>
                <div className="sg-m-up">↑ 5 pts</div>
                <div className="sg-m-icon">⭐</div>
              </div>
            </div>
            <div className="sg-grid-2 sg-mb-4">
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  Weekly Sales Trend
                </div>
                <div className="sg-chart-wrap" style={{ height: "200px" }}>
                  <canvas id="c-sales" />
                </div>
              </div>
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "12px",
                  }}
                >
                  Monthly Return Rate
                </div>
                <div className="sg-chart-wrap" style={{ height: "200px" }}>
                  <canvas id="c-return" />
                </div>
              </div>
            </div>
            <div className="sg-card">
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                Revenue by Category
              </div>
              <div className="sg-chart-wrap" style={{ height: "190px" }}>
                <canvas id="c-revcat" />
              </div>
            </div>
          </div>

          {/* INTELLIGENCE */}
          <div
            className={`sg-panel${activePanel === "intelligence" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">AI Intelligence Layer</div>
                <div className="sg-sec-sub">
                  Predictive return probability and automated campaign
                  recommendations
                </div>
              </div>
            </div>
            <div className="sg-grid-2">
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "14px",
                  }}
                >
                  Return Probability Predictions
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                  }}
                >
                  {[
                    {
                      name: "Priya Sharma",
                      sub: "Today · 24 visits",
                      pct: 96,
                      color: "leaf",
                    },
                    {
                      name: "Rahul Mehta",
                      sub: "Today · 18 visits",
                      pct: 91,
                      color: "leaf",
                    },
                    {
                      name: "Suresh Nair",
                      sub: "3d ago · 7 visits",
                      pct: 67,
                      color: "turmeric",
                    },
                    {
                      name: "Anita Kumar",
                      sub: "18d ago · 9 visits",
                      pct: 23,
                      color: "chili",
                    },
                    {
                      name: "Kavya Reddy",
                      sub: "1d ago · 3 visits",
                      pct: 58,
                      color: "saffron",
                    },
                  ].map((c) => (
                    <div
                      key={c.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>
                          {c.name}
                        </div>
                        <div
                          style={{ fontSize: "11px", color: "var(--muted)" }}
                        >
                          {c.sub}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: `var(--${c.color})`,
                          }}
                        >
                          {c.pct}%
                        </div>
                        <div
                          className="sg-bar"
                          style={{ width: "90px", marginTop: "4px" }}
                        >
                          <div
                            className={`sg-bar-fill sg-bf-${c.color}`}
                            style={{ width: `${c.pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="sg-card">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    marginBottom: "14px",
                  }}
                >
                  Campaign Queue
                </div>
                <div className="sg-ai-ic">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        Send discount to 21–35 segment
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        128 customers · Est. ↑₹22K revenue
                      </div>
                    </div>
                    <span className="sg-badge sg-b-leaf">High ROI</span>
                  </div>
                  <div className="sg-bar">
                    <div
                      className="sg-bar-fill sg-bf-leaf"
                      style={{ width: "88%" }}
                    />
                  </div>
                </div>
                <div className="sg-ai-ic">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        Win-back lapsing customers
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        12 at risk · Free dessert offer
                      </div>
                    </div>
                    <span className="sg-badge sg-b-turmeric">Urgent</span>
                  </div>
                  <div className="sg-bar">
                    <div
                      className="sg-bar-fill sg-bf-turmeric"
                      style={{ width: "74%" }}
                    />
                  </div>
                </div>
                <div className="sg-ai-ic">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        Student combo — below 20
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        44 students · Weekend lunch
                      </div>
                    </div>
                    <span className="sg-badge sg-b-saffron">New</span>
                  </div>
                  <div className="sg-bar">
                    <div
                      className="sg-bar-fill sg-bf-saffron"
                      style={{ width: "55%" }}
                    />
                  </div>
                </div>
                <div className="sg-ai-ic">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "8px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        Ask happy customers for review
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                        68 positive · Google review link
                      </div>
                    </div>
                    <span className="sg-badge sg-b-leaf">Auto</span>
                  </div>
                  <div className="sg-bar">
                    <div
                      className="sg-bar-fill sg-bf-leaf"
                      style={{ width: "92%" }}
                    />
                  </div>
                </div>
                <B
                  className="sg-btn sg-btn-saffron"
                  style={{
                    width: "100%",
                    marginTop: "10px",
                    justifyContent: "center",
                  }}
                >
                  ⚡ Launch All Campaigns
                </B>
              </div>
            </div>
          </div>

          {/* MOOD */}
          <div className={`sg-panel${activePanel === "mood" ? " active" : ""}`}>
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">⚡ Mood-Based Sales Engine</div>
                <div className="sg-sec-sub">
                  AI detects customer mood from messages — triggers automated
                  responses instantly
                </div>
              </div>
            </div>
            <div className="sg-grid-2 sg-mb-4">
              <div className="sg-mood-card sg-mood-sad">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    color: "#991B1B",
                    marginBottom: "10px",
                  }}
                >
                  😠 Unhappy Customer Flow
                </div>
                <div className="sg-mood-flow">
                  <div className="sg-mf-box sg-mf-red">Negative</div>
                  <div style={{ color: "var(--muted)", fontSize: "16px" }}>
                    →
                  </div>
                  <div className="sg-mf-box sg-mf-blue">AI Detects</div>
                  <div style={{ color: "var(--muted)", fontSize: "16px" }}>
                    →
                  </div>
                  <div className="sg-mf-box sg-mf-red">Apology</div>
                  <div style={{ color: "var(--muted)", fontSize: "16px" }}>
                    →
                  </div>
                  <div className="sg-mf-box sg-mf-green">30% Off</div>
                </div>
                <div
                  style={{
                    padding: "10px",
                    background: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    border: "1px solid #FECACA",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                    Auto-Message Sent:
                  </div>
                  <div style={{ color: "var(--muted)" }}>
                    "We're so sorry, Akash. Please accept 30% off your next
                    visit — we'll make it right! 🙏"
                  </div>
                  <div
                    style={{ marginTop: "8px", display: "flex", gap: "6px" }}
                  >
                    <span className="sg-badge sg-b-leaf">WhatsApp Sent</span>
                    <span className="sg-badge sg-b-turmeric">
                      Recovery: 78%
                    </span>
                  </div>
                </div>
              </div>
              <div className="sg-mood-card sg-mood-happy">
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 700,
                    color: "#166534",
                    marginBottom: "10px",
                  }}
                >
                  😊 Happy Customer Flow
                </div>
                <div className="sg-mood-flow">
                  <div className="sg-mf-box sg-mf-green">Positive</div>
                  <div style={{ color: "var(--muted)", fontSize: "16px" }}>
                    →
                  </div>
                  <div className="sg-mf-box sg-mf-blue">AI Detects</div>
                  <div style={{ color: "var(--muted)", fontSize: "16px" }}>
                    →
                  </div>
                  <div className="sg-mf-box sg-mf-green">Review Ask</div>
                  <div style={{ color: "var(--muted)", fontSize: "16px" }}>
                    →
                  </div>
                  <div className="sg-mf-box sg-mf-green">Referral</div>
                </div>
                <div
                  style={{
                    padding: "10px",
                    background: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    border: "1px solid #BBF7D0",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                    Auto-Message Sent:
                  </div>
                  <div style={{ color: "var(--muted)" }}>
                    "So glad you loved it, Priya! 🌟 Quick Google review? Share
                    with a friend — you both get 10% off!"
                  </div>
                  <div
                    style={{ marginTop: "8px", display: "flex", gap: "6px" }}
                  >
                    <span className="sg-badge sg-b-leaf">WhatsApp Sent</span>
                    <span className="sg-badge sg-b-saffron">Referral: 34%</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="sg-card">
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 700,
                  marginBottom: "12px",
                }}
              >
                Automation Rules
              </div>
              <div className="sg-rule-row">
                <div className="sg-rule-trigger">
                  <span className="sg-badge sg-b-chili">Angry</span>
                </div>
                <div className="sg-rule-action">
                  Score &lt;2★ or keywords: "terrible","worst","cold","wait"
                </div>
                <div className="sg-rule-result">
                  Apology + 30% off · 78% recovery
                </div>
              </div>
              <div className="sg-rule-row">
                <div className="sg-rule-trigger">
                  <span className="sg-badge sg-b-turmeric">Frustrated</span>
                </div>
                <div className="sg-rule-action">
                  Score 3★ or "slow","average","okay"
                </div>
                <div className="sg-rule-result">
                  Sorry note + 15% off · 62% recovery
                </div>
              </div>
              <div className="sg-rule-row">
                <div className="sg-rule-trigger">
                  <span className="sg-badge sg-b-leaf">Happy</span>
                </div>
                <div className="sg-rule-action">
                  Score 5★ or "amazing","love","perfect"
                </div>
                <div className="sg-rule-result">
                  Review request + referral link
                </div>
              </div>
              <div className="sg-rule-row">
                <div className="sg-rule-trigger">
                  <span className="sg-badge sg-b-saffron">Lapsing</span>
                </div>
                <div className="sg-rule-action">No visit in 14+ days</div>
                <div className="sg-rule-result">
                  Win-back offer + free dessert
                </div>
              </div>
              <div className="sg-rule-row">
                <div className="sg-rule-trigger">
                  <span className="sg-badge sg-b-saffron">VIP</span>
                </div>
                <div className="sg-rule-action">10+ visits or ₹10K+ spend</div>
                <div className="sg-rule-result">
                  Exclusive VIP loyalty reward
                </div>
              </div>
            </div>
          </div>

          {/* CHATBOT PANEL */}
          <div
            className={`sg-panel${activePanel === "chatbot" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">AI Chatbot</div>
                <div className="sg-sec-sub">
                  6-question interactive journey — open the widget bottom-right
                  or use JotForm AI Agent
                </div>
              </div>
            </div>
            <div className="sg-grid-2 sg-mb-4" style={{ alignItems: "start" }}>
              <div
                className="sg-card"
                style={{ textAlign: "center", padding: "32px 24px" }}
              >
                <div style={{ fontSize: "52px", marginBottom: "12px" }}>🤖</div>
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 800,
                    fontSize: "18px",
                    marginBottom: "8px",
                  }}
                >
                  Internal AI Chatbot
                </div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: "13px",
                    marginBottom: "20px",
                  }}
                >
                  Built-in 6-question guided flow. Opens in the bottom-right
                  corner.
                </div>
                <B
                  className="sg-btn sg-btn-saffron"
                  style={{ fontSize: "14px", padding: "11px 22px" }}
                  onClick={openChat}
                >
                  Open AI Chat →
                </B>
              </div>
              <div
                className="sg-card"
                style={{ textAlign: "center", padding: "32px 24px" }}
              >
                <div style={{ fontSize: "52px", marginBottom: "12px" }}>📋</div>
                <div
                  style={{
                    fontFamily: "Syne",
                    fontWeight: 800,
                    fontSize: "18px",
                    marginBottom: "8px",
                  }}
                >
                  JotForm AI Agent
                </div>
                <div
                  style={{
                    color: "var(--muted)",
                    fontSize: "13px",
                    marginBottom: "20px",
                  }}
                >
                  External JotForm-powered AI agent for customer interactions
                  and lead capture.
                </div>
                <B
                  className="sg-btn sg-btn-leaf"
                  style={{ fontSize: "14px", padding: "11px 22px" }}
                  onClick={() =>
                    window.open(
                      "https://www.jotform.com/agent/019d733c25a178878c98d2bc0ca317eed8c7",
                      "_blank",
                    )
                  }
                >
                  Open JotForm Agent ↗
                </B>
              </div>
            </div>
          </div>

          {/* ARCHITECTURE */}
          <div
            className={`sg-panel${activePanel === "architecture" ? " active" : ""}`}
          >
            <div className="sg-sec-hd">
              <div>
                <div className="sg-sec-title">System Architecture</div>
                <div className="sg-sec-sub">
                  Full-stack AI platform including JotForm + live Caffeine
                  deployment
                </div>
              </div>
            </div>
            <div className="sg-card sg-mb-4">
              <div
                style={{
                  fontFamily: "Syne",
                  fontWeight: 700,
                  marginBottom: "18px",
                }}
              >
                Platform Architecture
              </div>
              <div className="sg-arch-flow">
                <div>
                  <div
                    className="sg-arch-node"
                    style={{
                      background: "var(--saffron-dim)",
                      color: "var(--saffron)",
                      border: "1px solid rgba(232,99,26,.2)",
                    }}
                  >
                    ⚛️ React Frontend
                    <br />
                    <span style={{ fontSize: "10px", fontWeight: 400 }}>
                      Dashboard + Chat
                    </span>
                  </div>
                </div>
                <div className="sg-arch-arr">→</div>
                <div>
                  <div
                    className="sg-arch-node"
                    style={{
                      background: "var(--turmeric-dim)",
                      color: "var(--turmeric)",
                      border: "1px solid rgba(212,160,23,.2)",
                    }}
                  >
                    🤖 JotForm AI
                    <br />
                    <span style={{ fontSize: "10px", fontWeight: 400 }}>
                      Customer Agent
                    </span>
                  </div>
                </div>
                <div className="sg-arch-arr">→</div>
                <div>
                  <div
                    className="sg-arch-node"
                    style={{
                      background: "var(--leaf-dim)",
                      color: "var(--leaf)",
                      border: "1px solid rgba(26,122,74,.2)",
                    }}
                  >
                    ☕ Caffeine.xyz
                    <br />
                    <span style={{ fontSize: "10px", fontWeight: 400 }}>
                      Live Deploy
                    </span>
                  </div>
                </div>
                <div className="sg-arch-arr">→</div>
                <div>
                  <div
                    className="sg-arch-node"
                    style={{
                      background: "var(--chili-dim)",
                      color: "var(--chili)",
                      border: "1px solid rgba(192,57,43,.2)",
                    }}
                  >
                    🗄️ PostgreSQL
                    <br />
                    <span style={{ fontSize: "10px", fontWeight: 400 }}>
                      Orders + CRM
                    </span>
                  </div>
                </div>
                <div className="sg-arch-arr">→</div>
                <div>
                  <div
                    className="sg-arch-node"
                    style={{ background: "var(--ink)", color: "#fff" }}
                  >
                    ⚡ AI + Auto
                    <br />
                    <span style={{ fontSize: "10px", fontWeight: 400 }}>
                      WhatsApp + SMS
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="sg-grid-3">
              <div className="sg-card sg-card-sm">
                <div style={{ fontWeight: 700, marginBottom: "9px" }}>
                  Frontend
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.9,
                    color: "var(--muted)",
                  }}
                >
                  React / Next.js
                  <br />
                  Tailwind CSS
                  <br />
                  Chart.js / Recharts
                  <br />
                  WebSocket live data
                </div>
              </div>
              <div className="sg-card sg-card-sm">
                <div style={{ fontWeight: 700, marginBottom: "9px" }}>
                  Backend + Database
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.9,
                    color: "var(--muted)",
                  }}
                >
                  Node.js / FastAPI
                  <br />
                  PostgreSQL + Redis
                  <br />
                  JWT Auth
                  <br />
                  Caffeine.xyz Deploy
                </div>
              </div>
              <div className="sg-card sg-card-sm">
                <div style={{ fontWeight: 700, marginBottom: "9px" }}>
                  AI + Integrations
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    lineHeight: 1.9,
                    color: "var(--muted)",
                  }}
                >
                  JotForm AI Agent
                  <br />
                  Claude API (Anthropic)
                  <br />
                  WhatsApp Business API
                  <br />
                  Sentiment ML Model
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CHATBOT WIDGET */}
      <div className={`sg-chat-win${chatOpen ? " open" : ""}`}>
        <div className="sg-chat-hdr">
          <div className="sg-chat-av">🍛</div>
          <div style={{ flex: 1 }}>
            <div className="sg-chat-hdr-name">Spice Garden AI</div>
            <div className="sg-chat-hdr-status">{chatStatus}</div>
          </div>
          <B className="sg-chat-close" onClick={() => setChatOpen(false)}>
            ✕
          </B>
        </div>
        <div className="sg-chat-prog">
          <div
            className="sg-chat-prog-fill"
            style={{ width: `${chatProgWidth}%` }}
          />
        </div>
        <div className="sg-chat-step-lbl">{chatStepLabel}</div>
        <div className="sg-chat-msgs" ref={chatMsgsRef}>
          {chatMessages.map((msg) =>
            msg.isTyping ? (
              <div key="typing-indicator" className="sg-typing-ind">
                <span />
                <span />
                <span />
              </div>
            ) : (
              <div
                key={`${msg.who}-${msg.ts}-${msg.text.slice(0, 10)}`}
                className={`sg-chat-msg ${msg.who}`}
              >
                <div
                  className={`sg-bubble ${msg.who}`} // biome-ignore lint/security/noDangerouslySetInnerHtml: chat bot formatted text
                  dangerouslySetInnerHTML={{
                    __html: msg.text
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br/>"),
                  }}
                />
                <div className="sg-chat-ts">{msg.ts}</div>
              </div>
            ),
          )}
        </div>
        <div className="sg-qr-zone">
          {quickReplies.map((r) => (
            <B key={r} className="sg-qr-btn" onClick={() => pick(r)}>
              {r}
            </B>
          ))}
        </div>
        {showDataPanel && (
          <div className="sg-chat-data-panel">
            <div className="sg-chat-data-title">Collected Data</div>
            {Object.entries(collectedData).map(([k, v]) => (
              <div key={k} className="sg-cdrow">
                <span className="sg-cdk">
                  {{
                    intent: "Intent",
                    ctype: "Customer",
                    looking: "Looking For",
                    exp: "Experience",
                    offer: "Offer",
                    contact: "Contact",
                  }[k] || k}
                </span>
                <span className="sg-cdv">{v.substring(0, 22)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="sg-chat-inp-area">
          <textarea
            className="sg-chat-inp"
            placeholder="Type here…"
            rows={1}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMsg();
              }
            }}
          />
          <B className="sg-chat-send" onClick={sendMsg}>
            ➤
          </B>
        </div>
      </div>
      <B
        className="sg-chat-fab"
        onClick={() => {
          if (chatOpen) setChatOpen(false);
          else openChat();
        }}
      >
        💬
      </B>

      {/* TOAST */}
      <div className={`sg-toast${toastVisible ? " show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
