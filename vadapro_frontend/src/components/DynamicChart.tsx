import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import processService from '../services/processService';
import { API_BASE } from '../utils/axiosConfig';

type Props = {
  processId: string | null;
  entryId?: string | null;
  style?: React.CSSProperties;
};

// Minimal CSV parser (kept as is)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  const regex = /(?:\s*"([^"]*(?:""[^"]*)*)"\s*|\s*([^",\r\n]+)\s*|\s*)(?:,|\r?\n|$)/g;
  let row: string[] = [];
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    if (regex.lastIndex === lastIndex) break;
    lastIndex = regex.lastIndex;
    const quoted = match[1];
    const plain = match[2];
    const value = quoted !== undefined ? quoted.replace(/""/g, '"') : (plain ?? '');
    row.push(value);
    const sep = text.charAt(regex.lastIndex - 1);
    if (sep === '\n' || sep === '\r') {
      rows.push(row);
      row = [];
    }
  }
  if (row.length > 0) rows.push(row);
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

const DynamicChart: React.FC<Props> = ({ processId, entryId, style }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  const [chartType, setChartType] = useState<'bar' | 'line' | 'scatter' | 'pie'>('bar');
  const [csvSource, setCsvSource] = useState<string[][] | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [selectedX, setSelectedX] = useState<string | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);
  const [pieNameCol, setPieNameCol] = useState<string | null>(null);
  const [pieValueCol, setPieValueCol] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load CSV (kept as is)
  useEffect(() => {
    let cancelled = false;
    const loadCsv = async () => {
      if (!processId && !entryId) return;
      setLoading(true);
      setLoadError(null);

      const setCsvState = (parsed: string[][]) => {
        setCsvSource(parsed);
        if (parsed.length > 0) {
          const headers = parsed[0];
          // Filter out empty rows when determining initial state
          const rows = parsed.slice(1).filter(r => r.some(c => c !== ''));
          setColumns(headers);
          setSelectedX(headers[0] || null);
          // Initial series selection should consider if there are actual numeric columns
          const defaultSeries = headers.slice(1);
          setSelectedSeries(defaultSeries);
          setPieNameCol(headers[0] || null);
          setPieValueCol(headers[1] || null);
        }
      };

      // Try processService first
      try {
        if (processId) {
          const resp = await processService.getCsvData(processId);
          if (resp?.success && resp.csvUrl) {
            const r = await fetch(resp.csvUrl);
            if (r.ok) {
              const text = await r.text();
              if (cancelled) return;
              const parsed = parseCsv(text);
              setCsvState(parsed);
              setLoading(false);
              return;
            }
          }
        }
      } catch (e) {
        console.debug('processService.getCsvData failed, fallback to GridFS', e);
      }

      // Fallback GridFS
      try {
        const base = API_BASE;
        const idToUse = entryId || processId;
        if (!idToUse) { setLoading(false); return; }

        const r2 = await fetch(`${base}/file/gridfs/${idToUse}`);
        if (!r2.ok) {
          const msg = `GridFS CSV fetch failed: ${r2.status}`;
          console.error(msg);
          setLoadError(msg);
          setLoading(false);
          return;
        }
        const text2 = await r2.text();
        if (cancelled) return;
        const parsed2 = parseCsv(text2);
        setCsvState(parsed2);
        setLoading(false);
      } catch (e) {
        console.error('Failed to load CSV for DynamicChart', e);
        setLoadError(String(e));
        setLoading(false);
      }
    };

    loadCsv();
    return () => { cancelled = true; };
  }, [processId, entryId]);

  // Initialize ECharts (kept as is)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const initChart = () => {
      if (!chartRef.current) chartRef.current = echarts.init(container);
      chartRef.current.resize();
    };

    initChart();
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  // Update chart on csvSource or chartType change
  useEffect(() => {
    if (!chartRef.current || !csvSource || csvSource.length === 0) return;
    const header = csvSource[0];
    const rows = csvSource.slice(1).filter(r => r.some(c => c !== ''));

    let option: echarts.EChartsOption = {
      tooltip: { trigger: chartType === 'pie' ? 'item' : 'axis' },
      legend: { type: 'scroll', bottom: 0 }, 
      // CHANGE 1: Move toolbox to the top-left corner
      toolbox: { 
        feature: { saveAsImage: {} },
        left: 10, // Align with the options panel padding
        top: 10,  // Push it down from the top edge
      }
    };

    if (chartType === 'pie') {
      const nameIdx = header.indexOf(pieNameCol || header[0]);
      const valIdx = header.indexOf(pieValueCol || header[1]);
      const data = rows.map(r => ({ name: r[nameIdx], value: Number(r[valIdx]) || 0 }));
      option = { ...option, series: [{ type: 'pie', radius: '55%', center: ['50%', '45%'], data }] };
    } else {
      const xIdx = header.indexOf(selectedX || header[0]);
      const xData = rows.map(r => r[xIdx]);
      const series: echarts.SeriesOption[] = [];
      const colsToUse = selectedSeries.length > 0 ? selectedSeries : header.slice(1);
      colsToUse.forEach(colName => {
        const col = header.indexOf(colName);
        if (col < 0) return;
        const data = rows.map(r => {
          const n = Number(r[col]);
          return Number.isNaN(n) ? (r[col] || null) : n;
        });
        series.push({ type: chartType, name: colName, data });
      });
      option = { 
        ...option, 
        // CHANGE 2: Adjust grid to provide symmetric padding for the chart plot area
        grid: { 
          left: 40, 
          right: 40,
          top: 60, // Push chart down to avoid toolbox/title collision
          bottom: 60, 
          containLabel: true 
        },
        xAxis: { type: 'category', data: xData }, 
        yAxis: { type: 'value' }, 
        series 
      };
    }

    chartRef.current.setOption(option, true);
  }, [csvSource, chartType, selectedX, selectedSeries, pieNameCol, pieValueCol]);

  return (
    // CHANGE 3: Apply padding to the main container
    <div style={{ ...style, display: 'flex', gap: 12, height: style?.height || 1600, padding: 10 }}>
      
      {/* Options Column - Apply left/right padding to align content */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 12, 
        minWidth: 200, 
        maxWidth: 300, 
        overflowY: 'auto', 
        // Removed inner padding since outer container handles it
      }}>
        
        {/* Chart Type Selector */}
        <div>
          <label>Chart type: </label>
          <select value={chartType} onChange={e => setChartType(e.target.value as any)} style={{ width: '100%' }}>
            <option value="bar">Bar</option>
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="pie">Pie</option>
          </select>
        </div>

        {/* Dynamic Column Selectors based on Chart Type (omitted for brevity, unchanged) */}
        {columns.length > 0 && (
          chartType !== 'pie' ? (
            <>
              {/* X Axis Selector (for Bar, Line, Scatter) */}
              <div>
                <label>X axis: </label>
                <select value={selectedX || columns[0]} onChange={e => setSelectedX(e.target.value)} style={{ width: '100%' }}>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              {/* Series Selector (for Bar, Line, Scatter) - Multiple select */}
              <div>
                <label>Series: </label>
                <select 
                  multiple 
                  size={Math.min(10, columns.length > 1 ? columns.length - 1 : 1)} 
                  value={selectedSeries} 
                  onChange={e => setSelectedSeries(Array.from(e.target.selectedOptions).map(o => o.value))} 
                  style={{ width: '100%' }}
                >
                  {columns.filter(c => c !== selectedX).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              {/* Pie Chart Name Column Selector */}
              <div>
                <label>Name column: </label>
                <select value={pieNameCol || columns[0]} onChange={e => setPieNameCol(e.target.value)} style={{ width: '100%' }}>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              {/* Pie Chart Value Column Selector */}
              <div>
                <label>Value column: </label>
                <select value={pieValueCol || columns[1]} onChange={e => setPieValueCol(e.target.value)} style={{ width: '100%' }}>
                  {columns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </>
          )
        )}
        
        {/* Loading/Error Status */}
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #eee' }}>
          {loading && <span>Loading CSV...</span>}
          {loadError && <span style={{ color: 'red' }}>CSV load error</span>}
        </div>
        
      </div>

      {/* Chart Container Column - Takes up the remaining space */}
      <div 
        ref={containerRef} 
        style={{ 
          flexGrow: 1, 
          height: '250%', 
        }} 
      />
      
    </div>
  );
};

export default DynamicChart;