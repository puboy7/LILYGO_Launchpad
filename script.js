class ESPWebFlasher {
    constructor() {
        this.port = null;
        this.esploader = null;
        this.firmware = null;
        this.connected = false;
        this.flashing = false;
        this.startTime = null;
        this.bytesWritten = 0;
        
        this.initElements();
        this.bindEvents();
        this.checkBrowserSupport();
    }
    
    initElements() {
        // 按钮元素
        this.connectBtn = document.getElementById('connect-btn');
        this.disconnectBtn = document.getElementById('disconnect-btn');
        this.flashBtn = document.getElementById('flash-btn');
        this.eraseBtn = document.getElementById('erase-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        // 文件选择
        this.fileInput = document.getElementById('firmware-file');
        this.chooseFileBtn = document.getElementById('choose-file');
        this.fileName = document.getElementById('file-name');
        
        // 配置元素
        this.flashAddress = document.getElementById('flash-address');
        this.flashSize = document.getElementById('flash-size');
        this.flashMode = document.getElementById('flash-mode');
        this.flashFreq = document.getElementById('flash-freq');
        this.eraseAll = document.getElementById('erase-all');
        this.compress = document.getElementById('compress');
        
        // 进度和状态
        this.progressBar = document.getElementById('progress-bar');
        this.progressText = document.getElementById('progress-text');
        this.speedText = document.getElementById('speed-text');
        this.timeText = document.getElementById('time-text');
        this.statusText = document.getElementById('status-text');
        
        // 日志
        this.logOutput = document.getElementById('log-output');
        this.clearLogBtn = document.getElementById('clear-log');
        this.copyLogBtn = document.getElementById('copy-log');
        
        // 连接状态
        this.connectionStatus = document.getElementById('connection-status');
        
        // 标签页
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
        
        // 帮助模态框
        this.helpModal = document.getElementById('help-modal');
        this.helpBtn = document.getElementById('help-btn');
        this.closeHelpBtn = document.getElementById('close-help');
    }
    
    bindEvents() {
        // 连接按钮
        this.connectBtn.addEventListener('click', () => this.connectDevice());
        this.disconnectBtn.addEventListener('click', () => this.disconnectDevice());
        
        // 文件选择
        this.chooseFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 烧录操作
        this.flashBtn.addEventListener('click', () => this.flashFirmware());
        this.eraseBtn.addEventListener('click', () => this.eraseFlash());
        this.resetBtn.addEventListener('click', () => this.resetDevice());
        
        // 日志操作
        this.clearLogBtn.addEventListener('click', () => this.clearLog());
        this.copyLogBtn.addEventListener('click', () => this.copyLog());
        
        // 标签页切换
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target));
        });
        
        // 帮助模态框
        this.helpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showHelp();
        });
        this.closeHelpBtn.addEventListener('click', () => this.hideHelp());
        
        // 点击模态框外部关闭
        this.helpModal.addEventListener('click', (e) => {
            if (e.target === this.helpModal) {
                this.hideHelp();
            }
        });
    }
    
    checkBrowserSupport() {
        if (!('serial' in navigator)) {
            this.log('错误: 当前浏览器不支持 Web Serial API', 'error');
            this.log('请使用 Chrome 89+、Edge 89+ 或 Opera 76+', 'warning');
            this.connectBtn.disabled = true;
        }
    }
    
    async connectDevice() {
        try {
            this.log('正在请求串口权限...', 'info');
            
            // 请求串口访问权限
            this.port = await navigator.serial.requestPort();
            
            this.log('正在打开串口...', 'info');
            await this.port.open({ baudRate: 115200 });
            
            // 创建 ESPLoader 实例
            this.esploader = new ESPLoader(this.port);
            
            this.log('正在连接 ESP 设备...', 'info');
            const chip = await this.esploader.connect();
            
            this.connected = true;
            this.updateConnectionStatus(true);
            this.log(`连接成功! 芯片类型: ${chip.chip_name}`, 'success');
            this.log(`芯片特性: ${chip.chip_features}`, 'info');
            
            // 根据芯片类型设置默认配置
            this.setDefaultConfig(chip.chip_name);
            
            // 更新按钮状态
            this.flashBtn.disabled = false;
            this.eraseBtn.disabled = false;
            this.resetBtn.disabled = false;
            this.disconnectBtn.disabled = false;
            
        } catch (error) {
            this.log(`连接失败: ${error.message}`, 'error');
            this.log('请确保设备已连接并进入下载模式', 'warning');
        }
    }
    
    async disconnectDevice() {
        try {
            if (this.port) {
                await this.port.close();
            }
            this.connected = false;
            this.updateConnectionStatus(false);
            this.log('设备已断开连接', 'info');
            
            // 重置按钮状态
            this.flashBtn.disabled = true;
            this.eraseBtn.disabled = true;
            this.resetBtn.disabled = true;
            this.disconnectBtn.disabled = true;
            
        } catch (error) {
            this.log(`断开连接失败: ${error.message}`, 'error');
        }
    }
    
    setDefaultConfig(chipName) {
        // 根据芯片类型设置默认配置
        if (chipName.includes('ESP32')) {
            this.flashSize.value = '4MB';
            this.flashMode.value = 'dio';
            this.flashFreq.value = '40m';
        } else if (chipName.includes('ESP8266')) {
            this.flashSize.value = '4MB';
            this.flashMode.value = 'qio';
            this.flashFreq.value = '40m';
        }
    }
    
    async flashFirmware() {
        if (!this.connected || !this.esploader) {
            this.log('错误: 设备未连接', 'error');
            return;
        }
        
        if (!this.firmware) {
            this.log('错误: 请先选择固件文件', 'error');
            return;
        }
        
        this.flashing = true;
        this.startTime = Date.now();
        this.bytesWritten = 0;
        
        try {
            // 解析地址
            const address = this.parseAddress(this.flashAddress.value);
            
            // 擦除 Flash（如果启用）
            if (this.eraseAll.checked) {
                this.log('正在擦除 Flash...', 'info');
                await this.esploader.eraseFlash();
                this.log('Flash 擦除完成', 'success');
            }
            
            // 准备烧录参数
            const flashParams = {
                fileArray: this.firmware,
                flashSize: this.flashSize.value,
                flashMode: this.flashMode.value,
                flashFreq: this.flashFreq.value,
                compress: this.compress.checked,
                eraseAll: false, // 已经单独擦除了
                reportProgress: (progress, written, total) => {
                    this.updateProgress(progress, written, total);
                }
            };
            
            this.log('开始烧录固件...', 'info');
            
            // 烧录固件
            await this.esploader.writeFlash(this.firmware, address);
            
            this.log('固件烧录完成!', 'success');
            
            // 重启设备
            this.log('正在重启设备...', 'info');
            await this.esploader.hardReset();
            this.log('设备已重启', 'success');
            
        } catch (error) {
            this.log(`烧录失败: ${error.message}`, 'error');
        } finally {
            this.flashing = false;
            this.resetProgress();
        }
    }
    
    async eraseFlash() {
        if (!this.connected || !this.esploader) {
            this.log('错误: 设备未连接', 'error');
            return;
        }
        
        try {
            this.log('正在擦除整个 Flash...', 'info');
            await this.esploader.eraseFlash();
            this.log('Flash 擦除完成', 'success');
        } catch (error) {
            this.log(`擦除失败: ${error.message}`, 'error');
        }
    }
    
    async resetDevice() {
        if (!this.connected || !this.esploader) {
            this.log('错误: 设备未连接', 'error');
            return;
        }
        
        try {
            this.log('正在重启设备...', 'info');
            await this.esploader.hardReset();
            this.log('设备已重启', 'success');
        } catch (error) {
            this.log(`重启失败: ${error.message}`, 'error');
        }
    }
    
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const arrayBuffer = e.target.result;
            this.firmware = new Uint8Array(arrayBuffer);
            
            this.fileName.textContent = file.name;
            this.log(`已加载固件: ${file.name} (${this.formatBytes(file.size)})`, 'success');
            
            this.updateFirmwareInfo(file);
        };
        
        reader.readAsArrayBuffer(file);
    }
    
    updateFirmwareInfo(file) {
        const infoDiv = document.getElementById('firmware-info');
        infoDiv.innerHTML = `
            <div class="firmware-details">
                <h3><i class="fas fa-info-circle"></i> 固件信息</h3>
                <p><strong>文件名:</strong> ${file.name}</p>
                <p><strong>大小:</strong> ${this.formatBytes(file.size)}</p>
                <p><strong>类型:</strong> ${file.type || 'application/octet-stream'}</p>
                <p><strong>修改时间:</strong> ${new Date(file.lastModified).toLocaleString()}</p>
            </div>
        `;
    }
    
    updateProgress(progress, written, total) {
        const percentage = Math.round(progress * 100);
        this.progressBar.style.width = `${percentage}%`;
        this.progressText.textContent = `${percentage}%`;
        
        // 计算速度
        const elapsed = (Date.now() - this.startTime) / 1000;
        const speed = written / elapsed;
        this.speedText.textContent = `速度: ${this.formatBytes(speed)}/s`;
        
        // 计算剩余时间
        if (speed > 0) {
            const remaining = (total - written) / speed;
            this.timeText.textContent = `剩余: ${this.formatTime(remaining)}`;
        }
        
        this.bytesWritten = written;
    }
    
    resetProgress() {
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '就绪';
        this.speedText.textContent = '速度: --';
        this.timeText.textContent = '时间: --';
    }
    
    updateConnectionStatus(connected) {
        if (connected) {
            this.connectionStatus.className = 'status connected';
            this.connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i> 设备已连接';
            this.connectBtn.disabled = true;
            this.disconnectBtn.disabled = false;
        } else {
            this.connectionStatus.className = 'status disconnected';
            this.connectionStatus.innerHTML = '<i class="fas fa-times-circle"></i> 未连接设备';
            this.connectBtn.disabled = false;
            this.disconnectBtn.disabled = true;
        }
    }
    
    switchTab(button) {
        const tabId = button.dataset.tab;
        
        // 更新按钮状态
        this.tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // 显示对应内容
        this.tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabId}-tab`) {
                content.classList.add('active');
            }
        });
    }
    
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        
        this.logOutput.appendChild(logEntry);
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }
    
    clearLog() {
        this.logOutput.innerHTML = '';
        this.log('日志已清空', 'info');
    }
    
    async copyLog() {
        try {
            const logText = this.logOutput.textContent;
            await navigator.clipboard.writeText(logText);
            this.log('日志已复制到剪贴板', 'success');
        } catch (error) {
            this.log('复制失败: ' + error.message, 'error');
        }
    }
    
    showHelp() {
        this.helpModal.style.display = 'flex';
    }
    
    hideHelp() {
        this.helpModal.style.display = 'none';
    }
    
    parseAddress(address) {
        if (address.startsWith('0x')) {
            return parseInt(address.substring(2), 16);
        }
        return parseInt(address, 10);
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    formatTime(seconds) {
        if (seconds < 60) return `${seconds.toFixed(1)}秒`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}分${remainingSeconds.toFixed(0)}秒`;
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    const flasher = new ESPWebFlasher();
    flasher.log('ESP Web Flasher 已就绪', 'success');
    flasher.log('点击"连接 ESP 设备"按钮开始', 'info');
    
    // 将实例附加到 window 对象以便调试
    window.espFlasher = flasher;
});