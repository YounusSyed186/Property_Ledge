import { useState } from 'react';
import {
  Wind, Droplets, Eye, Gauge, ThermometerSun, CloudRain, CloudSnow,
  CloudLightning, Sun, Cloud, AlertTriangle, ShieldAlert, TrendingUp,
  MapPin, ChevronRight, Search, Bell, Settings, Layers, Truck,
  HardHat, Plane, Radio, ArrowUpRight, ArrowDownRight, CircleDot
} from 'lucide-react';
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ─────────────────────────────────────────────── DATA
const SITES = [
  {
    id: 'ord-dc4',
    name: 'Chicago DC-4',
    region: 'O\'Hare Logistics Corridor',
    type: 'Distribution Hub',
    icon: Truck,
    temp: 28,
    condition: 'Heavy Snow',
    conditionIcon: CloudSnow,
    risk: 'CRITICAL',
    riskScore: 91,
    wind: 34,
    gusts: 52,
    humidity: 88,
    visibility: 0.4,
    pressure: 29.42,
    dewpoint: 25,
    feelsLike: 14,
    assets: 1240,
    crews: 86,
  },
  {
    id: 'hou-ref2',
    name: 'Houston Refinery 2',
    region: 'Gulf Coast Petrochemical',
    type: 'Processing Facility',
    icon: Layers,
    temp: 79,
    condition: 'Thunderstorms',
    conditionIcon: CloudLightning,
    risk: 'HIGH',
    riskScore: 74,
    wind: 22,
    gusts: 41,
    humidity: 91,
    visibility: 3.2,
    pressure: 29.71,
    dewpoint: 74,
    feelsLike: 86,
    assets: 890,
    crews: 212,
  },
  {
    id: 'den-air1',
    name: 'Denver Air Cargo',
    region: 'DEN Intermodal',
    type: 'Air Freight Terminal',
    icon: Plane,
    temp: 41,
    condition: 'Wind Advisory',
    conditionIcon: Wind,
    risk: 'MODERATE',
    riskScore: 48,
    wind: 38,
    gusts: 61,
    humidity: 32,
    visibility: 10,
    pressure: 30.02,
    dewpoint: 18,
    feelsLike: 33,
    assets: 410,
    crews: 64,
  },
  {
    id: 'phx-sol3',
    name: 'Phoenix Solar Array 3',
    region: 'Maricopa Grid West',
    type: 'Energy Generation',
    icon: Sun,
    temp: 72,
    condition: 'Clear',
    conditionIcon: Sun,
    risk: 'LOW',
    riskScore: 12,
    wind: 8,
    gusts: 14,
    humidity: 21,
    visibility: 10,
    pressure: 30.11,
    dewpoint: 31,
    feelsLike: 72,
    assets: 2300,
    crews: 18,
  },
  {
    id: 'sea-prt1',
    name: 'Seattle Port Terminal 18',
    region: 'Puget Sound Maritime',
    type: 'Container Port',
    icon: Radio,
    temp: 46,
    condition: 'Light Rain',
    conditionIcon: CloudRain,
    risk: 'LOW',
    riskScore: 22,
    wind: 14,
    gusts: 21,
    humidity: 84,
    visibility: 7.5,
    pressure: 29.88,
    dewpoint: 42,
    feelsLike: 41,
    assets: 670,
    crews: 140,
  },
];

const HOURLY = {
  'ord-dc4': [
    { h: 'Now', temp: 28, precip: 78, wind: 34 },
    { h: '14:00', temp: 27, precip: 86, wind: 38 },
    { h: '16:00', temp: 25, precip: 92, wind: 42 },
    { h: '18:00', temp: 23, precip: 95, wind: 45 },
    { h: '20:00', temp: 21, precip: 88, wind: 41 },
    { h: '22:00', temp: 19, precip: 64, wind: 36 },
    { h: '00:00', temp: 17, precip: 42, wind: 30 },
    { h: '02:00', temp: 16, precip: 28, wind: 26 },
    { h: '04:00', temp: 15, precip: 14, wind: 22 },
    { h: '06:00', temp: 16, precip: 8, wind: 19 },
    { h: '08:00', temp: 19, precip: 4, wind: 17 },
    { h: '10:00', temp: 23, precip: 2, wind: 15 },
  ],
  'hou-ref2': [
    { h: 'Now', temp: 79, precip: 62, wind: 22 },
    { h: '14:00', temp: 81, precip: 74, wind: 26 },
    { h: '16:00', temp: 82, precip: 81, wind: 31 },
    { h: '18:00', temp: 78, precip: 68, wind: 24 },
    { h: '20:00', temp: 75, precip: 44, wind: 18 },
    { h: '22:00', temp: 74, precip: 31, wind: 14 },
    { h: '00:00', temp: 73, precip: 22, wind: 12 },
    { h: '02:00', temp: 72, precip: 18, wind: 10 },
    { h: '04:00', temp: 71, precip: 12, wind: 9 },
    { h: '06:00', temp: 72, precip: 10, wind: 11 },
    { h: '08:00', temp: 75, precip: 8, wind: 13 },
    { h: '10:00', temp: 78, precip: 6, wind: 15 },
  ],
  'den-air1': [
    { h: 'Now', temp: 41, precip: 4, wind: 38 },
    { h: '14:00', temp: 43, precip: 4, wind: 44 },
    { h: '16:00', temp: 44, precip: 6, wind: 49 },
    { h: '18:00', temp: 41, precip: 8, wind: 52 },
    { h: '20:00', temp: 38, precip: 6, wind: 46 },
    { h: '22:00', temp: 35, precip: 4, wind: 38 },
    { h: '00:00', temp: 33, precip: 2, wind: 30 },
    { h: '02:00', temp: 31, precip: 2, wind: 24 },
    { h: '04:00', temp: 30, precip: 2, wind: 20 },
    { h: '06:00', temp: 31, precip: 2, wind: 18 },
    { h: '08:00', temp: 36, precip: 2, wind: 16 },
    { h: '10:00', temp: 42, precip: 2, wind: 14 },
  ],
  'phx-sol3': [
    { h: 'Now', temp: 72, precip: 0, wind: 8 },
    { h: '14:00', temp: 76, precip: 0, wind: 9 },
    { h: '16:00', temp: 78, precip: 0, wind: 10 },
    { h: '18:00', temp: 74, precip: 0, wind: 8 },
    { h: '20:00', temp: 67, precip: 0, wind: 6 },
    { h: '22:00', temp: 62, precip: 0, wind: 5 },
    { h: '00:00', temp: 58, precip: 0, wind: 4 },
    { h: '02:00', temp: 55, precip: 0, wind: 4 },
    { h: '04:00', temp: 53, precip: 0, wind: 3 },
    { h: '06:00', temp: 54, precip: 0, wind: 4 },
    { h: '08:00', temp: 61, precip: 0, wind: 6 },
    { h: '10:00', temp: 68, precip: 0, wind: 7 },
  ],
  'sea-prt1': [
    { h: 'Now', temp: 46, precip: 48, wind: 14 },
    { h: '14:00', temp: 47, precip: 52, wind: 15 },
    { h: '16:00', temp: 47, precip: 58, wind: 17 },
    { h: '18:00', temp: 45, precip: 61, wind: 16 },
    { h: '20:00', temp: 44, precip: 54, wind: 14 },
    { h: '22:00', temp: 43, precip: 42, wind: 12 },
    { h: '00:00', temp: 42, precip: 36, wind: 11 },
    { h: '02:00', temp: 42, precip: 30, wind: 10 },
    { h: '04:00', temp: 41, precip: 24, wind: 9 },
    { h: '06:00', temp: 41, precip: 20, wind: 9 },
    { h: '08:00', temp: 43, precip: 16, wind: 10 },
    { h: '10:00', temp: 45, precip: 12, wind: 11 },
  ],
};

const ALERTS = {
  'ord-dc4': [
    { sev: 'critical', title: 'Winter Storm Warning', body: 'NWS Chicago — 8–12" accumulation expected through 02:00 CST. Blowing snow, near-zero visibility on I-294 corridor.', time: '12 min ago', source: 'NWS / KLOT' },
    { sev: 'critical', title: 'Dock Operations Threshold Breach', body: 'Sustained winds exceed 30 mph crane safety limit. Outbound staging at docks 14–22 auto-paused per policy WX-114.', time: '34 min ago', source: 'Meridian Policy Engine' },
    { sev: 'warning', title: 'Carrier Delay Cascade Forecast', body: '38 inbound linehaul arrivals projected to slip >4h. Recommend rerouting 12 loads via Indianapolis DC-2.', time: '1 hr ago', source: 'Impact Model v4.2' },
  ],
  'hou-ref2': [
    { sev: 'critical', title: 'Lightning Within 8 Miles', body: 'Cell tracking NE at 22 mph. All elevated work and tank-top operations must halt per OSHA 1926.968 protocol.', time: '6 min ago', source: 'Strike Network' },
    { sev: 'warning', title: 'Flash Flood Watch', body: '2.5–4" rainfall possible by 20:00 CDT. Containment basin 3 currently at 71% capacity.', time: '52 min ago', source: 'NWS / KHGX' },
  ],
  'den-air1': [
    { sev: 'warning', title: 'Crosswind Component Advisory', body: 'Gusts to 61 mph forecast 16:00–19:00 MST. Wide-body ground handling restrictions likely; 14 departures flagged.', time: '28 min ago', source: 'Meridian Aviation Layer' },
  ],
  'phx-sol3': [
    { sev: 'info', title: 'Optimal Generation Window', body: 'Clear-sky irradiance projected at 98% of seasonal max through Friday. Maintenance window recommended for next week.', time: '2 hrs ago', source: 'Solar Yield Model' },
  ],
  'sea-prt1': [
    { sev: 'info', title: 'Tide + Rain Compound Watch', body: 'King tide coincides with sustained light rain Thursday 04:00–07:00 PST. Berth 3 apron drainage monitoring advised.', time: '3 hrs ago', source: 'Maritime Layer' },
  ],
};

const IMPACTS = {
  'ord-dc4': [
    { label: 'Throughput at risk', value: '$2.4M', delta: '+38%', dir: 'up', bad: true },
    { label: 'Crew exposure hours', value: '1,840', delta: '+212', dir: 'up', bad: true },
    { label: 'Est. downtime', value: '11.5 hrs', delta: '+4.0', dir: 'up', bad: true },
    { label: 'SLA breaches projected', value: '47', delta: '+19', dir: 'up', bad: true },
  ],
  'hou-ref2': [
    { label: 'Throughput at risk', value: '$890K', delta: '+12%', dir: 'up', bad: true },
    { label: 'Crew exposure hours', value: '640', delta: '+85', dir: 'up', bad: true },
    { label: 'Est. downtime', value: '3.2 hrs', delta: '+1.1', dir: 'up', bad: true },
    { label: 'SLA breaches projected', value: '6', delta: '+2', dir: 'up', bad: true },
  ],
  'den-air1': [
    { label: 'Throughput at risk', value: '$310K', delta: '−8%', dir: 'down', bad: false },
    { label: 'Crew exposure hours', value: '120', delta: '+14', dir: 'up', bad: true },
    { label: 'Est. downtime', value: '1.5 hrs', delta: '+0.5', dir: 'up', bad: true },
    { label: 'SLA breaches projected', value: '3', delta: '0', dir: 'flat', bad: false },
  ],
  'phx-sol3': [
    { label: 'Generation upside', value: '+$84K', delta: '+6%', dir: 'up', bad: false },
    { label: 'Crew exposure hours', value: '36', delta: '−12', dir: 'down', bad: false },
    { label: 'Est. downtime', value: '0 hrs', delta: '0', dir: 'flat', bad: false },
    { label: 'SLA breaches projected', value: '0', delta: '0', dir: 'flat', bad: false },
  ],
  'sea-prt1': [
    { label: 'Throughput at risk', value: '$120K', delta: '−22%', dir: 'down', bad: false },
    { label: 'Crew exposure hours', value: '410', delta: '+30', dir: 'up', bad: true },
    { label: 'Est. downtime', value: '0.8 hrs', delta: '−0.4', dir: 'down', bad: false },
    { label: 'SLA breaches projected', value: '1', delta: '−2', dir: 'down', bad: false },
  ],
};

const WEEK = [
  { d: 'Wed', icon: CloudSnow, hi: 28, lo: 15, p: 95 },
  { d: 'Thu', icon: Cloud, hi: 24, lo: 12, p: 20 },
  { d: 'Fri', icon: Sun, hi: 31, lo: 18, p: 5 },
  { d: 'Sat', icon: Sun, hi: 36, lo: 22, p: 0 },
  { d: 'Sun', icon: CloudRain, hi: 38, lo: 30, p: 60 },
  { d: 'Mon', icon: CloudSnow, hi: 33, lo: 21, p: 70 },
  { d: 'Tue', icon: Cloud, hi: 29, lo: 17, p: 25 },
];

const RISK_STYLE = {
  CRITICAL: { dot: '#FF5C47', text: '#FF7A66', bg: 'rgba(255,92,71,0.10)', ring: 'rgba(255,92,71,0.35)' },
  HIGH: { dot: '#F5A524', text: '#FFC457', bg: 'rgba(245,165,36,0.10)', ring: 'rgba(245,165,36,0.35)' },
  MODERATE: { dot: '#E8D44D', text: '#EFE07A', bg: 'rgba(232,212,77,0.08)', ring: 'rgba(232,212,77,0.30)' },
  LOW: { dot: '#3ECF8E', text: '#6FE3AE', bg: 'rgba(62,207,142,0.08)', ring: 'rgba(62,207,142,0.30)' },
};

const SEV_STYLE = {
  critical: { color: '#FF5C47', label: 'CRITICAL', bg: 'rgba(255,92,71,0.08)' },
  warning: { color: '#F5A524', label: 'WARNING', bg: 'rgba(245,165,36,0.07)' },
  info: { color: '#5BA8FF', label: 'ADVISORY', bg: 'rgba(91,168,255,0.07)' },
};

// ─────────────────────────────────────────────── COMPONENT
export default function App() {
  const [activeId, setActiveId] = useState('ord-dc4');
  const [tab, setTab] = useState('forecast');
  const site = SITES.find(s => s.id === activeId);
  const Risk = RISK_STYLE[site.risk];
  const ConditionIcon = site.conditionIcon;

  const vitals = [
    { icon: Wind, label: 'Wind / Gusts', value: `${site.wind} / ${site.gusts}`, unit: 'mph' },
    { icon: Droplets, label: 'Humidity', value: site.humidity, unit: '%' },
    { icon: Eye, label: 'Visibility', value: site.visibility, unit: 'mi' },
    { icon: Gauge, label: 'Pressure', value: site.pressure, unit: 'inHg' },
    { icon: ThermometerSun, label: 'Feels Like', value: `${site.feelsLike}°`, unit: 'F' },
    { icon: CloudRain, label: 'Dew Point', value: `${site.dewpoint}°`, unit: 'F' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D13] text-[#E7EAF0] antialiased" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      <style dangerouslySetInnerHTML={{ __html: `
        * { -webkit-font-smoothing: antialiased; }
        .mono { font-family: 'IBM Plex Mono', monospace; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1E2530; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #2A3342; }
        @keyframes pulseDot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.8); } }
        .pulse-dot { animation: pulseDot 2s ease-in-out infinite; }
        @keyframes scanline { 0% { background-position: 0 0; } 100% { background-position: 0 100px; } }
        .grain {
          background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 3px 3px;
        }
        .panel { background: #10141C; border: 1px solid #1B212C; }
        .panel-deep { background: #0D1118; border: 1px solid #1B212C; }
        .ticker { white-space: nowrap; overflow: hidden; }
        .ticker-inner { display: inline-block; animation: tick 45s linear infinite; }
        @keyframes tick { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}} />

      {/* ── Top bar */}
      <header className="h-14 border-b border-[#1B212C] flex items-center px-5 gap-6 bg-[#0C0F16] sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#F5A524] flex items-center justify-center" style={{ borderRadius: '2px 8px 2px 8px' }}>
            <CloudLightning size={16} className="text-[#0A0D13]" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <div className="font-bold text-[14px] tracking-tight">MERIDIAN</div>
            <div className="mono text-[9px] text-[#5C6activated677] text-[#5C6677] tracking-[0.2em] mt-0.5">WEATHER OPS</div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1 ml-4">
          {['Operations', 'Risk Models', 'Sites', 'Reports', 'API'].map((item, i) => (
            <button key={item} className={`px-3 py-1.5 text-[13px] rounded-md transition-colors ${i === 0 ? 'text-white bg-[#1A2030]' : 'text-[#7A8699] hover:text-white hover:bg-[#151B26]'}`}>
              {item}
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#11151D] border border-[#1E2530] rounded-md text-[#5C6677] text-[13px] w-64">
          <Search size={14} />
          <span>Search sites, alerts, assets…</span>
          <span className="ml-auto mono text-[10px] border border-[#2A3342] rounded px-1.5 py-0.5">⌘K</span>
        </div>

        <button className="relative p-2 text-[#7A8699] hover:text-white transition-colors">
          <Bell size={17} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#FF5C47] rounded-full pulse-dot" />
        </button>
        <button className="p-2 text-[#7A8699] hover:text-white transition-colors"><Settings size={17} /></button>
        <div className="flex items-center gap-2.5 pl-4 border-l border-[#1E2530]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#2A3950] to-[#15202F] border border-[#2E3B50] flex items-center justify-center text-[12px] font-semibold">NV</div>
          <div className="hidden xl:block leading-tight">
            <div className="text-[12px] font-semibold">Northgate Logistics</div>
            <div className="mono text-[10px] text-[#5C6677]">ENTERPRISE · 247 SITES</div>
          </div>
        </div>
      </header>

      {/* ── Alert ticker */}
      <div className="h-8 bg-[#13100A] border-b border-[#2A2010] flex items-center overflow-hidden">
        <div className="px-4 h-full flex items-center gap-2 bg-[#F5A524] text-[#0A0D13] mono text-[10px] font-semibold tracking-wider shrink-0">
          <ShieldAlert size={12} /> 7 ACTIVE ALERTS
        </div>
        <div className="ticker flex-1">
          <div className="ticker-inner mono text-[11px] text-[#C9A express96A]">
            <span className="text-[#C9A96A]">
              {'  ●  WINTER STORM WARNING — Chicago DC-4 through 02:00 CST   ●  LIGHTNING HALT — Houston Refinery 2 elevated work suspended   ●  CROSSWIND ADVISORY — Denver Air Cargo 16:00–19:00 MST   ●  KING TIDE WATCH — Seattle Port Terminal 18 Thursday   ●  WINTER STORM WARNING — Chicago DC-4 through 02:00 CST   ●  LIGHTNING HALT — Houston Refinery 2 elevated work suspended   ●  CROSSWIND ADVISORY — Denver Air Cargo 16:00–19:00 MST   ●  KING TIDE WATCH — Seattle Port Terminal 18 Thursday   '}
            </span>
          </div>
        </div>
      </div>

      <div className="flex grain" style={{ minHeight: 'calc(100vh - 88px)' }}>

        {/* ── Site rail */}
        <aside className="w-[300px] shrink-0 border-r border-[#1B212C] bg-[#0C0F16] hidden lg:block">
          <div className="px-4 pt-5 pb-3 flex items-center justify-between">
            <span className="mono text-[10px] tracking-[0.18em] text-[#5C6677]">MONITORED SITES</span>
            <span className="mono text-[10px] text-[#5C6677]">5 / 247</span>
          </div>
          <div className="px-3 space-y-1.5">
            {SITES.map(s => {
              const r = RISK_STYLE[s.risk];
              const SIcon = s.conditionIcon;
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full text-left p-3 rounded-lg transition-all duration-200 group border ${active ? 'bg-[#141A26] border-[#2A3650]' : 'border-transparent hover:bg-[#11151E] hover:border-[#1B212C]'}`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: r.dot }} />
                      <span className="text-[13px] font-semibold">{s.name}</span>
                    </div>
                    <span className="mono text-[15px] font-medium text-[#C8D0DC]">{s.temp}°</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#6B7689] flex items-center gap-1.5">
                      <SIcon size={12} /> {s.condition}
                    </span>
                    <span className="mono text-[9px] tracking-wider px-1.5 py-0.5 rounded" style={{ color: r.text, background: r.bg }}>{s.risk}</span>
                  </div>
                  {active && (
                    <div className="mt-2.5 pt-2.5 border-t border-[#1E2734] flex items-center justify-between text-[10px] mono text-[#5C6677]">
                      <span>{s.assets.toLocaleString()} ASSETS</span>
                      <span>{s.crews} CREW ON-SITE</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mx-4 mt-6 p-4 rounded-lg border border-dashed border-[#26303F] text-center">
            <div className="text-[12px] text-[#7A8699] mb-2">242 additional sites monitored</div>
            <button className="text-[12px] font-semibold text-[#F5A524] hover:text-[#FFC457] inline-flex items-center gap-1 transition-colors">
              Open network map <ChevronRight size={13} />
            </button>
          </div>
        </aside>

        {/* ── Main */}
        <main className="flex-1 p-6 space-y-5 overflow-x-hidden">

          {/* Site header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={site.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[#6B7689] text-[12px] mb-2 mono tracking-wide">
                    <MapPin size={12} /> {site.region.toUpperCase()} · {site.type.toUpperCase()}
                  </div>
                  <div className="flex items-center gap-5">
                    <h1 className="text-[34px] font-bold tracking-tight leading-none">{site.name}</h1>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ background: Risk.bg, borderColor: Risk.ring }}>
                      <CircleDot size={13} style={{ color: Risk.dot }} className="pulse-dot" />
                      <span className="mono text-[11px] font-semibold tracking-wider" style={{ color: Risk.text }}>
                        RISK {site.riskScore} / 100 — {site.risk}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 text-[13px] font-semibold rounded-md border border-[#26303F] text-[#C8D0DC] hover:bg-[#151B26] transition-colors">
                    Export briefing
                  </button>
                  <button className="px-4 py-2 text-[13px] font-semibold rounded-md bg-[#F5A524] text-[#0A0D13] hover:bg-[#FFB83D] transition-colors flex items-center gap-1.5">
                    <HardHat size={15} /> Activate response plan
                  </button>
                </div>
              </div>

              {/* Current conditions + impact row */}
              <div className="grid grid-cols-12 gap-4">

                {/* Big current */}
                <div className="col-span-12 xl:col-span-4 panel rounded-xl p-5 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 opacity-[0.06]">
                    <ConditionIcon size={220} strokeWidth={1} />
                  </div>
                  <div className="mono text-[10px] tracking-[0.18em] text-[#5C6677] mb-4">CURRENT CONDITIONS · 12:47 LOCAL</div>
                  <div className="flex items-start gap-4">
                    <div className="text-[72px] font-bold leading-[0.85] tracking-tighter">{site.temp}°</div>
                    <div className="pt-1">
                      <div className="text-[16px] font-semibold flex items-center gap-2">
                        <ConditionIcon size={18} className="text-[#F5A524]" /> {site.condition}
                      </div>
                      <div className="text-[12px] text-[#6B7689] mt-1">Feels like {site.feelsLike}°F</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-px bg-[#1B212C] mt-5 rounded-lg overflow-hidden">
                    {vitals.map(v => (
                      <div key={v.label} className="bg-[#10141C] p-3">
                        <div className="flex items-center gap-1.5 text-[#5C6677] mb-1.5">
                          <v.icon size={12} />
                          <span className="text-[10px]">{v.label}</span>
                        </div>
                        <div className="mono text-[14px] font-medium">
                          {v.value}<span className="text-[10px] text-[#5C6677] ml-1">{v.unit}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Forecast chart */}
                <div className="col-span-12 xl:col-span-8 panel rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="mono text-[10px] tracking-[0.18em] text-[#5C6677] mb-1">24-HOUR OPERATIONAL FORECAST</div>
                      <div className="text-[14px] font-semibold">Temperature, precipitation probability & sustained wind</div>
                    </div>
                    <div className="flex bg-[#0D1118] border border-[#1E2530] rounded-md p-0.5">
                      {['forecast', 'historical', 'model spread'].map(t => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className={`px-3 py-1 text-[11px] font-medium rounded capitalize transition-colors ${tab === t ? 'bg-[#222B3C] text-white' : 'text-[#6B7689] hover:text-white'}`}
                        >{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[252px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={HOURLY[site.id]} margin={{ top: 5, right: 5, bottom: 0, left: -18 }}>
                        <defs>
                          <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#F5A524" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#F5A524" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#1B212C" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="h" tick={{ fill: '#5C6677', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="temp" tick={{ fill: '#5C6677', fontSize: 10, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="precip" orientation="right" hide domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ background: '#0D1118', border: '1px solid #26303F', borderRadius: 8, fontSize: 12, fontFamily: 'IBM Plex Mono' }}
                          labelStyle={{ color: '#7A8699', marginBottom: 4 }}
                          itemStyle={{ padding: 0 }}
                          cursor={{ stroke: '#2A3342' }}
                        />
                        <Bar yAxisId="precip" dataKey="precip" name="Precip %" fill="#2E4A6B" radius={[3, 3, 0, 0]} barSize={14} />
                        <Area yAxisId="temp" type="monotone" dataKey="temp" name="Temp °F" stroke="#F5A524" strokeWidth={2.5} fill="url(#tempFill)" dot={false} />
                        <Line yAxisId="temp" type="monotone" dataKey="wind" name="Wind mph" stroke="#5BA8FF" strokeWidth={1.5} strokeDasharray="5 4" dot={false} />
                        <ReferenceLine yAxisId="temp" y={32} stroke="#FF5C47" strokeDasharray="4 4" strokeOpacity={0.5} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-5 mt-2 mono text-[10px] text-[#6B7689]">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-[3px] bg-[#F5A524] rounded" /> TEMPERATURE</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-[8px] bg-[#2E4A6B] rounded-sm" /> PRECIP PROBABILITY</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] bg-[#5BA8FF] rounded" style={{ borderTop: '1px dashed #5BA8FF' }} /> SUSTAINED WIND</span>
                    <span className="flex items-center gap-1.5 text-[#FF7A66]"><span className="w-3 h-[2px] bg-[#FF5C47] rounded" /> FREEZE LINE 32°F</span>
                  </div>
                </div>
              </div>

              {/* Impact metrics + 7-day + alerts */}
              <div className="grid grid-cols-12 gap-4">

                {/* Impact */}
                <div className="col-span-12 xl:col-span-4 space-y-4">
                  <div className="panel rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="mono text-[10px] tracking-[0.18em] text-[#5C6677]">PROJECTED BUSINESS IMPACT — NEXT 24H</div>
                      <TrendingUp size={14} className="text-[#5C6677]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {IMPACTS[site.id].map(m => (
                        <div key={m.label} className="panel-deep rounded-lg p-3.5">
                          <div className="text-[11px] text-[#6B7689] mb-2 leading-snug">{m.label}</div>
                          <div className="flex items-end justify-between">
                            <span className="mono text-[19px] font-semibold tracking-tight">{m.value}</span>
                            <span className={`flex items-center gap-0.5 mono text-[11px] ${m.dir === 'flat' ? 'text-[#5C6677]' : m.bad ? 'text-[#FF7A66]' : 'text-[#6FE3AE]'}`}>
                              {m.dir === 'up' && <ArrowUpRight size={12} />}
                              {m.dir === 'down' && <ArrowDownRight size={12} />}
                              {m.delta}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#1B212C] flex items-center justify-between">
                      <span className="text-[11px] text-[#6B7689]">Model: Impact Engine v4.2 · confidence 87%</span>
                      <button className="text-[11px] font-semibold text-[#F5A524] hover:text-[#FFC457] transition-colors">Methodology →</button>
                    </div>
                  </div>

                  {/* 7-day strip */}
                  <div className="panel rounded-xl p-5">
                    <div className="mono text-[10px] tracking-[0.18em] text-[#5C6677] mb-4">7-DAY OUTLOOK</div>
                    <div className="grid grid-cols-7 gap-1.5">
                      {WEEK.map((d, i) => (
                        <div key={d.d} className={`flex flex-col items-center gap-2 py-3 rounded-lg ${i === 0 ? 'bg-[#1A2030] border border-[#2A3650]' : 'hover:bg-[#13181F] transition-colors'}`}>
                          <span className="mono text-[10px] text-[#6B7689]">{d.d}</span>
                          <d.icon size={17} className={d.p > 50 ? 'text-[#5BA8FF]' : 'text-[#A6B0BF]'} />
                          <div className="text-center leading-tight">
                            <div className="mono text-[12px] font-medium">{d.hi}°</div>
                            <div className="mono text-[10px] text-[#5C6677]">{d.lo}°</div>
                          </div>
                          <span className={`mono text-[9px] ${d.p > 50 ? 'text-[#5BA8FF]' : 'text-[#3D4654]'}`}>{d.p}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Alerts feed */}
                <div className="col-span-12 xl:col-span-8 panel rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle size={15} className="text-[#F5A524]" />
                      <span className="text-[14px] font-semibold">Active alerts & policy actions</span>
                      <span className="mono text-[10px] px-1.5 py-0.5 rounded bg-[#1A2030] text-[#7A8699]">{ALERTS[site.id].length}</span>
                    </div>
                    <button className="text-[12px] text-[#7A8699] hover:text-white transition-colors">View alert history</button>
                  </div>
                  <div className="space-y-2.5">
                    {ALERTS[site.id].map((a, i) => {
                      const sv = SEV_STYLE[a.sev];
                      return (
                        <motion.div
                          key={a.title}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="flex gap-4 p-4 rounded-lg border border-[#1B212C] hover:border-[#2A3342] transition-colors group cursor-pointer"
                          style={{ background: sv.bg }}
                        >
                          <div className="w-[3px] rounded-full self-stretch shrink-0" style={{ background: sv.color }} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="mono text-[9px] font-semibold tracking-[0.15em] px-1.5 py-0.5 rounded" style={{ color: sv.color, background: `${sv.color}18` }}>{sv.label}</span>
                              <span className="text-[14px] font-semibold">{a.title}</span>
                              <span className="ml-auto mono text-[10px] text-[#5C6677] shrink-0">{a.time}</span>
                            </div>
                            <p className="text-[13px] text-[#9AA5B5] leading-relaxed">{a.body}</p>
                            <div className="flex items-center gap-3 mt-2.5">
                              <span className="mono text-[10px] text-[#5C6677]">SOURCE: {a.source.toUpperCase()}</span>
                              <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[12px] font-semibold flex items-center gap-1" style={{ color: sv.color }}>
                                Open response workflow <ChevronRight size={13} />
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* footer strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 pb-4 mono text-[10px] text-[#3D4654] tracking-wider">
            <span>DATA: NOAA · ECMWF · HRRR · ON-SITE MESONET (14 STATIONS) — REFRESHED 90s AGO</span>
            <span>MERIDIAN WEATHER OPS · SOC 2 TYPE II · 99.99% UPTIME SLA</span>
          </div>
        </main>
      </div>
    </div>
  );
}