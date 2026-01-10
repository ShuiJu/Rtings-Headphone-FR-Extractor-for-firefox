document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const statusDiv = document.getElementById('status');
  
  // 检查当前标签页是否在rtings.com
  browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    const currentTab = tabs[0];
    const isRtingsPage = currentTab.url && currentTab.url.includes('rtings.com/headphones/graph/');
    
    if (isRtingsPage) {
      extractBtn.disabled = false;
      statusDiv.textContent = "点击按钮提取数据";
      statusDiv.className = "status success";
      
      // 更新按钮文本显示当前页面
      const productName = extractProductNameFromUrl(currentTab.url);
      extractBtn.textContent = `提取 ${productName} 数据`;
    } else {
      extractBtn.disabled = true;
      statusDiv.textContent = "请访问 rtings.com/headphones/graph/... 页面";
      statusDiv.className = "status info";
    }
  }).catch(error => {
    console.error("查询标签页失败:", error);
    statusDiv.textContent = "无法获取当前页面信息";
    statusDiv.className = "status error";
  });
  
  // 从URL提取产品名称的辅助函数
  function extractProductNameFromUrl(url) {
    const match = url.match(/rtings\.com\/headphones\/graph\/\d+\/[^\/]+\/([^\/]+)/);
    return match && match[1] ? match[1] : "耳机数据";
  }
  
  // 提取按钮点击事件
  extractBtn.addEventListener('click', function() {
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      const currentTab = tabs[0];
      
      // 向内容脚本发送消息
      browser.tabs.sendMessage(currentTab.id, {
        action: "extractData"
      }).then(response => {
        if (response && response.success) {
          statusDiv.textContent = "数据提取中...";
          statusDiv.className = "status info";
          
          // 3秒后关闭弹出窗口
          setTimeout(() => {
            window.close();
          }, 3000);
        }
      }).catch(error => {
        console.error("发送消息失败:", error);
        statusDiv.textContent = "错误: 请刷新页面后重试";
        statusDiv.className = "status error";
      });
    });
  });
});
