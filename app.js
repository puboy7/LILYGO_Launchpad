import { firmwareLibrary, deviceList } from './firmware-library.js';

// DOM元素获取（新增设备卡片容器）
const deviceCards = document.getElementById('device-cards');
const portSelect = document.getElementById('port-select');
const connectPortBtn = document.getElementById('connect-port');
const burnFirmwareBtn = document.getElementById('burn-firmware');
const firmwareInfo = document.getElementById('firmware-info');
const chipInfo = document.getElementById('chip-info');
const chipName = document.getElementById('chip-name');
const deviceStatus = document.getElementById('device-status');
const portStatus = document.getElementById('port-status');
const burnProgress = document.getElementById('burn-progress');
const logBox = document.getElementById('log-box');

// 全局变量
let selectedDevice = null; // 选中的设备（DEVICE_A/B/C/D）
let selectedChip = null;   // 选中设备关联的芯片
let selectedFirmware = null; // 芯片对应的固件
let serialPort = null; // 串口实例
let espLoader = null; // ESP烧录核心实例

// 初始化：加载图片卡片式设备列表（核心修改）
function initDeviceList() {
    deviceList.forEach(device => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.dataset.device = device.value;
        card.dataset.chip = device.chip;
        // 卡片内容：图片+设备名称
        card.innerHTML = `
      <img src="${device.img}" alt="${device.label}">
      <p class="device-name">${device.label}</p>
    `;
        // 卡片点击事件：选中/取消选中
        card.addEventListener('click', () => {
            // 移除所有卡片的选中状态
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            // 给当前卡片添加选中状态
            card.classList.add('active');
            // 触发设备选择逻辑
            handleDeviceSelect(device.value, device.chip, device.label);
        });
        deviceCards.appendChild(card);
    });
}
initDeviceList();

// 设备选择核心逻辑（适配卡片点击）
function handleDeviceSelect(deviceValue, chipValue, deviceLabel) {
    selectedDevice = deviceValue;
    selectedChip = chipValue;

    if (!selectedDevice || !selectedChip) {
        // 重置状态
        selectedFirmware = null;
        chipInfo.classList.add('hidden');
        firmwareInfo.textContent = '未选择设备';
        deviceStatus.textContent = '未选择';
        deviceStatus.style.color = 'var(--danger)';
        portSelect.disabled = true;
        portSelect.innerHTML = '<option value="" selected disabled>—— 请先选择设备 ——</option>';
        connectPortBtn.disabled = true;
        burnFirmwareBtn.disabled = true;
        log('请选择有效的设备型号', 'warn');
        return;
    }

    // 显示设备关联的芯片
    chipInfo.classList.remove('hidden');
    chipName.textContent = selectedChip.replace('_', '-'); // 格式化为ESP32-C3

    // 从固件库匹配芯片对应的固件
    selectedFirmware = firmwareLibrary[selectedChip];
    if (!selectedFirmware || selectedFirmware.length === 0) {
        firmwareInfo.textContent = '无对应固件';
        deviceStatus.textContent = '无匹配固件';
        deviceStatus.style.color = 'var(--danger)';
        portSelect.disabled = true;
        connectPortBtn.disabled = true;
        burnFirmwareBtn.disabled = true;
        log(`错误：固件库中未找到【${selectedChip.replace('_', '-')}】芯片对应的固件`, 'error');
        return;
    }

    // 更新状态：设备选择成功
    const firmwareNames = selectedFirmware.map(f => f.name || `地址0x${f.address.toString(16).toUpperCase()}`).join('、');
    firmwareInfo.textContent = firmwareNames;
    deviceStatus.textContent = '已选择';
    deviceStatus.style.color = 'var(--success)';
    portSelect.disabled = false;
    portSelect.innerHTML = '<option value="" selected disabled>—— 加载端口中 ——</option>';
    log(`成功选择设备：${deviceLabel}（关联芯片：${selectedChip.replace('_', '-')}），匹配固件：${firmwareNames}`, 'success');

    // 加载可用串口端口
    loadSerialPorts();
}

// 日志输出函数（不变）
function log(text, type = 'info') {
    const colorMap = {
        info: '#1e293b',
        success: '#10b981',
        error: '#ef4444',
        warn: '#f97316',
        progress: '#3b82f6'
    };
    const time = new Date().toLocaleTimeString();
    const logItem = `<span style="color:${colorMap[type]}">[${time}] ${text}</span><br>`;
    logBox.innerHTML += logItem;
    logBox.scrollTop = logBox.scrollHeight;
}

// 加载可用串口端口（不变）
async function loadSerialPorts() {
    try {
        if (!('serial' in navigator)) {
            throw new Error('你的浏览器不支持Web Serial API（推荐Chrome/Edge最新版）');
        }
        const ports = await navigator.serial.getPorts();
        portSelect.innerHTML = '<option value="" selected disabled>—— 请选择端口 ——</option>';

        if (ports.length === 0) {
            portSelect.innerHTML = '<option value="" selected disabled>未检测到可用端口，请连接设备</option>';
            log('未检测到可用串口端口，请将设备连接到电脑并重启浏览器', 'warn');
            return;
        }

        ports.forEach((port, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `端口${index + 1} (${port.getInfo().usbVendorId ? `VID:0x${port.getInfo().usbVendorId.toString(16)}` : '未知设备'})`;
            portSelect.appendChild(option);
        });
        log(`成功检测到 ${ports.length} 个可用串口端口`, 'info');

        portSelect.addEventListener('change', function () {
            connectPortBtn.disabled = !this.value;
            portStatus.textContent = '未连接';
            portStatus.style.color = 'var(--danger)';
            burnFirmwareBtn.disabled = true;
        });

    } catch (error) {
        portSelect.innerHTML = '<option value="" selected disabled>加载端口失败</option>';
        log(`加载端口失败：${error.message}`, 'error');
    }
}

// 连接端口（不变）
connectPortBtn.addEventListener('click', async function () {
    const portIndex = portSelect.value;
    if (!portIndex) return;

    try {
        this.disabled = true;
        this.textContent = '🔌 正在连接...';
        log('正在连接串口端口，请稍候...', 'info');

        const ports = await navigator.serial.getPorts();
        serialPort = ports[portIndex];
        await serialPort.open({ baudRate: 115200 });

        const transport = new window.Transport(serialPort);
        espLoader = new window.ESPLoader({
            baudrate: 115200,
            transport,
            terminal: { writeLine: (text) => log(text, 'info') }
        });

        const detectedChip = await espLoader.main_fn();
        portStatus.textContent = '已连接';
        portStatus.style.color = 'var(--success)';
        burnFirmwareBtn.disabled = false;
        this.textContent = '🔌 已连接';
        log(`端口连接成功，检测到芯片：${detectedChip}`, 'success');

    } catch (error) {
        portStatus.textContent = '连接失败';
        portStatus.style.color = 'var(--danger)';
        this.textContent = '🔌 连接端口';
        this.disabled = false;
        log(`端口连接失败：${error.message}（请检查设备是否连接/驱动是否正常）`, 'error');
    }
});

// 一键烧录固件（不变）
burnFirmwareBtn.addEventListener('click', async function () {
    if (!selectedFirmware || !espLoader || !serialPort) {
        log('烧录前请先选择设备并连接端口', 'warn');
        return;
    }

    try {
        this.disabled = true;
        this.textContent = '⚡ 正在烧录...';
        burnProgress.classList.remove('hidden');
        burnProgress.value = 0;
        log('开始烧录固件，请勿断开设备！', 'info');

        const fileArray = selectedFirmware.map(firm => ({
            data: Array.from(firm.data),
            address: firm.address
        }));

        await espLoader.write_flash({
            fileArray,
            flashSize: "keep",
            eraseAll: true,
            compress: true,
            reportProgress: (index, written, total) => {
                const progress = Math.round((written / total) * 100);
                burnProgress.value = progress;
                log(`烧录进度：${progress}%`, 'progress');
            }
        });

        await espLoader.hard_reset();
        burnProgress.value = 100;
        log('✅ 固件烧录完成！设备已自动重启', 'success');
        this.textContent = '⚡ 烧录完成';

    } catch (error) {
        burnProgress.value = 0;
        this.textContent = '⚡ 一键烧录固件';
        this.disabled = false;
        log(`❌ 烧录失败：${error.message}（请检查设备连接/固件是否正确）`, 'error');
    } finally {
        if (serialPort) await serialPort.close();
    }
});

// 页面初始化日志（不变）
log('欢迎使用WebESP固件一键烧录工具，请按步骤操作：选择设备→连接端口→烧录固件', 'info');