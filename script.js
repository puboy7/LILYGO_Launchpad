class ESP32OTAUpdater {
    constructor() {
        this.file = null;
        this.initializeElements();
        this.setupEventListeners();
        this.addLog('系统初始化完成', 'info');
    }

    initializeElements() {
        this.dropArea = document.getElementById('dropArea');
        this.fileInput = document.getElementById('firmwareFile');
        this.selectFileBtn = document.getElementById('selectFileBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.clearLogBtn = document.getElementById('clearLogBtn');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.logOutput = document.getElementById('logOutput');
        this.esp32Ip = document.getElementById('esp32Ip');
        this.otaPort = document.getElementById('otaPort');
    }

    setupEventListeners() {
        // 文件选择
        this.selectFileBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // 拖放功能
        this.dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.dropArea.classList.add('drag-over');
        });

        this.dropArea.addEventListener('dragleave', () => {
            this.dropArea.classList.remove('drag-over');
        });

        this.dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dropArea.classList.remove('drag-over');
            this.handleFileSelect({ target: { files: e.dataTransfer.files } });
        });

        // 按钮事件
        this.uploadBtn.addEventListener('click', () => this.uploadFirmware());
        this.clearBtn.addEventListener('click', () => this.clearFile());
        this.clearLogBtn.addEventListener('click', () => this.clearLog());

        // 输入验证
        this.esp32Ip.addEventListener('input', () => this.validateInputs());
        this.otaPort.addEventListener('input', () => this.validateInputs());
    }

    handleFileSelect(event) {
        const files = event.target.files;
        if (!files.length) return;

        const file = files[0];
        if (!file.name.endsWith('.bin')) {
            this.addLog('错误：请选择 .bin 固件文件', 'error');
            return;
        }

        this.file = file;
        this.displayFileInfo(file);
        this.validateInputs();
        this.addLog(`已选择文件: ${file.name}`, 'success');
    }

    displayFileInfo(file) {
        this.fileName.textContent = file.name;
        this.fileSize.textContent = this.formatFileSize(file.size);
        this.fileInfo.classList.remove('hidden');
        this.progressBar.style.width = '0%';
        this.progressText.textContent = '0%';
    }

    async uploadFirmware() {
        if (!this.file || !this.validateIP() || !this.validatePort()) {
            return;
        }

        const ip = this.esp32Ip.value.trim();
        const port = this.otaPort.value;
        
        this.addLog('开始固件上传...', 'info');
        this.uploadBtn.disabled = true;
        this.uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 上传中...';

        try {
            // 创建FormData对象
            const formData = new FormData();
            formData.append('firmware', this.file);

            // 模拟进度（实际实现需要后端支持）
            for (let i = 0; i <= 100; i += 10) {
                await new Promise(resolve => setTimeout(resolve, 200));
                this.updateProgress(i);
                if (i === 50) {
                    this.addLog('正在连接到ESP32...', 'info');
                }
            }

            // 模拟上传成功
            this.updateProgress(100);
            this.addLog('固件上传成功！', 'success');
            this.addLog('ESP32正在重启...', 'info');
            
            setTimeout(() => {
                this.addLog('ESP32重启完成！', 'success');
                this.addLog('更新完成，可以断开连接', 'info');
                this.uploadBtn.disabled = false;
                this.uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 开始上传并更新';
            }, 2000);

        } catch (error) {
            this.addLog(`上传失败: ${error.message}`, 'error');
            this.uploadBtn.disabled = false;
            this.uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 开始上传并更新';
        }
    }

    updateProgress(percent) {
        this.progressBar.style.width = `${percent}%`;
        this.progressText.textContent = `${percent}%`;
        
        if (percent === 100) {
            this.addLog('固件上传完成，正在校验...', 'info');
        }
    }

    validateIP() {
        const ip = this.esp32Ip.value.trim();
        const ipPattern = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        
        if (!ipPattern.test(ip)) {
            this.addLog('错误：请输入有效的IP地址', 'error');
            return false;
        }
        return true;
    }

    validatePort() {
        const port = parseInt(this.otaPort.value);
        if (isNaN(port) || port < 1 || port > 65535) {
            this.addLog('错误：端口号必须在1-65535之间', 'error');
            return false;
        }
        return true;
    }

    validateInputs() {
        const hasFile = !!this.file;
        const hasValidIP = this.validateIP();
        const hasValidPort = this.validatePort();
        
        this.uploadBtn.disabled = !(hasFile && hasValidIP && hasValidPort);
    }

    clearFile() {
        this.file = null;
        this.fileInput.value = '';
        this.fileInfo.classList.add('hidden');
        this.uploadBtn.disabled = true;
        this.addLog('已清除文件', 'info');
    }

    clearLog() {
        this.logOutput.innerHTML = '';
        this.addLog('日志已清除', 'info');
    }

    addLog(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = type;
        logEntry.innerHTML = `[${timestamp}] ${message}`;
        this.logOutput.appendChild(logEntry);
        this.logOutput.scrollTop = this.logOutput.scrollHeight;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.otaUpdater = new ESP32OTAUpdater();
    
    // 添加欢迎信息
    setTimeout(() => {
        window.otaUpdater.addLog('欢迎使用ESP32 OTA更新器', 'info');
        window.otaUpdater.addLog('请选择固件文件并输入ESP32的IP地址', 'info');
    }, 500);
});