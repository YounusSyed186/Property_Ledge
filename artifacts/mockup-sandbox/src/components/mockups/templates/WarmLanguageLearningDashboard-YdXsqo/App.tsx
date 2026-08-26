import { useState } from 'react';
import {
  Leaf, LayoutGrid, Package, Users, Receipt, Truck, Settings, Search, Bell,
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Filter, Download, ChevronDown,
  Sprout, CircleDollarSign, ShoppingBag, Repeat, Plus, Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

const GREEN = '#16352a';
const GREEN_2 = '#1f4a3a';
const MOSS = '#3f6b54';
const SAGE = '#7da183';
const CREAM = '#f6f1e7';
const CREAM_2 = '#efe8d8';
const GOLD = '#c9a24b';

const revenueData = {
  '7D': [
    { day: 'Mon', revenue: 4820, orders: 132 },
    { day: 'Tue', revenue: 5240, orders: 141 },
    { day: 'Wed', revenue: 4610, orders: 118 },
    { day: 'Thu', revenue: 6380, orders: 167 },
    { day: 'Fri', revenue: 7920, orders: 203 },
    { day: 'Sat', revenue: 9140, orders: 246 },
    { day: 'Sun', revenue: 8350, orders: 221 },
  ],
  '30D': [
    { day: 'W1', revenue: 31200, orders: 842 },
    { day: 'W2', revenue: 36800, orders: 951 },
    { day: 'W3', revenue: 33400, orders: 887 },
    { day: 'W4', revenue: 41950, orders: 1083 },
  ],
  '90D': [
    { day: 'Apr', revenue: 118400, orders: 3120 },
    { day: 'May', revenue: 134900, orders: 3540 },
    { day: 'Jun', revenue: 143350, orders: 3763 },
  ],
};

const channelData = [
  { name: 'Online store', value: 64200 },
  { name: 'Wholesale', value: 38400 },
  { name: 'Greenhouse pickup', value: 21100 },
  { name: 'Markets', value: 12800 },
];

const orders = [
  { id: '#VR-3194', customer: 'Maren Holloway', items: 'Monstera Deliciosa ×2, Terracotta 8"', total: 184.00, status: 'Fulfilled', date: 'Jun 28' },
  { id: '#VR-3193', customer: 'Caldera Café Group', items: 'Wholesale — 40× Pothos, 12× Ficus', total: 1240.00, status: 'Processing', date: 'Jun 28' },
  { id: '#VR-3192', customer: 'Devon Ashby', items: 'Olive Tree 5-gal, Potting blend', total: 226.50, status: 'Fulfilled', date: 'Jun 27' },
  { id: '#VR-3191', customer: 'Lina Petrova', items: 'Fiddle Leaf Fig 6ft', total: 318.00, status: 'Shipped', date: 'Jun 27' },
  { id: '#VR-3190', customer: 'The Alder Hotel', items: 'Wholesale — lobby installation', total: 4680.00, status: 'Processing', date: 'Jun 26' },
  { id: '#VR-3189', customer: 'Jonas Reuter', items: 'Snake Plant ×3, Ceramic planters', total: 142.00, status: 'Refunded', date: 'Jun 26' },
];

const lowStock = [
  { name: 'Olive Tree · 5 gal', sku: 'TR-OLV-05', left: 4, cap: 40 },
  { name: 'Calathea Orbifolia', sku: 'PL-CAL-OR', left: 7, cap: 60 },
  { name: 'Terracotta Pot · 10"', sku: 'CT-TER-10', left: 12, cap: 120 },
  { name: 'Organic Potting Blend', sku: 'SL-ORG-20', left: 9, cap: 80 },
];

const statusStyle = {
  Fulfilled: { bg: '#e3ead9', dot: '#3f6b54', text: '#2c4a3a' },
  Processing: { bg: '#f0e6cb', dot: '#c9a24b', text: '#7a5e1e' },
  Shipped: { bg: '#e0e7e9', dot: '#4a7080', text: '#33555f' },
  Refunded: { bg: '#eedede', dot: '#a35353', text: '#7c3a3a' },
};

const navItems = [
  { icon: LayoutGrid, label: 'Overview' },
  { icon: Receipt, label: 'Orders', badge: '24' },
  { icon: Package, label: 'Inventory' },
  { icon: Users, label: 'Customers' },
  { icon: Truck, label: 'Fulfilment' },
  { icon: Settings, label: 'Settings' },
];

function Kpi({ icon: Icon, label, value, delta, up, sub, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45, ease: 'easeOut' }}
      className="group relative bg-white/60 border border-[#dcd2bd] rounded-[4px] p-5 hover:bg-white transition-colors duration-300"
    >
      <div className="flex items-start justify-between">
        <div className="w-9 h-9 rounded-full bg-[#16352a] flex items-center justify-center">
          <Icon size={16} className="text-[#f6f1e7]" strokeWidth={1.75} />
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full ${up ? 'bg-[#e3ead9] text-[#2c4a3a]' : 'bg-[#eedede] text-[#7c3a3a]'}`}>
          {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {delta}
        </span>
      </div>
      <div className="mt-5">
        <div className="font-display text-[28px] leading-none text-[#16352a]">{value}</div>
        <div className="mt-2 text-[12px] uppercase tracking-[0.12em] text-[#16352a]/55 font-medium">{label}</div>
        <div className="mt-1 text-[12px] text-[#16352a]/40">{sub}</div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [activeNav, setActiveNav] = useState('Overview');
  const [range, setRange] = useState('7D');
  const [orderFilter, setOrderFilter] = useState('All');

  const data = revenueData[range];
  const filteredOrders = orderFilter === 'All' ? orders : orders.filter(o => o.status === orderFilter);

  return (
    <div className="min-h-screen flex bg-[#f6f1e7] text-[#16352a]">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `
        :root { color-scheme: light; }
        body { margin: 0; }
        .font-display { font-family: 'Fraunces', serif; }
        .font-sans-app { font-family: 'Inter', system-ui, sans-serif; }
        .grain::before {
          content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 50; opacity: 0.35;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='table' tableValues='0 0.04'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }
        ::-webkit-scrollbar { width: 10px; height: 10px; }
        ::-webkit-scrollbar-track { background: #efe8d8; }
        ::-webkit-scrollbar-thumb { background: #c8bda0; border-radius: 8px; border: 2px solid #efe8d8; }
        .nav-item { position: relative; }
        .nav-item.active::before {
          content: ''; position: absolute; left: -16px; top: 50%; transform: translateY(-50%);
          width: 3px; height: 22px; background: #c9a24b; border-radius: 2px;
        }
        .recharts-tooltip-cursor { fill: rgba(22,53,42,0.05); }
      `}} />

      <div className="grain font-sans-app flex w-full">
        {/* ── Sidebar ─────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[248px] shrink-0 bg-[#16352a] text-[#f6f1e7] px-6 py-7 sticky top-0 h-screen">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#c9a24b] flex items-center justify-center">
              <Leaf size={17} className="text-[#16352a]" strokeWidth={2.25} />
            </div>
            <div>
              <div className="font-display text-[19px] leading-none tracking-tight">Verdara</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#f6f1e7]/45 mt-1">Nursery OS</div>
            </div>
          </div>

          <div className="mt-10 text-[10px] uppercase tracking-[0.2em] text-[#f6f1e7]/35 mb-3">Operations</div>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ icon: Icon, label, badge }) => {
              const active = activeNav === label;
              return (
                <button
                  key={label}
                  onClick={() => setActiveNav(label)}
                  className={`nav-item ${active ? 'active' : ''} flex items-center gap-3 px-3 py-2.5 rounded-[3px] text-[13.5px] transition-all duration-200 ${
                    active ? 'bg-[#f6f1e7]/10 text-[#f6f1e7] font-medium' : 'text-[#f6f1e7]/55 hover:text-[#f6f1e7] hover:bg-[#f6f1e7]/5'
                  }`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span>{label}</span>
                  {badge && <span className="ml-auto text-[10px] font-semibold bg-[#c9a24b] text-[#16352a] px-1.5 py-0.5 rounded-full">{badge}</span>}
                </button>
              );
            })}
          </nav>

          <div className="mt-auto">
            <div className="rounded-[4px] bg-[#1f4a3a] border border-[#f6f1e7]/10 p-4">
              <div className="flex items-center gap-2 text-[#c9a24b]">
                <Sprout size={15} />
                <span className="text-[12px] font-semibold">Greenhouse B</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-[#f6f1e7]/60">312 propagations ready to pot this week.</p>
              <button className="mt-3 w-full text-[12px] font-medium bg-[#f6f1e7] text-[#16352a] rounded-[3px] py-2 hover:bg-[#c9a24b] transition-colors duration-200">
                Schedule potting
              </button>
            </div>
            <div className="mt-5 flex items-center gap-3 pt-5 border-t border-[#f6f1e7]/10">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop" alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-[#c9a24b]/40" />
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">Esme Calloway</div>
                <div className="text-[11px] text-[#f6f1e7]/45">Head of Operations</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────── */}
        <main className="flex-1 min-w-0">
          {/* Top bar */}
          <header className="sticky top-0 z-20 bg-[#f6f1e7]/85 backdrop-blur-md border-b border-[#dcd2bd]">
            <div className="px-6 lg:px-10 h-[68px] flex items-center gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#16352a]/45">Saturday, June 28</div>
                <h1 className="font-display text-[20px] leading-tight -mt-0.5">Good morning, Esme</h1>
              </div>
              <div className="ml-auto hidden md:flex items-center gap-2 bg-white/70 border border-[#dcd2bd] rounded-full px-4 py-2 w-[300px]">
                <Search size={15} className="text-[#16352a]/45" />
                <input placeholder="Search orders, plants, customers…" className="bg-transparent outline-none text-[13px] placeholder:text-[#16352a]/35 w-full" />
                <kbd className="text-[10px] text-[#16352a]/40 border border-[#dcd2bd] rounded px-1.5 py-0.5">⌘K</kbd>
              </div>
              <button className="relative w-10 h-10 rounded-full border border-[#dcd2bd] bg-white/70 flex items-center justify-center hover:bg-white transition-colors">
                <Bell size={16} strokeWidth={1.75} />
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-[#c9a24b] ring-2 ring-[#f6f1e7]" />
              </button>
              <button className="hidden sm:flex items-center gap-2 bg-[#16352a] text-[#f6f1e7] text-[13px] font-medium pl-3 pr-4 py-2.5 rounded-full hover:bg-[#1f4a3a] transition-colors">
                <Plus size={15} /> New order
              </button>
            </div>
          </header>

          <div className="px-6 lg:px-10 py-8 max-w-[1280px]">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <Kpi icon={CircleDollarSign} label="Net revenue" value="$46,460" delta="12.4%" up sub="vs. $41,330 last week" delay={0.05} />
              <Kpi icon={ShoppingBag} label="Orders" value="1,228" delta="8.1%" up sub="167 wholesale, 1,061 retail" delay={0.12} />
              <Kpi icon={Repeat} label="Repeat rate" value="41.7%" delta="2.3%" up sub="Subscriptions trending up" delay={0.19} />
              <Kpi icon={Sprout} label="Plants in stock" value="8,940" delta="3.6%" up={false} sub="14 SKUs below reorder point" delay={0.26} />
            </div>

            {/* Charts row */}
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Revenue chart */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}
                className="xl:col-span-2 bg-white/60 border border-[#dcd2bd] rounded-[4px] p-6"
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-display text-[19px]">Revenue cadence</h2>
                    <p className="text-[12px] text-[#16352a]/50 mt-0.5">Gross sales across all channels</p>
                  </div>
                  <div className="flex items-center bg-[#efe8d8] rounded-full p-1">
                    {['7D', '30D', '90D'].map(r => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`text-[12px] font-medium px-3.5 py-1.5 rounded-full transition-all duration-200 ${
                          range === r ? 'bg-[#16352a] text-[#f6f1e7] shadow-sm' : 'text-[#16352a]/55 hover:text-[#16352a]'
                        }`}
                      >{r}</button>
                    ))}
                  </div>
                </div>
                <div className="h-[260px] mt-5 -ml-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} key={range}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MOSS} stopOpacity={0.35} />
                          <stop offset="100%" stopColor={MOSS} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#dcd2bd" strokeDasharray="2 6" vertical={false} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#16352a', opacity: 0.5, fontSize: 11 }} dy={8} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#16352a', opacity: 0.5, fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} width={42} />
                      <Tooltip
                        contentStyle={{ background: GREEN, border: 'none', borderRadius: 4, padding: '10px 14px' }}
                        labelStyle={{ color: '#f6f1e7', opacity: 0.6, fontSize: 11, marginBottom: 4 }}
                        itemStyle={{ color: '#f6f1e7', fontSize: 13, fontWeight: 600 }}
                        formatter={(v, n) => [n === 'revenue' ? `$${v.toLocaleString()}` : v, n === 'revenue' ? 'Revenue' : 'Orders']}
                        cursor={{ stroke: GOLD, strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke={GREEN_2} strokeWidth={2.25} fill="url(#rev)" dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} activeDot={{ r: 5, fill: GOLD, stroke: GREEN, strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Channels */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.5 }}
                className="bg-[#16352a] text-[#f6f1e7] rounded-[4px] p-6 flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-[19px]">Sales by channel</h2>
                  <button className="text-[#f6f1e7]/50 hover:text-[#f6f1e7] transition-colors"><MoreHorizontal size={18} /></button>
                </div>
                <p className="text-[12px] text-[#f6f1e7]/50 mt-0.5">Quarter to date</p>
                <div className="h-[150px] mt-5">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={channelData} barSize={26}>
                      <XAxis dataKey="name" hide />
                      <Tooltip
                        cursor={{ fill: 'rgba(246,241,231,0.06)' }}
                        contentStyle={{ background: '#f6f1e7', border: 'none', borderRadius: 4 }}
                        labelStyle={{ color: GREEN, fontSize: 11, opacity: 0.6 }}
                        itemStyle={{ color: GREEN, fontSize: 13, fontWeight: 600 }}
                        formatter={v => [`$${v.toLocaleString()}`, 'Sales']}
                      />
                      <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                        {channelData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? GOLD : i === 1 ? SAGE : i === 2 ? '#5d8468' : '#3f6b54'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2.5">
                  {channelData.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2.5 text-[12.5px]">
                      <span className="w-2 h-2 rounded-full" style={{ background: i === 0 ? GOLD : i === 1 ? SAGE : i === 2 ? '#5d8468' : '#3f6b54' }} />
                      <span className="text-[#f6f1e7]/70">{c.name}</span>
                      <span className="ml-auto font-semibold">${(c.value / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Orders + Low stock */}
            <div className="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Orders table */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46, duration: 0.5 }}
                className="xl:col-span-2 bg-white/60 border border-[#dcd2bd] rounded-[4px]"
              >
                <div className="p-6 pb-4 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-display text-[19px]">Recent orders</h2>
                    <p className="text-[12px] text-[#16352a]/50 mt-0.5">{filteredOrders.length} of 1,228 this period</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#efe8d8] rounded-full p-1">
                      {['All', 'Processing', 'Fulfilled'].map(f => (
                        <button key={f} onClick={() => setOrderFilter(f)}
                          className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-all duration-200 ${orderFilter === f ? 'bg-[#16352a] text-[#f6f1e7]' : 'text-[#16352a]/55 hover:text-[#16352a]'}`}>
                          {f}
                        </button>
                      ))}
                    </div>
                    <button className="w-9 h-9 rounded-full border border-[#dcd2bd] bg-white/70 flex items-center justify-center hover:bg-white transition-colors">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="text-left text-[10.5px] uppercase tracking-[0.14em] text-[#16352a]/45 border-y border-[#dcd2bd]">
                        <th className="font-medium px-6 py-3">Order</th>
                        <th className="font-medium px-4 py-3">Customer</th>
                        <th className="font-medium px-4 py-3 hidden md:table-cell">Items</th>
                        <th className="font-medium px-4 py-3">Status</th>
                        <th className="font-medium px-4 py-3 text-right">Total</th>
                        <th className="font-medium px-6 py-3 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {filteredOrders.map((o, i) => {
                          const s = statusStyle[o.status];
                          return (
                            <motion.tr
                              key={o.id}
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="border-b border-[#e7dfcc] last:border-0 hover:bg-[#efe8d8]/60 transition-colors cursor-pointer"
                            >
                              <td className="px-6 py-3.5 font-semibold text-[#16352a]">{o.id}</td>
                              <td className="px-4 py-3.5">{o.customer}</td>
                              <td className="px-4 py-3.5 hidden md:table-cell text-[#16352a]/55 max-w-[220px] truncate">{o.items}</td>
                              <td className="px-4 py-3.5">
                                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.text }}>
                                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
                                  {o.status}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-right font-semibold">${o.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-3.5 text-right text-[#16352a]/50">{o.date}</td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.div>

              {/* Low stock */}
              <motion.div
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.54, duration: 0.5 }}
                className="bg-white/60 border border-[#dcd2bd] rounded-[4px] p-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-[19px]">Reorder soon</h2>
                  <span className="text-[11px] font-semibold bg-[#f0e6cb] text-[#7a5e1e] px-2 py-1 rounded-full">14 SKUs</span>
                </div>
                <p className="text-[12px] text-[#16352a]/50 mt-0.5">Below safety stock threshold</p>
                <div className="mt-5 space-y-5">
                  {lowStock.map(item => {
                    const pct = Math.round((item.left / item.cap) * 100);
                    return (
                      <div key={item.sku} className="group">
                        <div className="flex items-baseline justify-between">
                          <div>
                            <div className="text-[13.5px] font-medium">{item.name}</div>
                            <div className="text-[11px] text-[#16352a]/40 mt-0.5 tracking-wide">{item.sku}</div>
                          </div>
                          <div className="text-right">
                            <span className="font-display text-[17px]">{item.left}</span>
                            <span className="text-[11px] text-[#16352a]/45"> / {item.cap}</span>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-[#e7dfcc] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: pct < 12 ? '#a35353' : GOLD }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="mt-6 w-full flex items-center justify-center gap-2 text-[13px] font-medium border border-[#16352a]/25 rounded-[3px] py-2.5 hover:bg-[#16352a] hover:text-[#f6f1e7] transition-all duration-200">
                  Create purchase orders <ArrowUpRight size={14} />
                </button>
              </motion.div>
            </div>

            <footer className="mt-10 pb-6 flex items-center justify-between text-[11px] text-[#16352a]/40">
              <span>Verdara Nursery OS · v4.2.1</span>
              <span className="tracking-[0.18em] uppercase">Grown with patience since 1987</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}