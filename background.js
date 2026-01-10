// 创建右键菜单
browser.contextMenus.create({
  id: "extract-rtings-data",
  title: "Extract Headphone Data",
  contexts: ["page"],
  documentUrlPatterns: ["*://*.rtings.com/headphones/graph/*"]
});

// 监听右键菜单点击
browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "extract-rtings-data") {
    // 向内容脚本发送消息
    browser.tabs.sendMessage(tab.id, {
      action: "extractData"
    }).catch(error => {
      console.error("发送消息失败:", error);
    });
  }
});

// 监听来自内容脚本的消息
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "downloadCSV") {
    console.log("收到下载请求，文件名:", message.filename);
    
    try {
      // 创建Blob并下载
      const blob = new Blob([message.csvContent], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // 使用downloads API下载文件
      browser.downloads.download({
        url: url,
        filename: message.filename,
        conflictAction: 'uniquify',
        saveAs: false
      }).then(downloadId => {
        console.log("下载开始，ID:", downloadId);
        URL.revokeObjectURL(url);
        sendResponse({ success: true, downloadId: downloadId });
      }).catch(error => {
        console.error("下载失败:", error);
        URL.revokeObjectURL(url);
        sendResponse({ success: false, error: error.message });
      });
      
    } catch (error) {
      console.error("创建Blob失败:", error);
      sendResponse({ success: false, error: error.message });
    }
    
    return true; // 保持消息通道开放
  }
  
  // 新增：处理打开查看器请求

  if (message.action === "openViewer") {

    console.log("收到打开查看器请求，数据ID:", message.dataId);

    

    try {

      // 打开新标签页

      browser.tabs.create({

        url: browser.runtime.getURL(`viewer.html?dataId=${message.dataId}`),

        active: true

      }).then(tab => {

        sendResponse({ success: true, tabId: tab.id });

      }).catch(error => {

        console.error("打开查看器失败:", error);

        sendResponse({ success: false, error: error.message });

      });

    } catch (error) {

      console.error("打开查看器失败:", error);

      sendResponse({ success: false, error: error.message });

    }

    

    return true;

  }

  

  // 处理其他消息
  if (message.action === "log") {
    console.log("Content script log:", message.message);
  }

});