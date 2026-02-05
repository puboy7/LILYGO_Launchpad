import { firmwareLibrary, deviceList } from './firmware-library.js';

// DOM元素获取（移除port-select相关获取）
const deviceCards = document.getElementById('device-cards');
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

// 初始化：加载图片卡片式设备列表
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

// 设备选择核心逻辑
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
        connectPortBtn.disabled = true; // 仅禁用按钮，无下拉框操作
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
        connectPortBtn.disabled = true;
        burnFirmwareBtn.disabled = true;
        log(`错误：固件库中未找到【${selectedChip.replace('_', '-')}】芯片对应的固件`, 'error');
        return;
    }

    // 更新状态：设备选择成功，直接启用连接端口按钮
    const firmwareNames = selectedFirmware.map(f => f.name || `地址0x${f.address.toString(16).toUpperCase()}`).join('、');
    firmwareInfo.textContent = firmwareNames;
    deviceStatus.textContent = '已选择';
    deviceStatus.style.color = 'var(--success)';
    connectPortBtn.disabled = false; // 启用连接按钮，无下拉框加载
    burnFirmwareBtn.disabled = true;
    log(`成功选择设备：${deviceLabel}（关联芯片：${selectedChip.replace('_', '-')}），匹配固件：${firmwareNames}`, 'success');
    log('提示：点击「连接端口」在弹窗中选择你的ESP设备端口', 'info');
}

// 日志输出函数
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

// 步骤2：连接端口（核心：弹窗请求端口，无下拉框）
connectPortBtn.addEventListener('click', async function () {
    // 校验前置条件
    if (!selectedDevice || !selectedFirmware) {
        log('请先选择有效的设备型号', 'warn');
        return;
    }
    // 校验浏览器支持
    if (!('serial' in navigator)) {
        log('错误：你的浏览器不支持Web Serial API（推荐Chrome/Edge最新版）', 'error');
        return;
    }

    try {
        this.disabled = true;
        this.textContent = '🔌 正在请求端口...';
        portStatus.textContent = '连接中';
        portStatus.style.color = 'var(--primary)';
        log('正在请求串口设备权限，请在弹窗中选择你的ESP端口并确认', 'info');

        // 核心：弹窗请求选择串口端口（浏览器原生弹窗）
        serialPort = await navigator.serial.requestPort();
        // 打开串口（ESP通用波特率115200）
        await serialPort.open({ baudRate: 115200 });
        log('串口端口已打开，正在初始化ESP烧录器...', 'info');

        // 初始化ESP烧录器（基于esptool.min.js）
        const transport = new window.Transport(serialPort);
        espLoader = new window.ESPLoader({
            baudrate: 115200,
            transport,
            terminal: { writeLine: (text) => log(text, 'info') }
        });

        // 检测ESP芯片并验证
        const detectedChip = await espLoader.main_fn();
        // 更新端口状态
        portStatus.textContent = '已连接';
        portStatus.style.color = 'var(--success)';
        burnFirmwareBtn.disabled = false;
        this.textContent = '🔌 已连接（可重新连接）';
        this.disabled = false; // 允许重新连接端口
        log(`端口连接成功！检测到ESP芯片：${detectedChip}`, 'success');
        log('提示：可直接点击「一键烧录固件」开始烧录', 'success');

    } catch (error) {
        // 处理错误（如用户取消弹窗、端口连接失败等）
        portStatus.textContent = '未连接';
        portStatus.style.color = 'var(--danger)';
        this.textContent = '🔌 连接端口';
        this.disabled = false;
        // 区分用户取消和实际错误
        const errorMsg = error.name === 'AbortError'
            ? '你取消了端口选择弹窗'
            : `端口连接失败：${error.message}（请检查设备是否上电/USB是否为数据线）`;
        log(`错误：${errorMsg}`, 'error');
    }
});

// 步骤3：一键烧录固件
burnFirmwareBtn.addEventListener('click', async function () {
    if (!selectedFirmware || !espLoader || !serialPort) {
        log('烧录前请先选择设备并成功连接端口', 'warn');
        return;
    }
    if (serialPort.readable === null || serialPort.writable === null) {
        log('错误：串口端口已断开，请重新连接', 'error');
        connectPortBtn.textContent = '🔌 重新连接端口';
        portStatus.textContent = '已断开';
        portStatus.style.color = 'var(--danger)';
        return;
    }

    try {
        this.disabled = true;
        this.textContent = '⚡ 正在烧录...';
        burnProgress.classList.remove('hidden');
        burnProgress.value = 0;
        log('============================================', 'info');
        log('开始烧录固件！烧录中请勿断开设备、请勿刷新页面', 'warn');
        log('============================================', 'info');

        // 构造烧录参数（从固件库获取地址和数据）
        const fileArray = selectedFirmware.map(firm => ({
            data: Array.from(firm.data),
            address: firm.address
        }));

        // 执行烧录并实时更新进度
        await espLoader.write_flash({
            fileArray,
            flashSize: "keep",
            eraseAll: true,
            compress: true,
            reportProgress: (index, written, total) => {
                const progress = Math.round((written / total) * 100);
                burnProgress.value = progress;
                log(`烧录进度：${progress}%（已写入${written}/${total}字节）`, 'progress');
            }
        });

        // 烧录完成：重启设备
        await espLoader.hard_reset();
        burnProgress.value = 100;
        log('============================================', 'info');
        log('✅ 固件烧录完成！设备已自动重启，可断开设备使用', 'success');
        log('============================================', 'info');
        this.textContent = '⚡ 烧录完成';

    } catch (error) {
        burnProgress.value = 0;
        this.textContent = '⚡ 一键烧录固件';
        this.disabled = false;
        log('============================================', 'info');
        log(`❌ 烧录失败：${error.message}`, 'error');
        log('提示：可尝试重新连接端口后再次烧录', 'warn');
        log('============================================', 'info');
    }
});

// 页面初始化日志
log('欢迎使用WebESP固件一键烧录工具', 'info');
log('操作步骤：1. 点击设备图片选择型号 → 2. 点击连接端口并在弹窗选择 → 3. 一键烧录', 'info');