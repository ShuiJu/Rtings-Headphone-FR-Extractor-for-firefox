// 监听来自后台脚本的消息
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extractData") {
    console.log("收到提取数据请求");
    extractAndDownloadData();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "testExtract") {
    console.log("收到测试提取请求");
    const result = testExtractData();
    sendResponse(result);
    return true;
  }
  
  return true;
});

// 主函数：提取数据并打开查看器
async function extractAndDownloadData() {
  try {
    console.log("开始提取数据...");
    
    // 获取当前URL
    const currentUrl = window.location.href;
    console.log("当前URL:", currentUrl);
    
    // 从URL中提取产品名称
    const productName = extractProductNameFromUrl(currentUrl);
    console.log("提取的产品名称:", productName);
    
    // 确定数据后缀（左/右声道）
    const dataSuffix = determineDataSuffix(currentUrl);
    console.log("数据后缀:", dataSuffix);
    
    // 提取数据
    const data = extractDataFromPage();
    console.log("提取到", data.length, "个数据点");
    
    if (data.length === 0) {
      alert("未找到有效数据！请确保在正确的页面上。");
      return;
    }
    
    // 计算偏置值（基于500Hz对齐到+5dB）
    const bias = calculateBias(data);
    console.log("偏置值:", bias);
    
    // 生成CSV内容
    const csvContent = generateCSV(data, bias);
    
    // 生成文件名
    const filename = `${productName}_${dataSuffix}.csv`;
    console.log("文件名:", filename);
    
    // 存储数据并打开查看器
    await openViewerWithData(csvContent, filename, data, productName, dataSuffix, bias);
    
  } catch (error) {
    console.error("提取数据时出错:", error);
    showNotification("提取数据时出错: " + error.message, "error");
  }
}

// 存储数据并打开查看器
async function openViewerWithData(csvContent, filename, rawData, productName, dataSuffix, bias) {
  console.log("存储数据并打开查看器...");
  
  const dataId = 'rtings_' + Date.now() + '_' + Math.random().toString(36).substr(2);
  const storageKey = 'rtings_data_' + dataId;
  
  const storedData = {
    csvContent: csvContent,
    rawData: rawData,
    filename: filename,
    productName: productName,
    dataSuffix: dataSuffix,
    bias: bias,
    timestamp: Date.now()
  };
  
  try {
    // 存储数据
    await browser.storage.local.set({ [storageKey]: storedData });
    console.log("数据已存储，键:", storageKey);
    
    // 发送消息给后台脚本打开查看器
    const response = await browser.runtime.sendMessage({
      action: "openViewer",
      dataId: dataId
    });
    
    if (response && response.success) {
      console.log("查看器打开成功");
      showNotification("数据提取成功！正在打开查看器...", "success");
    } else {
      console.error("打开查看器失败:", response ? response.error : "未知错误");
      showNotification("打开查看器失败，正在下载文件...", "error");
      // 备用方案：直接下载
      await browser.runtime.sendMessage({
        action: "downloadCSV",
        csvContent: csvContent,
        filename: filename
      });
    }
  } catch (error) {
    console.error("打开查看器过程中出错:", error);
    showNotification("打开查看器失败，正在下载文件...", "error");
    // 备用方案：直接下载
    await browser.runtime.sendMessage({
      action: "downloadCSV",
      csvContent: csvContent,
      filename: filename
    });
  }
}

// 显示通知
function showNotification(message, type = "info") {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    background-color: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
    color: white;
    border-radius: 5px;
    z-index: 10000;
    font-family: Arial, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// 从URL中提取产品名称
function extractProductNameFromUrl(url) {
  console.log("从URL提取产品名称:", url);
  
  const urlPatterns = [
    /rtings\.com\/headphones\/graph\/\d+\/[^\/]+\/([^\/]+)/,
    /rtings\.com\/[^\/]+\/([^\/]+)\/graph/,
    /rtings\.com\/[^\/]+\/([^\/]+)\/test/
  ];
  
  for (const pattern of urlPatterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      console.log("匹配到产品名称:", match[1]);
      return match[1];
    }
  }
  
  const title = document.title;
  console.log("页面标题:", title);
  
  const titlePatterns = [
    /(.+?)\s*Headphones/,
    /(.+?)\s*Review/,
    /(.+?)\s*-\s*RTINGS/
  ];
  
  for (const pattern of titlePatterns) {
    const match = title.match(pattern);
    if (match && match[1]) {
      const productName = match[1]
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]/g, '');
      console.log("从标题提取的产品名称:", productName);
      return productName;
    }
  }
  
  console.log("未找到产品名称，使用默认值");
  return "headphone_data";
}

// 确定数据后缀（raw-fr-l 或 raw-fr-r）
function determineDataSuffix(url) {
  console.log("确定数据后缀，URL:", url);
  
  if (url.includes('/raw-fr-l/')) {
    return 'raw-fr-l';
  } else if (url.includes('/raw-fr-r/')) {
    return 'raw-fr-r';
  } else if (url.includes('/raw-fr/')) {
    return 'raw-fr';
  }
  
  const pageText = document.body.textContent;
  if (pageText.includes('Left') || pageText.includes('left')) {
    return 'raw-fr-l';
  } else if (pageText.includes('Right') || pageText.includes('right')) {
    return 'raw-fr-r';
  }
  
  return 'raw-fr';
}

// 从页面提取数据
function extractDataFromPage() {
  console.log("开始从页面提取数据...");
  const data = [];
  
  // 查找所有表格
  const tables = document.querySelectorAll('table');
  console.log("找到", tables.length, "个表格");
  
  tables.forEach((table, index) => {
    console.log(`表格 ${index + 1}:`, table);
    const rows = table.querySelectorAll('tr');
    console.log(`表格 ${index + 1} 有 ${rows.length} 行`);
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        try {
          const freqText = cells[0].textContent.replace(/,/g, '').trim();
          const ampText = cells[1].textContent.trim();
          
          console.log(`行 ${rowIndex}: 频率=${freqText}, 振幅=${ampText}`);
          
          const freq = parseFloat(freqText);
          const amp = parseFloat(ampText);
          
          if (!isNaN(freq) && !isNaN(amp)) {
            data.push({ freq, amp });
            console.log(`添加数据点: ${freq} Hz, ${amp} dB`);
          }
        } catch (error) {
          console.error(`解析行 ${rowIndex} 时出错:`, error);
        }
      }
    });
  });
  
  // 如果没有找到表格数据，尝试从图表数据中提取
  if (data.length === 0) {
    console.log("未找到表格数据，尝试从图表提取...");
    const chartData = extractDataFromCharts();
    data.push(...chartData);
    console.log("从图表提取到", chartData.length, "个数据点");
  }
  
  // 去重并排序
  const uniqueData = Array.from(
    new Map(data.map(item => [`${item.freq}_${item.amp}`, item])).values()
  ).sort((a, b) => a.freq - b.freq);
  
  console.log("去重排序后数据点数量:", uniqueData.length);
  return uniqueData;
}

// 从图表中提取数据（备用方法）
function extractDataFromCharts() {
  const data = [];
  
  const scripts = document.querySelectorAll('script');
  console.log("找到", scripts.length, "个script标签");
  
  scripts.forEach((script, index) => {
    const scriptContent = script.textContent;
    
    const patterns = [
      /data:\s*(\\[.*?\\])/,
      /series:\s*(\\[.*?\\])/,
      /points:\s*(\\[.*?\\])/,
      /"data":\s*(\\[.*?\\])/,
      /"y":\s*(\\[.*?\\])/,
      /"x":\s*(\\[.*?\\])/
    ];
    
    patterns.forEach(pattern => {
      const matches = scriptContent.match(new RegExp(pattern, 'g'));
      if (matches) {
        matches.forEach(match => {
          try {
            const jsonMatch = match.match(/\\[.*\\]/);
            if (jsonMatch) {
              const jsonData = JSON.parse(jsonMatch[0]);
              if (Array.isArray(jsonData)) {
                jsonData.forEach(item => {
                  if (item.x !== undefined && item.y !== undefined) {
                    data.push({ freq: item.x, amp: item.y });
                  } else if (Array.isArray(item) && item.length >= 2) {
                    data.push({ freq: item[0], amp: item[1] });
                  }
                });
              }
            }
          } catch (error) {
            // 忽略JSON解析错误
          }
        });
      }
    });
  });
  
  return data;
}

// 计算偏置值（基于500Hz对齐到+5dB）
function calculateBias(data) {
  if (data.length === 0) return 0;
  
  console.log("计算500Hz对齐偏置值...");
  
  // 找到最接近500Hz的数据点
  let closestPoint = null;
  let minDiff = Infinity;
  
  for (const point of data) {
    const diff = Math.abs(point.freq - 500);
    if (diff < minDiff) {
      minDiff = diff;
      closestPoint = point;
    }
  }
  
  if (closestPoint && minDiff < 100) { // 允许100Hz的误差范围
    console.log("最接近500Hz的点:", closestPoint.freq.toFixed(1), "Hz, 幅度:", closestPoint.amp.toFixed(6), "dB");
    console.log("与500Hz的差异:", minDiff.toFixed(1), "Hz");
    
    // 计算偏移量使得500Hz处的幅度为+5dB
    const offset = 5 - closestPoint.amp;
    console.log("500Hz对齐偏移量:", offset.toFixed(6), "dB");
    console.log("调整后500Hz处幅度:", (closestPoint.amp + offset).toFixed(6), "dB");
    
    return offset;
  }
  
  // 如果没有找到接近500Hz的点，使用原来的逻辑
  console.log("未找到接近500Hz的点，使用最小幅度对齐");
  const minAmp = Math.min(...data.map(item => item.amp));
  console.log("最小振幅值:", minAmp.toFixed(6), "dB");
  
  const bias = minAmp < 0 ? -minAmp : 0;
  console.log("偏置值:", bias.toFixed(6), "dB");
  
  return bias;
}

// 生成CSV内容
function generateCSV(data, bias) {
  console.log("生成CSV内容，数据点数量:", data.length);
  
  let csv = "Frequency_Hz,Amplitude_dB\n";
  
  data.forEach((item, index) => {
    const adjustedAmp = (item.amp + bias).toFixed(6);
    csv += `${item.freq},${adjustedAmp}\n`;
    
    if (index < 5) {
      console.log(`数据点 ${index}: ${item.freq} Hz -> ${adjustedAmp} dB`);
    }
  });
  
  console.log("CSV内容长度:", csv.length, "字符");
  return csv;
}

// 添加调试按钮
function addDebugButton() {
  const debugButton = document.createElement('button');
  debugButton.textContent = '调试提取';
  debugButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 10px 15px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    z-index: 9999;
  `;
  
  debugButton.onclick = () => {
    console.log("=== 调试信息 ===");
    console.log("URL:", window.location.href);
    console.log("产品名称:", extractProductNameFromUrl(window.location.href));
    console.log("数据后缀:", determineDataSuffix(window.location.href));
    
    const data = extractDataFromPage();
    console.log("提取的数据:", data);
    
    if (data.length > 0) {
      const bias = calculateBias(data);
      console.log("偏置值:", bias);
      console.log("前5个调整后的数据点:");
      data.slice(0, 5).forEach(item => {
        console.log(`${item.freq} Hz: ${item.amp} dB -> ${(item.amp + bias).toFixed(6)} dB`);
      });
    }
  };
  
  document.body.appendChild(debugButton);
}

// 测试数据提取
function testExtractData() {
  try {
    console.log("测试数据提取...");
    
    const currentUrl = window.location.href;
    const productName = extractProductNameFromUrl(currentUrl);
    const dataSuffix = determineDataSuffix(currentUrl);
    const data = extractDataFromPage();
    const bias = calculateBias(data);
    const csvContent = generateCSV(data, bias);
    const filename = `${productName}_${dataSuffix}.csv`;
    
    return {
      success: true,
      data: data,
      productName: productName,
      dataSuffix: dataSuffix,
      bias: bias,
      filename: filename,
      csvLength: csvContent.length,
      dataPoints: data.length
    };
    
  } catch (error) {
    console.error("测试提取失败:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// 页面加载完成后添加调试按钮
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addDebugButton);
} else {
  addDebugButton();
}
