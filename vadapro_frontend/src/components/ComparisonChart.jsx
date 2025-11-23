import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import './ComparisonChart.css';

const ComparisonChart = ({ comparisons, currentIndex, onNavigate, onDelete }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!comparisons[currentIndex] || !chartRef.current) return;
    
    const chart = echarts.init(chartRef.current);
    const comparison = comparisons[currentIndex];
    
    const option = {
      title: {
        text: `Comparison: ${comparison.question}`,
        left: 'center',
        top: 10,
        textStyle: { fontSize: 16, fontWeight: 'bold' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let result = `${params[0].axisValue}<br/>`;
          params.forEach(p => {
            result += `${p.marker} ${p.seriesName}: ${p.value}<br/>`;
          });
          return result;
        }
      },
      legend: {
        type: 'scroll',
        bottom: 10,
        data: comparison.entries.map(e => e.entryName)
      },
      toolbox: {
        feature: {
          saveAsImage: { title: 'Download' }
        },
        right: 10,
        top: 10
      },
      grid: {
        left: 60,
        right: 40,
        top: 80,
        bottom: 80,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: comparison.entries.map(e => e.year),
        name: 'Work Year',
        nameLocation: 'middle',
        nameGap: 35,
        axisLabel: {
          rotate: 45,
          interval: 0
        }
      },
      yAxis: {
        type: 'value',
        name: 'Mean Value',
        nameLocation: 'middle',
        nameGap: 50
      },
      series: [{
        name: comparison.question,
        type: 'line',
        data: comparison.entries.map(e => e.meanValue),
        smooth: true,
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8,
        itemStyle: {
          color: '#2196F3',
          borderWidth: 2,
          borderColor: '#fff'
        },
        markPoint: {
          data: [
            { type: 'max', name: 'Max' },
            { type: 'min', name: 'Min' }
          ]
        },
        markLine: {
          data: [{ type: 'average', name: 'Average' }]
        }
      }]
    };
    
    chart.setOption(option, true);
    
    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [comparisons, currentIndex]);

  if (comparisons.length === 0) return null;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        background: 'rgba(255,255,255,0.9)',
        padding: 10,
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 10
      }}>
        {comparisons.length > 1 && (
          <>
            <button
              onClick={() => onNavigate('left')}
              disabled={currentIndex === 0}
              style={{
                padding: '8px 12px',
                background: currentIndex === 0 ? '#ddd' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              ◀
            </button>
            <span style={{ fontSize: 14, fontWeight: 'bold' }}>
              {currentIndex + 1} / {comparisons.length}
            </span>
            <button
              onClick={() => onNavigate('right')}
              disabled={currentIndex === comparisons.length - 1}
              style={{
                padding: '8px 12px',
                background: currentIndex === comparisons.length - 1 ? '#ddd' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: currentIndex === comparisons.length - 1 ? 'not-allowed' : 'pointer'
              }}
            >
              ▶
            </button>
          </>
        )}
        <button
          onClick={() => onDelete(currentIndex)}
          style={{
            padding: '8px 12px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            marginLeft: comparisons.length > 1 ? 10 : 0
          }}
        >
          ✕
        </button>
      </div>
      
      <div ref={chartRef} style={{ width: '100%', height: '50vh', marginTop: '60px' }} />
    </div>
  );
};

export default ComparisonChart;
