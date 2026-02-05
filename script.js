// 核心：等待整个DOM页面加载完成后，再执行所有JS代码
document.addEventListener('DOMContentLoaded', function () {
    // 原有所有script.js代码全部放在这里面
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
                throw new Error('浏览器不支持 Web Serial API，请使用 Chrome / Edge 最新版本');
            }

            log('正在请求串口权限，请选择 ESP 物理串口（排除蓝牙串口）...');

            // 仅过滤USB物理串口，自动排除蓝牙，解决blocklist错误
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

            // 初始化esptool-js核心实例（依赖本地esptool.min.js）
            espLoader = new esptool.ESPLoader(stream, baud);
            espLoader.on('log', (s) => log(s)); // 绑定库内置日志

            await espLoader.initialize();
            log(`设备连接成功！芯片类型：${espLoader.chipName}，波特率：${baud}`);

            // 更新按钮状态
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
            flashBtn.disabled = !firmwareBuffer; // 有固件才启用烧录

        } catch (err) {
            // 友好处理各类错误，避免程序崩溃
            if (err.message.includes('Serial blocklist') || err.message.includes('bluetoothServiceClassId')) {
                log('提示：已自动过滤蓝牙虚拟串口，请确认ESP设备通过USB连接并进入烧录模式！');
            } else if (err.name === 'AbortError') {
                log('提示：你取消了串口设备选择！');
            } else {
                log(`连接失败：${err.message}`);
            }
            // 异常时确保串口关闭
            if (port) port.close().catch(() => { });
        }
    });

    // 断开设备连接
    disconnectBtn.addEventListener('click', async () => {
        try {
            log('正在断开设备连接...');
            if (espLoader) await espLoader.close();
            if (port) await port.close();
        } catch (err) {
            log(`断开连接失败：${err.message}`);
        }
        // 重置全局变量和按钮状态
        espLoader = null;
        port = null;
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        flashBtn.disabled = true;
        log('设备已成功断开连接！');
    });

    // 选择/读取固件文件（.bin格式）
    firmwareFile.addEventListener('change', async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // 校验固件格式
        if (!file.name.endsWith('.bin')) {
            log('错误：请选择 .bin 格式的ESP固件文件！');
            firmwareFile.value = '';
            firmwareBuffer = null;
            flashBtn.disabled = true;
            return;
        }

        try {
            log(`正在读取固件文件：${file.name}（大小：${(file.size / 1024).toFixed(2)}KB）`);
            const arrayBuffer = await file.arrayBuffer();
            firmwareBuffer = new Uint8Array(arrayBuffer);
            log('固件读取成功！已连接设备可直接开始烧录');
            flashBtn.disabled = !espLoader; // 已连接设备才启用烧录按钮
        } catch (err) {
            log(`固件读取失败：${err.message}`);
            firmwareBuffer = null;
            flashBtn.disabled = true;
        }
    });

    // 固件烧录核心逻辑
    flashBtn.addEventListener('click', async () => {
        if (!espLoader || !firmwareBuffer) {
            log('提示：请先连接ESP设备并选择有效的.bin固件文件！');
            return;
        }

        try {
            // 禁用按钮防止重复点击
            flashBtn.disabled = true;
            firmwareFile.disabled = true;
            const burnMode = flashMode.value;

            log(`==================== 开始烧录（${burnMode === 'wipe' ? '擦除所有数据' : '仅更新固件，保留数据'}）====================`);
            // 根据烧录模式擦除闪存
            if (burnMode === 'wipe') {
                log('正在擦除整个闪存区域（耗时稍长，请耐心等待）...');
                await espLoader.eraseFlash('all');
            } else {
                log('正在自动擦除需要更新的闪存区域（快速擦除）...');
                await espLoader.eraseFlash('auto');
            }

            // 写入固件并实时返回进度
            log('开始写入固件到闪存...');
            await espLoader.writeFlash(0x00000, firmwareBuffer, (progress) => {
                log(`烧录进度：${(progress * 100).toFixed(1)}%`);
            });

            // 校验固件完整性
            log('固件写入完成，正在校验闪存数据完整性...');
            const verifySuccess = await espLoader.verifyFlash(0x00000, firmwareBuffer, (progress) => {
                log(`校验进度：${(progress * 100).toFixed(1)}%`);
            });

            if (verifySuccess) {
                log('==================== 固件烧录&校验成功！====================');
                log('提示：请按下ESP设备的RESET复位键，退出烧录模式即可运行新固件！');
            } else {
                throw new Error('固件校验失败，可能存在传输错误，请重新烧录！');
            }

        } catch (err) {
            log(`烧录失败：${err.message}`);
            log('建议解决方案：1. 检查设备物理连接 2. 降低波特率 3. 重新让设备进入烧录模式 4. 关闭其他占用串口的软件');
        } finally {
            // 无论成功/失败，恢复文件选择和按钮状态
            firmwareFile.disabled = false;
            flashBtn.disabled = false;
        }
    });

    // 拖拽上传固件功能
    const fileUploadLabel = document.querySelector('.file-upload-label');
    fileUploadLabel.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUploadLabel.style.borderColor = '#3b82f6';
        fileUploadLabel.style.backgroundColor = '#f0f9ff';
    });
    fileUploadLabel.addEventListener('dragleave', () => {
        fileUploadLabel.style.borderColor = '#cbd5e1';
        fileUploadLabel.style.backgroundColor = '#f8fafc';
    });
    fileUploadLabel.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUploadLabel.style.borderColor = '#cbd5e1';
        fileUploadLabel.style.backgroundColor = '#f8fafc';

        const file = e.dataTransfer.files?.[0];
        if (file && file.name.endsWith('.bin')) {
            firmwareFile.files = e.dataTransfer.files;
            firmwareFile.dispatchEvent(new Event('change')); // 触发文件选择事件
        } else {
            log('错误：请拖拽 .bin 格式的ESP固件文件！');
        }
    });

    // 页面关闭/刷新时，自动断开串口连接，避免资源占用
    window.addEventListener('beforeunload', async () => {
        if (port) await port.close().catch(() => { });
    });
});