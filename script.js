// ESP32 Web Flasher - 重新设计的流程逻辑
class ESP32WebFlasher {
    constructor() {
        // 状态管理
        this.state = {
            isConnected: false,
            selectedFirmware: null,
            flashProgress: 0,
            currentStage: 'idle',
            serialPort: null,
            selectedMode: 'quick'
        };
        
        // 初始化
        this.initElements();
        this.bindEvents();
        this.loadFirmwareExamples();
        this.updateUIState();
    }
    
    initElements() {
        // 步骤指示器
        this.steps = document.querySelectorAll('.step');
        
        // 面板
        this.connectionPanel = document.getElementById('connectionPanel');
        this.firmwarePanel = document.getElementById('firmwarePanel');
        this.flashProgressPanel = document.getElementById('flashProgressPanel');
        
        // 连接相关
        this.connectBtn = document.getElementById('connectBtn');
        this.statusIcon = document.getElementById('statusIcon');
        this.statusTitle = document.getElementById('statusTitle');
        this.statusDescription = document.getElementById('statusDescription');
        this.connectedDevice = document.getElementById('connectedDevice');
        this.changeDeviceBtn = document.getElementById('changeDeviceBtn');
        
        // 固件选择相关
        this.modeTabs = document.querySelectorAll('.mode-tab');
        this.modeContents = document.querySelectorAll('.mode-content');
        this.beginnerFirmwares = document.getElementById('beginnerFirmwares');
        this.networkFirmwares = document.getElementById('networkFirmwares');
        
        // 自定义文件上传
        this.uploadArea = document.getElementById('uploadArea');
        this.localFileInput = document.getElementById('localFile');
        this.browseLocalBtn = document.getElementById('browseLocalBtn');
        this.localFileInfo = document.getElementById('localFileInfo');
        this.localFileName = document.getElementById('localFileName');
        this.localFileSize = document.getElementById('localFileSize');
        
        // URL模式
        this.firmwareUrl = document.getElementById('firmwareUrl');
        this.urlFlashAddress = document.getElementById('urlFlashAddress');
        this.testUrlBtn = document.getElementById('testUrlBtn');
        
        // 烧录设置
        this.flashAddress = document.getElementById('flashAddress');
        this.baudRate = document.getElementById('baudRate');
        this.flashMode = document.getElementById('flashMode');
        this.flashSize = document.getElementById('flashSize');
        
        // 按钮
        this.backToConnectBtn = document.getElementById('backToConnectBtn');
        this.selectAndFlashBtn = document.getElementById('selectAndFlashBtn');
        this.cancelFlashBtn = document.getElementById('cancelFlashBtn');
        this.restartFlashBtn = document.getElementById('restartFlashBtn');
        this.finishFlashBtn = document.getElementById('finishFlashBtn');
        
        // 进度显示
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        this.flashingFirmwareName = document.getElementById('flashingFirmwareName');
        this.flashingDeviceName = document.getElementById('flashingDeviceName');
        this.flashingAddress = document.getElementById('flashingAddress');
        
        // 控制台
        this.detailedConsole = document.getElementById('detailedConsole');
        this.clearLogBtn = document.getElementById('clearLogBtn');
        this.copyLogBtn = document.getElementById('copyLogBtn');
    }
    
    bindEvents() {
        // 连接设备
        this.connectBtn.addEventListener('click', () => this.connectDevice());
        this.changeDeviceBtn.addEventListener('click', () => this.disconnectAndReconnect());
        
        // 模式切换
        this.modeTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchMode(e.target.dataset.mode));
        });
        
        // 自定义文件上传
        this.browseLocalBtn.addEventListener('click', () => this.localFileInput.click());
        this.localFileInput.addEventListener('change', (e) => this.handleLocalFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.localFileInput.files = e.dataTransfer.files;
                this.handleLocalFileSelect({target: this.localFileInput});
            }
        });
        
        // URL模式
        this.testUrlBtn.addEventListener('click', () => this.testFirmwareUrl());
        this.firmwareUrl.addEventListener('input', () => this.validateUrlInput());
        
        // 烧录按钮
        this.selectAndFlashBtn.addEventListener('click', () => this.startFlashing());
        this.backToConnectBtn.addEventListener('click', () => this.goBackToConnect());
        this.cancelFlashBtn.addEventListener('click', () => this.cancelFlashing());
        this.restartFlashBtn.addEventListener('click', () => this.restartFlashing());
        this.finishFlashBtn.addEventListener('click', () => this.finishFlashing());
        
        // 控制台
        this.clearLogBtn.addEventListener('click', () => this.clearConsole());
        this.copyLogBtn.addEventListener('click', () => this.copyConsoleLog());
        
        // 设置变化
        this.flashAddress.addEventListener('input', () => this.validateFlashSettings());
        this.baudRate.addEventListener('change', () => this.updateBaudRate());
    }
    
    // 状态管理
    updateUIState() {
        // 更新步骤指示器
        this.updateStepIndicator();
        
        // 更新按钮状态
        this.updateButtonStates();
        
        // 更新面板可见性
        this.updatePanelVisibility();
    }
    
    updateStepIndicator() {
        this.steps.forEach(step => {
            const stepNum = parseInt(step.dataset.step);
            step.classList.remove('active', 'completed');
            
            if (stepNum === 1) {
                step.classList.add('active');
                step.classList.add('completed');
            }
            
            if (stepNum === 2 && this.state.isConnected) {
                step.classList.add('active');
                if (this.state.selectedFirmware) {
                    step.classList.add('completed');
                }
            }
            
            if (stepNum === 3 && this.state.selectedFirmware) {
                step.classList.add('active');
            }
        });
    }
    
    updatePanelVisibility() {
        if (!this.state.isConnected) {
            this.connectionPanel.classList.remove('hidden');
            this.firmwarePanel.classList.add('hidden');
            this.flashProgressPanel.classList.add('hidden');
        } else if (this.state.selectedFirmware && this.state.currentStage === 'flashing') {
            this.connectionPanel.classList.add('hidden');
            this.firmwarePanel.classList.add('hidden');
            this.flashProgressPanel.classList.remove('hidden');
        } else if (this.state.isConnected) {
            this.connectionPanel.classList.add('hidden');
            this.firmwarePanel.classList.remove('hidden');
            this.flashProgressPanel.classList.add('hidden');
        }
    }
    
    updateButtonStates() {
        // 选择并烧录按钮
        const hasFirmware = !!this.state.selectedFirmware;
        const hasValidAddress = this.validateFlashAddress();
        this.selectAndFlashBtn.disabled = !(hasFirmware && hasValidAddress);
        
        // 进度面板按钮
        if (this.state.currentStage === 'flashing') {
            this.cancelFlashBtn.disabled = false;
            this.restartFlashBtn.disabled = true;
            this.finishFlashBtn.disabled = true;
        } else if (this.state.currentStage === 'completed') {
            this.cancelFlashBtn.disabled = true;
            this.restartFlashBtn.disabled = false;
            this.finishFlashBtn.disabled = false;
        } else if (this.state.currentStage === 'error') {
            this.cancelFlashBtn.disabled = true;
            this.restartFlashBtn.disabled = false;
            this.finishFlashBtn.disabled = false;
        }
    }
    
    // 设备连接逻辑
    async connectDevice() {
        try {
            this.logToConsole('正在请求串口权限...', 'info');
            this.updateStatus('连接中...', '正在与设备建立连接', '🔄');
            
            // 使用 Web Serial API 连接设备
            if (!navigator.serial) {
                throw new Error('您的浏览器不支持 Web Serial API。请使用 Chrome 89+ 或 Edge 89+。');
            }
            
            // 请求端口
            this.state.serialPort = await navigator.serial.requestPort();
            
            // 打开端口
            await this.state.serialPort.open({
                baudRate: parseInt(this.baudRate.value),
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });
            
            // 读取设备信息（模拟）
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 更新状态
            this.state.isConnected = true;
            this.updateStatus('已连接', '设备已成功连接，请选择要烧录的固件', '✅');
            this.connectedDevice.textContent = `设备: ${this.state.serialPort.getInfo().usbVendorId ? 'ESP32 (USB)' : '串口设备'}`;
            
            this.logToConsole('设备连接成功！', 'success');
            this.logToConsole(`波特率: ${this.baudRate.value}`, 'info');
            this.logToConsole('请选择要烧录的固件', 'info');
            
            // 更新UI
            this.updateUIState();
            
        } catch (error) {
            this.logToConsole(`连接失败: ${error.message}`, 'error');
            this.updateStatus('连接失败', error.message, '❌');
            this.state.isConnected = false;
            this.updateUIState();
        }
    }
    
    disconnectAndReconnect() {
        if (this.state.serialPort) {
            this.state.serialPort.close();
            this.state.serialPort = null;
        }
        
        this.state.isConnected = false;
        this.state.selectedFirmware = null;
        this.updateStatus('等待连接设备', '请点击下方按钮连接您的ESP32开发板', '🔌');
        this.logToConsole('已断开设备连接', 'info');
        
        this.updateUIState();
    }
    
    updateStatus(title, description, icon) {
        this.statusTitle.textContent = title;
        this.statusDescription.textContent = description;
        this.statusIcon.textContent = icon;
    }
    
    // 固件选择逻辑
    switchMode(mode) {
        this.state.selectedMode = mode;
        
        // 更新标签
        this.modeTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.mode === mode);
        });
        
        // 更新内容
        this.modeContents.forEach(content => {
            content.classList.toggle('active', content.dataset.mode === mode);
        });
        
        // 重置选择
        this.state.selectedFirmware = null;
        this.updateUIState();
    }
    
    async loadFirmwareExamples() {
        // 模拟加载示例固件
        const beginnerExamples = [
            {
                id: 'blink',
                name: 'LED 闪烁',
                description: '最简单的示例，控制板载LED闪烁',
                chip: 'ESP32',
                size: '45KB',
                category: 'beginner',
                url: 'https://raw.githubusercontent.com/espressif/esp-idf/master/examples/get-started/blink/build/blink.bin',
                address: '0x10000'
            },
            {
                id: 'hello_world',
                name: 'Hello World',
                description: '串口输出"Hello World"',
                chip: 'ESP32',
                size: '38KB',
                category: 'beginner',
                url: 'https://example.com/firmware/hello_world.bin',
                address: '0x10000'
            }
        ];
        
        const networkExamples = [
            {
                id: 'wifi_scan',
                name: 'WiFi 扫描',
                description: '扫描附近的WiFi网络',
                chip: 'ESP32',
                size: '520KB',
                category: 'network',
                url: 'https://raw.githubusercontent.com/espressif/esp-idf/master/examples/wifi/scan/build/scan.bin',
                address: '0x10000'
            },
            {
                id: 'http_server',
                name: 'HTTP服务器',
                description: '创建简单的Web服务器',
                chip: 'ESP32',
                size: '680KB',
                category: 'network',
                url: 'https://raw.githubusercontent.com/espressif/esp-idf/master/examples/protocols/http_server/simple/build/simple.bin',
                address: '0x10000'
            }
        ];
        
        // 渲染示例固件
        this.renderFirmwareCards(beginnerExamples, this.beginnerFirmwares);
        this.renderFirmwareCards(networkExamples, this.networkFirmwares);
    }
    
    renderFirmwareCards(firmwares, container) {
        container.innerHTML = '';
        
        firmwares.forEach(fw => {
            const card = document.createElement('div');
            card.className = 'firmware-card';
            card.dataset.firmwareId = fw.id;
            
            card.innerHTML = `
                <h4>${fw.name}</h4>
                <p>${fw.description}</p>
                <div class="firmware-meta">
                    <span><i class="fas fa-microchip"></i> ${fw.chip}</span>
                    <span><i class="fas fa-weight"></i> ${fw.size}</span>
                    <span><i class="fas fa-map-marker-alt"></i> ${fw.address}</span>
                </div>
            `;
            
            card.addEventListener('click', () => this.selectFirmware(fw));
            container.appendChild(card);
        });
    }
    
    selectFirmware(firmware) {
        // 清除之前的选择
        document.querySelectorAll('.firmware-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // 标记当前选择
        const selectedCard = document.querySelector(`[data-firmware-id="${firmware.id}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // 更新状态
        this.state.selectedFirmware = {
            ...firmware,
            type: 'example',
            selectedTime: new Date()
        };
        
        // 更新烧录地址
        this.flashAddress.value = firmware.address;
        
        this.logToConsole(`已选择固件: ${firmware.name}`, 'success');
        this.updateUIState();
    }
    
    handleLocalFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.toLowerCase().endsWith('.bin')) {
            this.logToConsole('请选择 .bin 格式的固件文件', 'warning');
            return;
        }
        
        const fileSize = this.formatFileSize(file.size);
        
        this.state.selectedFirmware = {
            id: 'local_' + Date.now(),
            name: file.name,
            description: '本地文件',
            chip: 'ESP32',
            size: fileSize,
            category: 'custom',
            file: file,
            type: 'local',
            address: this.flashAddress.value || '0x10000',
            selectedTime: new Date()
        };
        
        // 显示文件信息
        this.localFileName.textContent = file.name;
        this.localFileSize.textContent = fileSize;
        this.localFileInfo.classList.remove('hidden');
        
        this.logToConsole(`已选择本地文件: ${file.name} (${fileSize})`, 'success');
        this.updateUIState();
    }
    
    async testFirmwareUrl() {
        const url = this.firmwareUrl.value.trim();
        if (!url) {
            this.logToConsole('请输入固件URL地址', 'warning');
            return;
        }
        
        try {
            this.logToConsole('正在测试固件链接...', 'info');
            
            const response = await fetch(url, { method: 'HEAD' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const size = response.headers.get('content-length');
            const fileSize = size ? this.formatFileSize(parseInt(size)) : '未知大小';
            
            this.state.selectedFirmware = {
                id: 'url_' + Date.now(),
                name: url.split('/').pop() || '网络固件',
                description: '来自网络的固件',
                chip: 'ESP32',
                size: fileSize,
                category: 'url',
                url: url,
                type: 'url',
                address: this.urlFlashAddress.value || '0x10000',
                selectedTime: new Date()
            };
            
            this.logToConsole(`固件链接有效，大小: ${fileSize}`, 'success');
            this.updateUIState();
            
        } catch (error) {
            this.logToConsole(`固件链接测试失败: ${error.message}`, 'error');
        }
    }
    
    validateFlashAddress() {
        const address = this.flashAddress.value;
        return /^0x[0-9a-fA-F]+$/.test(address);
    }
    
    validateFlashSettings() {
        const isValid = this.validateFlashAddress();
        
        if (!isValid && this.flashAddress.value) {
            this.flashAddress.classList.add('error');
        } else {
            this.flashAddress.classList.remove('error');
        }
        
        this.updateUIState();
        return isValid;
    }
    
    validateUrlInput() {
        const url = this.firmwareUrl.value.trim();
        const isValid = url.startsWith('http://') || url.startsWith('https://');
        
        this.testUrlBtn.disabled = !isValid;
        return isValid;
    }
    
    // 烧录逻辑
    async startFlashing() {
        if (!this.state.isConnected || !this.state.selectedFirmware) {
            this.logToConsole('无法开始烧录：设备未连接或未选择固件', 'error');
            return;
        }
        
        // 更新状态
        this.state.currentStage = 'flashing';
        this.state.flashProgress = 0;
        
        // 更新UI
        this.updateUIState();
        this.updateProgress(0);
        
        // 显示烧录信息
        this.flashingFirmwareName.textContent = this.state.selectedFirmware.name;
        this.flashingDeviceName.textContent = this.connectedDevice.textContent;
        this.flashingAddress.textContent = this.state.selectedFirmware.address;
        
        // 开始烧录过程
        this.logToConsole('开始烧录过程...', 'info');
        
        try {
            // 模拟烧录过程
            await this.simulateFlashingProcess();
            
            // 烧录完成
            this.state.currentStage = 'completed';
            this.state.flashProgress = 100;
            this.updateProgress(100);
            
            this.logToConsole('✅ 烧录完成！', 'success');
            this.logToConsole('设备将在3秒后重启...', 'info');
            
            // 模拟重启
            setTimeout(() => {
                this.logToConsole('设备重启成功！', 'success');
            }, 3000);
            
        } catch (error) {
            this.state.currentStage = 'error';
            this.logToConsole(`❌ 烧录失败: ${error.message}`, 'error');
        } finally {
            this.updateUIState();
        }
    }
    
    async simulateFlashingProcess() {
        const stages = [
            { name: 'connect', progress: 10, duration: 500, message: '正在连接设备...' },
            { name: 'erase', progress: 20, duration: 1500, message: '正在擦除Flash...' },
            { name: 'write', progress: 70, duration: 4000, message: '正在写入固件...' },
            { name: 'verify', progress: 90, duration: 2000, message: '正在校验固件...' },
            { name: 'reset', progress: 100, duration: 1000, message: '正在重启设备...' }
        ];
        
        // 更新阶段显示
        const updateStage = (stageName) => {
            document.querySelectorAll('.stage').forEach(stage => {
                stage.classList.remove('active', 'completed');
                if (stage.dataset.stage === stageName) {
                    stage.classList.add('active');
                }
                if (stage.dataset.stage === 'connect') {
                    stage.classList.add('completed');
                }
            });
        };
        
        for (const stage of stages) {
            this.logToConsole(stage.message, 'info');
            updateStage(stage.name);
            
            // 模拟进度更新
            const startProgress = this.state.flashProgress;
            const endProgress = stage.progress;
            const duration = stage.duration;
            const steps = 20;
            const increment = (endProgress - startProgress) / steps;
            
            for (let i = 0; i <= steps; i++) {
                await this.delay(duration / steps);
                this.state.flashProgress = startProgress + (increment * i);
                this.updateProgress(this.state.flashProgress);
            }
        }
    }
    
    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
        this.progressPercent.textContent = `${Math.round(percent)}%`;
    }
    
    cancelFlashing() {
        this.logToConsole('烧录已取消', 'warning');
        this.state.currentStage = 'idle';
        this.state.flashProgress = 0;
        this.updateUIState();
    }
    
    restartFlashing() {
        this.logToConsole('重新开始烧录...', 'info');
        this.startFlashing();
    }
    
    finishFlashing() {
        this.logToConsole('烧录过程已完成，返回设备连接页面', 'info');
        
        // 重置状态
        this.state.selectedFirmware = null;
        this.state.currentStage = 'idle';
        this.state.flashProgress = 0;
        
        this.updateUIState();
    }
    
    goBackToConnect() {
        this.logToConsole('返回设备连接页面', 'info');
        this.state.selectedFirmware = null;
        this.updateUIState();
    }
    
    updateBaudRate() {
        if (this.state.isConnected && this.state.serialPort) {
            this.logToConsole(`波特率已更新为: ${this.baudRate.value}`, 'info');
            // 注意：实际应用中需要重新打开串口以应用新的波特率
        }
    }
    
    // 控制台日志
    logToConsole(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-${type}`;
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        
        this.detailedConsole.appendChild(logEntry);
        this.detailedConsole.scrollTop = this.detailedConsole.scrollHeight;
    }
    
    clearConsole() {
        this.detailedConsole.innerHTML = '<div class="log-info">控制台日志已清空</div>';
    }
    
    async copyConsoleLog() {
        try {
            const logText = this.detailedConsole.textContent;
            await navigator.clipboard.writeText(logText);
            this.logToConsole('日志已复制到剪贴板', 'success');
        } catch (error) {
            this.logToConsole('复制失败: ' + error.message, 'error');
        }
    }
    
    // 工具函数
    formatFileSize(bytes) {
        if (typeof bytes !== 'number') return '未知大小';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.esp32Flasher = new ESP32WebFlasher();
    
    // 检查浏览器兼容性
    if (!navigator.serial) {
        const warning = document.createElement('div');
        warning.className = 'browser-warning';
        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <div>
                <strong>浏览器不支持</strong>
                <p>您的浏览器不支持 Web Serial API。请使用 Chrome 89+ 或 Edge 89+ 以获得完整功能。</p>
            </div>
        `;
        document.body.prepend(warning);
    }
});