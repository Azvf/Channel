// 获取DOM元素
const getCurrentTabBtn = document.getElementById('getCurrentTab') as HTMLButtonElement;
const changePageColorBtn = document.getElementById('changePageColor') as HTMLButtonElement;
const showNotificationBtn = document.getElementById('showNotification') as HTMLButtonElement;
const statusElement = document.getElementById('status') as HTMLDivElement;

// 更新状态显示
function updateStatus(message: string, isError = false) {
    statusElement.textContent = message;
    statusElement.style.background = isError 
        ? 'rgba(244, 67, 54, 0.2)' 
        : 'rgba(76, 175, 80, 0.2)';
    statusElement.style.borderColor = isError 
        ? 'rgba(244, 67, 54, 0.4)' 
        : 'rgba(76, 175, 80, 0.4)';
}

// 获取当前标签页信息
getCurrentTabBtn.addEventListener('click', async () => {
    try {
        updateStatus('正在获取标签页信息...');
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab) {
            updateStatus(`当前标签页: ${tab.title || '无标题'}`);
            console.log('当前标签页信息:', tab);
        } else {
            updateStatus('无法获取标签页信息', true);
        }
    } catch (error) {
        console.error('获取标签页信息失败:', error);
        updateStatus('获取失败', true);
    }
});

// 改变页面颜色
changePageColorBtn.addEventListener('click', async () => {
    try {
        updateStatus('正在改变页面颜色...');
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (tab.id) {
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    document.body.style.filter = 'hue-rotate(180deg)';
                }
            });
            updateStatus('页面颜色已改变');
        } else {
            updateStatus('无法访问当前标签页', true);
        }
    } catch (error) {
        console.error('改变页面颜色失败:', error);
        updateStatus('操作失败', true);
    }
});

// 显示通知
showNotificationBtn.addEventListener('click', async () => {
    try {
        updateStatus('正在显示通知...');
        
        // 注意：需要在manifest.json中添加notifications权限
        if (chrome.notifications) {
            chrome.notifications.create({
                type: 'basic',
                title: 'Edge Extension',
                message: '这是一个来自插件的通知！'
            });
            updateStatus('通知已发送');
        } else {
            updateStatus('通知功能不可用', true);
        }
    } catch (error) {
        console.error('显示通知失败:', error);
        updateStatus('通知失败', true);
    }
});

// 初始化
updateStatus('插件已加载，点击按钮开始使用');
