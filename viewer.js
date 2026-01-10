document.addEventListener('DOMContentLoaded', function() {
  const statusDiv = document.getElementById('status');
  const infoPanel = document.getElementById('infoPanel');
  const productNameSpan = document.getElementById('productName');
  const filenameSpan = document.getElementById('filename');
  const channelSpan = document.getElementById('channel');
  const dataPointsSpan = document.getElementById('dataPoints');
  const biasSpan = document.getElementById('bias');
  const freqRangeSpan = document.getElementById('freqRange');
  const ampRangeSpan = document.getElementById('ampRange');
  const downloadBtn = document.getElementById('downloadBtn');
  const resetViewBtn = document.getElementById('resetViewBtn');
  const toggleTableBtn = document.getElementById('toggleTableBtn');
  const tableContainer = document.getElementById('tableContainer');
  const dataTableBody = document.querySelector('#dataTable tbody');
  const chartCanvas = document.getElementById('chartCanvas');
  
  let storedData = null;
  let rawData = [];
  let csvContent = '';
  let filename = '';
  
  // 从URL获取dataId
  const urlParams = new URLSearchParams(window.location.search);
  const dataId = urlParams.get('dataId');
  
  if (!dataId) {
    statusDiv.textContent = '错误: 未提供数据ID';
    statusDiv.className = 'status error';
    return;
  }
  
  // 加载存储的数据
  loadStoredData(dataId);
  
  async function loadStoredData(dataId) {
    const storageKey = 'rtings_data_' + dataId;
    try {
      const result = await browser.storage.local.get(storageKey);
      if (result[storageKey]) {
        storedData = result[storageKey];
        rawData = storedData.rawData;
        csvContent = storedData.csvContent;
        filename = storedData.filename;
        
        // 更新UI
        updateInfoPanel();
        statusDiv.textContent = '数据加载成功';
        statusDiv.className = 'status success';
        infoPanel.classList.remove('hidden');
        
        // 渲染图表
        renderChart();
        
        // 填充表格
        populateTable();
      } else {
        statusDiv.textContent = '错误: 未找到数据';
        statusDiv.className = 'status error';
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      statusDiv.textContent = '错误: 加载数据失败 - ' + error.message;
      statusDiv.className = 'status error';
    }
  }
  
function updateInfoPanel() {
  productNameSpan.textContent = storedData.productName || '未知';
  filenameSpan.textContent = storedData.filename || '未知';
  channelSpan.textContent = storedData.dataSuffix || '未知';
  dataPointsSpan.textContent = rawData.length;
  
  // 显示偏置值（基于500Hz对齐到+5dB）
  const bias = storedData.bias || 0;
  biasSpan.textContent = bias.toFixed(6);
  
  // 查找500Hz附近的数据点
  let fiveHundredHzFound = false;
  let closestFreq = 0;
  let originalAmp = 0;
  
  if (rawData.length > 0) {
    // 找到最接近500Hz的点
    let closestPoint = null;
    let minDiff = Infinity;
    
    for (const point of rawData) {
      const diff = Math.abs(point.freq - 500);
      if (diff < minDiff) {
        minDiff = diff;
        closestPoint = point;
      }
    }
    
    if (closestPoint && minDiff < 100) {
      fiveHundredHzFound = true;
      closestFreq = closestPoint.freq;
      originalAmp = closestPoint.amp;
      
      // 更新偏置说明
      biasSpan.textContent = `${bias.toFixed(6)} (500Hz对齐到+5dB)`;
    }
  }
  
  // 计算频率和幅度范围（调整后）
  const freqs = rawData.map(d => d.freq);
  const amps = rawData.map(d => d.amp + bias); // 调整后的幅度
  
  if (freqs.length > 0 && amps.length > 0) {
    const minFreq = Math.min(...freqs);
    const maxFreq = Math.max(...freqs);
    const minAmp = Math.min(...amps);
    const maxAmp = Math.max(...amps);
    
    freqRangeSpan.textContent = `${minFreq.toFixed(1)} - ${maxFreq.toFixed(1)}`;
    ampRangeSpan.textContent = `${minAmp.toFixed(2)} - ${maxAmp.toFixed(2)}`;
    
    // 添加500Hz对齐信息
    if (fiveHundredHzFound) {
      const adjustedAmp = originalAmp + bias;
      ampRangeSpan.textContent = `${minAmp.toFixed(2)} - ${maxAmp.toFixed(2)} (500Hz: ${closestFreq.toFixed(1)}Hz → ${adjustedAmp.toFixed(2)}dB)`;
    }
  } else {
    freqRangeSpan.textContent = "N/A";
    ampRangeSpan.textContent = "N/A";
  }
}


  function renderChart() {
    const ctx = chartCanvas.getContext('2d');
    const width = chartCanvas.width;
    const height = chartCanvas.height;
    const padding = { top: 40, right: 40, bottom: 60, left: 80 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 设置图表区域背景
    ctx.fillStyle = '#fff';
    ctx.fillRect(padding.left, padding.top, chartWidth, chartHeight);
    
    // 图表坐标轴范围（符合要求：20-20000Hz，-5dB到+25dB）
    const freqMin = 20;      // 横轴最小值（Hz）
    const freqMax = 20000;   // 横轴最大值（Hz）
    const ampMin = -5;       // 纵轴最小值（dB）
    const ampMax = 25;       // 纵轴最大值（dB）
    
    // 映射函数：将数据坐标转换为画布坐标（频率使用对数刻度）
    const mapX = (freq) => padding.left + (Math.log10(freq) - Math.log10(freqMin)) / (Math.log10(freqMax) - Math.log10(freqMin)) * chartWidth;
    const mapY = (amp) => padding.top + chartHeight - (amp - ampMin) / (ampMax - ampMin) * chartHeight;
    
    // 绘制网格
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // 水平网格线（幅度）
    const ampGridLines = [-10, -5, 0, 5, 10, 15, 20, 25, 30];
    ampGridLines.forEach(amp => {
      const y = mapY(amp);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
      
      // 标签
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(amp + ' dB', padding.left - 10, y + 4);
    });
    
    // 垂直网格线（频率，对数刻度）
    const freqGridLines = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    freqGridLines.forEach(freq => {
      const x = mapX(freq);
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      
      // 标签
      ctx.fillStyle = '#666';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(freq + ' Hz', x, padding.top + chartHeight + 20);
    });
    
    ctx.setLineDash([]);
    
    // 绘制坐标轴
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
    
    // 坐标轴标签
    ctx.fillStyle = '#333';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('频率 (Hz)', padding.left + chartWidth / 2, padding.top + chartHeight + 40);
    ctx.save();
    ctx.translate(padding.left - 40, padding.top + chartHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('幅度 (dB)', 0, 0);
    ctx.restore();
    
    // 绘制数据线
    if (rawData.length > 0) {
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // 按频率排序
      const sortedData = [...rawData].sort((a, b) => a.freq - b.freq);
      
      // 移动到第一个点
      const firstPoint = sortedData[0];
      const firstX = mapX(firstPoint.freq);
      const firstY = mapY(firstPoint.amp + (storedData.bias || 0));
      ctx.moveTo(firstX, firstY);
      
      // 绘制线段
      for (let i = 1; i < sortedData.length; i++) {
        const point = sortedData[i];
        const x = mapX(point.freq);
        const y = mapY(point.amp + (storedData.bias || 0));
        ctx.lineTo(x, y);
      }
      
      ctx.stroke();
      
      // 绘制数据点（数据点较少时显示）
      if (sortedData.length <= 100) {
        ctx.fillStyle = '#007bff';
        sortedData.forEach(point => {
          const x = mapX(point.freq);
          const y = mapY(point.amp + (storedData.bias || 0));
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
    
    // 添加标题
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${storedData.productName} - ${storedData.dataSuffix}`, padding.left, padding.top - 10);
  }
  
  function populateTable() {
    // 清空表格
    dataTableBody.innerHTML = '';
    
    // 限制显示的行数，以免过多
    const displayData = rawData.length > 100 ? rawData.slice(0, 100) : rawData;
    
    displayData.forEach(point => {
      const row = document.createElement('tr');
      const freqCell = document.createElement('td');
      const ampCell = document.createElement('td');
      const adjustedAmpCell = document.createElement('td');
      
      freqCell.textContent = point.freq;
      ampCell.textContent = point.amp.toFixed(6);
      adjustedAmpCell.textContent = (point.amp + (storedData.bias || 0)).toFixed(6);
      
      row.appendChild(freqCell);
      row.appendChild(ampCell);
      row.appendChild(adjustedAmpCell);
      dataTableBody.appendChild(row);
    });
    
    if (rawData.length > 100) {
      const row = document.createElement('tr');
      const cell = document.createElement('td');
      cell.colSpan = 3;
      cell.textContent = `... 还有 ${rawData.length - 100} 行数据未显示`;
      cell.style.textAlign = 'center';
      cell.style.fontStyle = 'italic';
      row.appendChild(cell);
      dataTableBody.appendChild(row);
    }
  }
  
  // 下载按钮事件
  downloadBtn.addEventListener('click', function() {
    if (!csvContent) {
      alert('没有可下载的数据');
      return;
    }
    
    // 使用 downloads API 下载文件
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    browser.downloads.download({
      url: url,
      filename: filename,
      conflictAction: 'uniquify',
      saveAs: false
    }).then(downloadId => {
      console.log('下载开始，ID:', downloadId);
      URL.revokeObjectURL(url);
      alert('文件下载已开始');
    }).catch(error => {
      console.error('下载失败:', error);
      alert('下载失败: ' + error.message);
    });
  });
  
  // 重置视图按钮事件
  resetViewBtn.addEventListener('click', function() {
    renderChart();
  });
  
  // 显示/隐藏表格按钮事件
  toggleTableBtn.addEventListener('click', function() {
    if (tableContainer.classList.contains('hidden')) {
      tableContainer.classList.remove('hidden');
      toggleTableBtn.textContent = '隐藏数据表格';
    } else {
      tableContainer.classList.add('hidden');
      toggleTableBtn.textContent = '显示数据表格';
    }
  });
});
