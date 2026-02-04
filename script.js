// ESP32 Web Flasher - 主逻辑
class ESP32WebFlasher {
    constructor() {
        this.serialPort = null;
        this.selectedFirmware = null;
        this.isConnected = false;
        this.logCount = 0;
        this.currentStep = 1;
        
        this.initElements();
        this.bindEvents();
        this.loadFirmwareExamples();
        this.updateStepIndicator();
    }
    
    initElements() {
        // 模式切换
        this.modeQuickBtn = document.getElementById('modeQuick');
        this.modeDiyBtn = document.getElementById('modeDIY');
        this.quickStartPanel = document.getElementById('quickStartPanel');
        this.diyPanel = document.getElementById('diyPanel');
        
        // 连接与烧录
        this.connectBtn = document.getElementById('connectBtn');
        this.flashBtn = document.getElementById('flashBtn');
        this.resetBtn = document.getElementById('resetBtn');
        
        // 文件操作
        this.firmwareFileInput = document.getElementById('firmwareFile');
        this.browseBtn = document.getElementById('browseBtn');
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        
        // 配置
        this.flashAddress = document.getElementById('flashAddress');
        this.baudrate = document.getElementById('baudrate');
        this.flashMode = document.getElementById('flashMode');
        
        // 控制台
        this.consoleOutput = document.getElementById('consoleOutput');
        this.clearConsoleBtn = document.getElementById('clearConsole');
        this.statusText = document.getElementById('statusText');
        this.logCountElement = document.getElementById('logCount');
        
        // 固件列表容器
        this.firmwareList = document.getElementById('firmwareList');
    }
    
    bindEvents() {
        // 模式切换
        this.modeQuickBtn.addEventListener('click', () => this.switchMode('quick'));
        this.modeDiyBtn.addEventListener('click', () => this.switchMode('diy'));
        
        // 设备连接
        this.connectBtn.addEventListener('click', () => this.connectDevice());
        
        // 烧录操作
        this.flashBtn.addEventListener('click', () => this.flashFirmware());
        this.resetBtn.addEventListener('click', () => this.resetDevice());
        
        // 文件操作
        this.browseBtn.addEventListener('click', () => this.firmwareFileInput.click());
        this.firmwareFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖放功能
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
                this.firmwareFileInput.files = e.dataTransfer.files;
                this.handleFileSelect({target: this.firmwareFileInput});
            }
        });
        
        // 控制台
        this.clearConsoleBtn.addEventListener('click', () => this.clearConsole());
        
        // 输入变化
        this.flashAddress.addEventListener('input', () => this.validateInputs());
    }
    
    // 模式切换
    switchMode(mode) {
        this.modeQuickBtn.classList.toggle('active', mode === 'quick');
        this.modeDiyBtn.classList.toggle('active', mode === 'diy');
        this.quickStartPanel.classList.toggle('active', mode === 'quick');
        this.diyPanel.classList.toggle('active', mode === 'diy');
        
        this.selectedFirmware = null;
        if (mode === 'quick') {
            this.updateStepIndicator(2);
        }
    }
    
    // 设备连接 (Web Serial API)
    async connectDevice() {
        try {
            this.log('正在请求串口权限...', 'info');
            
            // 请求串口访问权限
            this.serialPort = await navigator.serial.requestPort();
            
            // 打开串口
            await this.serialPort.open({
                baudRate: parseInt(this.baudrate.value),
                dataBits: 8,
                stopBits: 1,
                parity: 'none'
            });
            
            this.isConnected = true;
            this.connectBtn.innerHTML = '<i class="fas fa-check"></i> 已连接';
            this.connectBtn.classList.remove('primary');
            this.connectBtn.classList.add('success');
            this.connectBtn.disabled = true;
            
            this.statusText.textContent = '已连接';
            this.log('✅ 设备连接成功！', 'success');
            this.updateStepIndicator(2);
            
            // 启用烧录按钮
            this.validateInputs();
            
        } catch (error) {
            this.log(`❌ 连接失败: ${error.message}`, 'error');
            this.statusText.textContent = '连接失败';
        }
    }
    
    // 加载预置固件列表
    async loadFirmwareExamples() {
        try {
            // 这里可以替换为从 config.json 加载
            const examples = [
                {
                    id: 'blink',
                    name: 'LED 闪烁示例',
                    description: '最简单的示例，让板载LED闪烁',
                    chip: 'ESP32',
                    size: '45KB',
                    url: 'https://raw.githubusercontent.com/espressif/esp-idf/master/examples/get-started/blink/build/blink.bin',
                    address: '0x10000'
                },
                {
                    id: 'wifi',
                    name: 'WiFi 扫描仪',
                    description: '扫描附近的WiFi网络并显示结果',
                    chip: 'ESP32',
                    size: '520KB',
                    url: 'https://raw.githubusercontent.com/espressif/esp-idf/master/examples/wifi/scan/build/scan.bin',
                    address: '0x10000'
                },
                {
                    id: 'http_server',
                    name: 'HTTP 服务器',
                    description: '创建一个简单的Web服务器',
                    chip: 'ESP32-S2/S3',
                    size: '680KB',
                    url: 'https://raw.githubusercontent.com/espressif/esp-idf/master/examples/protocols/http_server/simple/build/simple.bin',
                    address: '0x10000'
                }
            ];
            
            this.firmwareList.innerHTML = '';
            examples.forEach(fw => {
                const card = document.createElement('div');
                card.className = 'firmware-card';
                card.innerHTML = `
                    <h3>${fw.name}</h3>
                    <span class="chip">${fw.chip}</span>
                    <p>${fw.description}</p>
                    <div class="firmware-meta">
                        <span><i class="fas fa-weight"></i> ${fw.size}</span>
                        <span><i class="fas fa-map-marker-alt"></i> ${fw.address}</span>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    document.querySelectorAll('.firmware-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    this.selectedFirmware = fw;
                    this.flashAddress.value = fw.address;
                    this.log(`已选择: ${fw.name}`, 'success');
                    this.validateInputs();
                });
                
                this.firmwareList.appendChild(card);
            });
            
        } catch (error) {
            this.log(`加载固件列表失败: ${error.message}`, 'error');
        }
    }
    
    // 处理文件选择
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.name.endsWith('.bin')) {
            this.log('请选择 .bin 格式的固件文件', 'warning');
            return;
        }
        
        this.selectedFirmware = {
            name: file.name,
            size: this.formatFileSize(file.size),
            file: file,
            address: this.flashAddress.value || '0x10000'
        };
        
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.selectedFirmware.size;
        this.fileInfo.classList.remove('hidden');
        
        this.log(`已选择自定义文件: ${file.name} (${this.selectedFirmware.size})`, 'success');
        this.validateInputs();
    }
    
    // 烧录固件 (模拟)
    async flashFirmware() {
        if (!this.isConnected) {
            this.log('请先连接设备', 'warning');
            return;
        }
        
        if (!this.selectedFirmware) {
            this.log('请选择要烧录的固件', 'warning');
            return;
        }
        
        this.updateStepIndicator(4);
        this.flashBtn.disabled = true;
        this.flashBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 烧录中...';
        
        try {
            // 模拟烧录过程
            this.log('准备烧录环境...', 'info');
            await this.delay(500);
            
            this.log('进入烧录模式...', 'info');
            await this.delay(800);
            
            this.log('擦除 Flash...', 'info');
            await this.delay(1200);
            
            this.log('正在烧录固件...', 'info');
            
            // 模拟进度
            for (let i = 0; i <= 100; i += 10) {
                await this.delay(200);
                this.log(`烧录进度: ${i}%`, 'data');
            }
            
            this.log('校验固件...', 'info');
            await this.delay(600);
            
            this.log('✅ 烧录成功！设备即将重启...', 'success');
            await this.delay(1000);
            
            this.log('设备重启完成！', 'success');
            this.updateStepIndicator(4);
            
        } catch (error) {
            this.log(`❌ 烧录失败: ${error.message}`, 'error');
        } finally {
            this.flashBtn.disabled = false;
            this.flashBtn.innerHTML = '<i class="fas fa-bolt"></i> 开始烧录';
        }
    }
    
    // 重置设备
    async resetDevice() {
        if (!this.isConnected) {
            this.log('设备未连接', 'warning');
            return;
        }
        
        try {
            this.log('正在重置设备...', 'info');
            // 实际实现中，这里需要向串口发送重置命令
            await this.delay(500);
            this.log('设备已重置', 'success');
        } catch (error) {
            this.log(`重置失败: ${error.message}`, 'error');
        }
    }
    
    // 验证输入
    validateInputs() {
        const hasFirmware = !!this.selectedFirmware;
        const hasValidAddress = /^0x[0-9a-fA-F]+$/.test(this.flashAddress.value);
        
        this.flashBtn.disabled = !(this.isConnected && hasFirmware && hasValidAddress);
    }
    
    // 控制台日志
    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `log-${type}`;
        logEntry.innerHTML = `<span class="timestamp">[${timestamp}]</span> ${message}`;
        this.consoleOutput.appendChild(logEntry);
        
        // 自动滚动到底部
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
        
        // 更新计数
        this.logCount++;
        this.logCountElement.textContent = this.logCount;
    }
    
    clearConsole() {
        this.consoleOutput.innerHTML = '<div class="log-info">控制台已清空</div>';
        this.logCount = 0;
        this.logCountElement.textContent = '0';
    }
    
    // 步骤指示器
    updateStepIndicator(step) {
        if (step) this.currentStep = step;
        
        document.querySelectorAll('.step').forEach((stepEl, index) => {
            const stepNum = index + 1;
            stepEl.classList.toggle('active', stepNum <= this.currentStep);
        });
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

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.flasher = new ESP32WebFlasher();
});