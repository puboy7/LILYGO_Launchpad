const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const flashBtn = document.getElementById('flashBtn');
const baudRateSelect = document.getElementById('baudRateSelect');
const firmwareFile = document.getElementById('firmwareFile');
const flashMode = document.getElementById('flashMode');
const logArea = document.getElementById('log-area');

let espLoader = null;
let port = null;
let firmwareBuffer = null;

function log(msg) {
    const time = new Date().toLocaleTimeString();
    logArea.value += `[${time}] ${msg}\n`;
    logArea.scrollTop = logArea.scrollHeight;
}

// 连接设备
connectBtn.addEventListener('click', async () => {
    try {
        if (!('serial' in navigator)) {
            throw new Error('浏览器不支持 Web Serial API，请使用 Chrome / Edge');
        }

        log('正在请求串口权限，请选择 ESP 串口...');

        // 只识别 USB 物理串口，自动排除蓝牙（修复你遇到的 blocklist 错误）
        port = await navigator.serial.requestPort({
            filters: [{ interfaceClass: 0x02 }]
        });

        const baud = parseInt(baudRateSelect.value);
        await port.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: 'none' });

        const reader = port.readable.getReader();
        const writer = port.writable.getWriter();

        const stream = {
            read: async () => await reader.read(),
            write: async (d) => await writer.write(d),
            close: async () => {
                reader.releaseLock();
                writer.releaseLock();
                await port.close();
            }
        };

        espLoader = new esptool.ESPLoader(stream, baud);
        espLoader.on('log', (s) => log(s));

        await espLoader.initialize();
        log(`连接成功！芯片：${espLoader.chip}  波特率：${baud}`);

        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        flashBtn.disabled = !firmwareBuffer;

    } catch (err) {
        // 屏蔽蓝牙串口黑名单报错，只提示用户
        if (err.message.includes('Serial blocklist') || err.message.includes('bluetoothServiceClassId')) {
            log('提示：已过滤蓝牙虚拟串口，请确保 ESP 通过 USB 连接并进入烧录模式');
        } else if (err.name !== 'AbortError') {
            log(`连接失败：${err.message}`);
        }
        if (port) port.close().catch(() => { });
    }
});

// 断开连接
disconnectBtn.addEventListener('click', async () => {
    try {
        if (espLoader) await espLoader.close();
        if (port) await port.close();
    } catch { }
    espLoader = null;
    port = null;
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
    flashBtn.disabled = true;
    log('已断开连接');
});

// 选择固件
firmwareFile.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.bin')) {
        log('请选择 .bin 固件文件');
        firmwareBuffer = null;
        flashBtn.disabled = true;
        return;
    }
    try {
        const buf = await file.arrayBuffer();
        firmwareBuffer = new Uint8Array(buf);
        log(`已加载固件：${file.name}  ${(buf.byteLength / 1024).toFixed(1)} KB`);
        flashBtn.disabled = !espLoader;
    } catch (e) {
        log('读取固件失败：' + e.message);
    }
});

// 烧录
flashBtn.addEventListener('click', async () => {
    if (!espLoader || !firmwareBuffer) {
        log('请先连接设备并选择固件');
        return;
    }

    try {
        flashBtn.disabled = true;
        const mode = flashMode.value;

        log('==================== 开始烧录 ====================');
        if (mode === 'wipe') {
            log('正在整片擦除闪存...');
            await espLoader.eraseFlash('all');
        } else {
            log('正在自动擦除所需区域...');
            await espLoader.eraseFlash('auto');
        }

        log('开始写入固件...');
        await espLoader.writeFlash(0x00000, firmwareBuffer, (p) => {
            log(`烧录进度：${(p * 100).toFixed(1)}%`);
        });

        log('校验中...');
        const ok = await espLoader.verifyFlash(0x00000, firmwareBuffer);
        if (ok) {
            log('==================== 烧录成功！====================');
            log('请按 RESET 重启设备');
        } else {
            throw new Error('校验失败');
        }
    } catch (e) {
        log('烧录失败：' + e.message);
    } finally {
        flashBtn.disabled = false;
    }
});

// 拖拽上传
const dropArea = document.querySelector('.file-upload-label');
dropArea.addEventListener('dragover', (e) => e.preventDefault());
dropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith('.bin')) {
        firmwareFile.files = e.dataTransfer.files;
        firmwareFile.dispatchEvent(new Event('change'));
    }
});

window.addEventListener('beforeunload', () => {
    if (port) port.close().catch(() => { });
});