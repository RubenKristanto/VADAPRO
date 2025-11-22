import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import Papa from 'papaparse';
import './ChartGenerator.css';

const ChartGenerator = ({ entryId }) => {
  const [showModal, setShowModal] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [chartType, setChartType] = useState('bar');
  const [charts, setCharts] = useState([]);
  const [currentChartIndex, setCurrentChartIndex] = useState(0);
  const chartRefs = useRef([]);

  // Load CSV questions
  useEffect(() => {
    if (!entryId) return;
    const loadQuestions = async () => {
      try {
        const csvUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/file/gridfs/${entryId}`;
        const response = await fetch(csvUrl);
        const text = await response.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        const cols = Object.keys(parsed.data[0] || {});
        setQuestions(cols);
      } catch (error) {
        console.error('Error loading CSV:', error);
      }
    };
    loadQuestions();
  }, [entryId]);

  // Generate chart
  const handleGenerateChart = async () => {
    if (!selectedQuestion || !entryId) return;
    
    try {
      const csvUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/file/gridfs/${entryId}`;
      const response = await fetch(csvUrl);
      const text = await response.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      
      const responses = parsed.data.map(row => row[selectedQuestion]).filter(v => v);
      const counts = {};
      responses.forEach(r => counts[r] = (counts[r] || 0) + 1);
      
      const newChart = {
        id: Date.now(),
        question: selectedQuestion,
        chartType,
        data: counts
      };
      
      setCharts(prev => [...prev, newChart]);
      setCurrentChartIndex(charts.length);
      setShowModal(false);
      setSelectedQuestion(null);
    } catch (error) {
      console.error('Error generating chart:', error);
    }
  };

  // Render charts
  useEffect(() => {
    charts.forEach((chart, idx) => {
      if (!chartRefs.current[idx]) return;
      
      const chartInstance = echarts.init(chartRefs.current[idx]);
      const labels = Object.keys(chart.data);
      const values = Object.values(chart.data);
      
      let option;
      if (chart.chartType === 'pie') {
        option = {
          tooltip: { trigger: 'item' },
          legend: { type: 'scroll', bottom: 0 },
          toolbox: { feature: { saveAsImage: { title: 'Download' } }, right: 10, top: 10 },
          series: [{ type: 'pie', radius: '50%', data: labels.map((l, i) => ({ name: l, value: values[i] })) }]
        };
      } else {
        option = {
          tooltip: { trigger: 'axis' },
          legend: { type: 'scroll', bottom: 0 },
          toolbox: { feature: { saveAsImage: { title: 'Download' } }, right: 10, top: 10 },
          grid: { left: 60, right: 40, top: 60, bottom: 80, containLabel: true },
          xAxis: { type: 'category', data: labels, axisLabel: { rotate: 45, interval: 0 } },
          yAxis: { type: 'value' },
          series: [{ type: chart.chartType, data: values, name: chart.question }]
        };
      }
      
      chartInstance.setOption(option, true);
      
      const handleResize = () => chartInstance.resize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.dispose();
      };
    });
  }, [charts]);

  const deleteChart = (idx) => {
    setCharts(prev => prev.filter((_, i) => i !== idx));
    setCurrentChartIndex(prev => Math.max(0, Math.min(prev, charts.length - 2)));
  };

  const navigateChart = (direction) => {
    setCurrentChartIndex(prev => {
      if (direction === 'left') return Math.max(0, prev - 1);
      return Math.min(charts.length - 1, prev + 1);
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {charts.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
          <div style={{ fontSize: 80 }}>📊</div>
          <p style={{ fontSize: 18, color: '#666' }}>No charts generated yet</p>
          <button onClick={() => setShowModal(true)} style={{ padding: '12px 24px', fontSize: 16, background: '#4CAF50', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Generate Chart
          </button>
        </div>
      ) : (
        <>
          <button onClick={() => setShowModal(true)} style={{ position: 'absolute', top: 10, left: 10, padding: '8px 16px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', zIndex: 10 }}>
            + Generate Chart
          </button>
          
          <div ref={el => chartRefs.current[currentChartIndex] = el} style={{ width: '100%', height: '100%' }} />
          
          {charts.length > 1 && (
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              <button onClick={() => navigateChart('left')} disabled={currentChartIndex === 0} style={{ padding: '8px 12px', background: currentChartIndex === 0 ? '#ddd' : '#2196F3', color: 'white', border: 'none', borderRadius: 6, cursor: currentChartIndex === 0 ? 'not-allowed' : 'pointer' }}>
                ◀
              </button>
              <span style={{ fontSize: 14, fontWeight: 'bold' }}>{currentChartIndex + 1} / {charts.length}</span>
              <button onClick={() => navigateChart('right')} disabled={currentChartIndex === charts.length - 1} style={{ padding: '8px 12px', background: currentChartIndex === charts.length - 1 ? '#ddd' : '#2196F3', color: 'white', border: 'none', borderRadius: 6, cursor: currentChartIndex === charts.length - 1 ? 'not-allowed' : 'pointer' }}>
                ▶
              </button>
              <button onClick={() => deleteChart(currentChartIndex)} style={{ padding: '8px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', marginLeft: 10 }}>
                ✕
              </button>
            </div>
          )}
          
          {charts.length === 1 && (
            <button onClick={() => deleteChart(0)} style={{ position: 'absolute', top: 10, right: 10, padding: '8px 12px', background: '#f44336', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', zIndex: 10 }}>
              ✕
            </button>
          )}
        </>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowModal(false)}>
          <div style={{ background: 'white', padding: 30, borderRadius: 12, width: '90%', maxWidth: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 24 }}>Generate Chart</h2>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Select Question:</label>
              <select value={selectedQuestion || ''} onChange={e => setSelectedQuestion(e.target.value)} style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #ddd' }}>
                <option value="">-- Choose a question --</option>
                {questions.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            
            <div style={{ marginBottom: 30 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Chart Type:</label>
              <select value={chartType} onChange={e => setChartType(e.target.value)} style={{ width: '100%', padding: 10, fontSize: 14, borderRadius: 6, border: '1px solid #ddd' }}>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="scatter">Scatter Chart</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#9e9e9e', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleGenerateChart} disabled={!selectedQuestion} style={{ padding: '10px 20px', background: selectedQuestion ? '#4CAF50' : '#ddd', color: 'white', border: 'none', borderRadius: 6, cursor: selectedQuestion ? 'pointer' : 'not-allowed' }}>
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartGenerator;
