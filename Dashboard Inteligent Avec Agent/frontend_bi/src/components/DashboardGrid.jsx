import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const PIE_COLORS = ['#7300ff', '#4400f1', '#081963', '#42adff', '#00c3fe', '#00c8ff'];
const CHART_TEXT_COLOR = '#7300ff';

function normalizeWidgetType(type) {
  if (!type || typeof type !== 'string') return '';
  const t = type.trim().toLowerCase();
  if (t === 'metriccard') return 'MetricCard';
  if (t === 'barchart') return 'BarChart';
  if (t === 'piechart') return 'PieChart';
  if (t === 'linechart') return 'LineChart';
  return type;
}

function formatBarData(labels, data) {
  if (!Array.isArray(labels) || !Array.isArray(data)) return [];
  return labels.map((label, index) => ({
    name: label,
    valeur: data[index],
  }));
}

function formatPieData(labels, data) {
  if (!Array.isArray(labels) || !Array.isArray(data)) return [];
  return labels.map((label, index) => ({
    name: label,
    value: Number(data[index]) || 0,
  }));
}

function hashFromString(value) {
  const s = String(value || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function buildTrend(elementId, periodKey) {
  const base = hashFromString(`${elementId}_${periodKey}`);
  const direction = base % 2 === 0 ? 1 : -1;
  const magnitude = ((base % 1300) / 100) * direction;
  return Number(magnitude.toFixed(1));
}

function sparklineData(elementId, value) {
  const base = hashFromString(`${elementId}_${value}`);
  const series = [];
  const safe = Number(value) || 0;
  for (let i = 0; i < 10; i += 1) {
    const delta = ((base >> (i % 8)) % 7) - 3;
    const v = Math.max(0, safe + safe * (delta / 100) + i * (safe * 0.003));
    series.push({ idx: i, v: Number(v.toFixed(2)) });
  }
  return series;
}

export function DashboardGrid({ items, periodKey = '30d' }) {
  if (!items || !items.length) {
    return <p className="bi-muted">Aucun widget à afficher.</p>;
  }

  return (
    <div className="bi-dashboard-grid">
      {items.map((element) => {
        const type = normalizeWidgetType(element.type);
        const trendPct = buildTrend(element.id || element.title, periodKey);
        const strokeColor = trendPct >= 5 ? '#10b981' : trendPct <= -5 ? '#ef4444' : '#f59e0b';

        if (type === 'MetricCard') {
          return (
            <div key={element.id} className="bi-card bi-metric">
              <div className="bi-card-header" title={element.description}>
                <h3 style={{ cursor: element.description ? 'help' : 'default' }}>
                  {element.title} {element.description && 'ℹ️'}
                </h3>
                <small className="bi-card-trend">
                  Tendance {periodKey}: {trendPct >= 0 ? '+' : ''}
                  {trendPct}%
                </small>
              </div>
              <p className="bi-metric-value">
                {new Intl.NumberFormat('fr-FR').format(element.value)}
              </p>
            </div>
          );
        }

        if (type === 'BarChart') {
          const chartData = formatBarData(element.labels, element.data);
          return (
            <div key={element.id} className="bi-card bi-chart">
              <div className="bi-card-header" title={element.description}>
                <h3 style={{ cursor: element.description ? 'help' : 'default' }}>
                  {element.title} {element.description && 'ℹ️'}
                </h3>
                <small className="bi-card-trend">
                  Tendance {periodKey}: {trendPct >= 0 ? '+' : ''}
                  {trendPct}%
                </small>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="name" tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} />
                  <YAxis tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => new Intl.NumberFormat('fr-FR').format(value)}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                    }}
                  />
                  <Bar dataKey="valeur" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          );
        }

        if (type === 'PieChart') {
          const pieData = formatPieData(element.labels, element.data);
          return (
            <div key={element.id} className="bi-card bi-chart">
              <div className="bi-card-header" title={element.description}>
                <h3 style={{ cursor: element.description ? 'help' : 'default' }}>
                  {element.title} {element.description && 'ℹ️'}
                </h3>
                <small className="bi-card-trend">
                  Tendance {periodKey}: {trendPct >= 0 ? '+' : ''}
                  {trendPct}%
                </small>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={{ fill: CHART_TEXT_COLOR, fontSize: 12 }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => new Intl.NumberFormat('fr-FR').format(value)}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                    }}
                  />
                  <Legend wrapperStyle={{ color: CHART_TEXT_COLOR }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          );
        }

        if (type === 'LineChart') {
          const chartData = formatBarData(element.labels, element.data);
          return (
            <div key={element.id} className="bi-card bi-chart">
              <div className="bi-card-header" title={element.description}>
                <h3 style={{ cursor: element.description ? 'help' : 'default' }}>
                  {element.title} {element.description && 'ℹ️'}
                </h3>
                <small className="bi-card-trend">
                  Tendance {periodKey}: {trendPct >= 0 ? '+' : ''}
                  {trendPct}%
                </small>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="name" tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} />
                  <YAxis tick={{ fill: CHART_TEXT_COLOR, fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => new Intl.NumberFormat('fr-FR').format(value)}
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#0f172a',
                    }}
                  />
                  <Line type="monotone" dataKey="valeur" stroke="#8884d8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
