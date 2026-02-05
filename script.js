// 全局包裹DOM加载完成事件，确保所有元素加载后再执行JS
document.addEventListener('DOMContentLoaded', function () {
    // 🔴 核心新增：esptool加载前置校验（解决e is not a constructor报错）
    if (typeof esptool === 'undefined' || !esptool.ESPLoader || typeof esptool.ESPLoader !== 'function') {
        const logArea = document.getElementById('log-area') || { value: '' };
        const errorMsg = `[${new Date().toLocaleTimeString()}] ❌  致命错误：esptool.min.js 未加载成功！\n` +
            `💡  解决方案：\n` +
            `1. 检查仓库根目录是否有esptool.min.js文件\n` +
            `2. 检查index.html中是否先引入esptool.min.js，再引入script.js\n` +
            `3. 强制刷新页面（Ctrl+Shift+R）跳过浏览器缓存\n`;
        logArea.value += errorMsg;
        console.error(errorMsg);
        // 校验失败直接终止执行，避免后续报错
        return;
    }

    // 1. 获取所有DOM元素 + 兜底校验（避免null报错）
    const connectBtn = document.getElementById('connectBtn') || { addEventListener: () => { }, disabled: false };
    const disconnectBtn = document.getElementById('disconnectBtn') || { addEventListener: () => { }, disabled: true };
    const flashBtn = document.getElementById('flashBtn') || { addEventListener: () => { }, disabled: true };
    const baudRateSelect = document.getElementById('baudRateSelect') || { value: 115200 };
    const firmwareFile = document.getElementById('firmwareFile') || { addEventListener: () => { }, value: '', files: [] };
    const flashMode = document.getElementById('flashMode') || { value: 'update' };
    const logArea = document.getElementById('log-area') || { value: '', scrollTop: 0, scrollHeight: 0 };

    // 全局变量
    let espLoader = null;
    let port = null;
    let firmwareBuffer = null;

    // 2. 日志打印函数（兼容log-area元素缺失）
    function log(msg) {
        const time = new Date().toLocaleTimeString();
        const logMsg = `[${time}] ${msg}\n`;
        if (logArea) {
            logArea.value += logMsg;
            logArea.scrollTop = logArea.scrollHeight;
        }
        console.log(logMsg);
    }

    // 3. 前置校验核心元素，提示ID错误
    if (!document.getElementById('connectBtn')) {
        log('⚠️  警告：未找到核心元素 [id="connectBtn"]，请检查HTML文件！');
    }

    // 4. 连接设备（已修复requestPort过滤参数兼容问题）
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            try {
                if (!('serial' in navigator)) {
                    throw new Error('浏览器不支持Web Serial API，请使用Chrome/Edge 100+最新版本！');
                }

                log('🔌  正在请求串口权限，请选择ESP物理串口（排除蓝牙/虚拟串口）...');
                let port;
                try {
                    // 新版浏览器：过滤常见ESP串口厂商ID，精准匹配物理串口
                    port = await navigator.serial.requestPort({
                        filters: [
                            { usbVendorId: 0x10c4 }, // Silicon Labs
                            { usbVendorId: 0x0403 }, // FTDI
                            { usbVendorId: 0x1a86 }, // 沁恒CH340/CH341
                            { usbVendorId: 0x067b }  // Prolific PL2303
                        ]
                    });
                } catch (err) {
                    // 旧版浏览器：过滤参数不兼容时，降级为无过滤模式
                    if (err.message.includes('filter') || err.message.includes('property') || err.message.includes('must provide')) {
                        log('ℹ️  浏览器兼容模式：将显示所有串口，请手动选择ESP物理串口（不要选蓝牙）！');
                        port = await navigator.serial.requestPort();
                    } else {
                        throw err;
                    }
                }

                // 打开串口
                const baud = parseInt(baudRateSelect.value || 115200);
                await port.open({ baudRate: baud, dataBits: 8, stopBits: 1, parity: 'none' });

                // 创建串口读写流
                const reader = port.readable.getReader();
                const writer = port.writable.getWriter();
                const stream = {
                    read: async () => await reader.read(),
                    write: async (data) => await writer.write(data),
                    close: async () => {
                        reader.releaseLock();
                        writer.releaseLock();
                        await port.close().catch(() => { });
                    }
                };

                // 🟢 此时esptool已校验成功，可安全实例化
                espLoader = new esptool.ESPLoader(stream, baud);
                espLoader.on('log', (msg) => log(msg));

                // 初始化设备
                await espLoader.initialize();
                log(`✅  设备连接成功！芯片类型：${espLoader.chipName || '未知'}，波特率：${baud}`);

                // 更新按钮状态
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                flashBtn.disabled = !firmwareBuffer;

            } catch (err) {
                if (err.name === 'AbortError') {
                    log('ℹ️  提示：你取消了串口设备选择！');
                } else {
                    log(`❌  连接失败：${err.message}`);
                }
                if (port) port.close().catch(() => { });
            }
        });
    }

    // 5. 断开设备连接
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            try {
                log('🔌  正在断开设备连接...');
                if (espLoader) await espLoader.close().catch(() => { });
                if (port) await port.close().catch(() => { });
            } catch (err) {
                log(`❌  断开连接失败：${err.message}`);
            } finally {
                espLoader = null;
                port = null;
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
                flashBtn.disabled = true;
                log('✅  设备已成功断开连接！');
            }
        });
    }

    // 6. 选择/读取固件文件
    if (firmwareFile) {
        firmwareFile.addEventListener('change', async (e) => {
            const file = e.target?.files?.[0] || firmwareFile.files[0];
            if (!file) return;

            if (!file.name.endsWith('.bin')) {
                log('❌  错误：请选择【.bin格式】的ESP固件文件！');
                firmwareFile.value = '';
                firmwareBuffer = null;
                flashBtn.disabled = true;
                return;
            }

            try {
                log(`📂  正在读取固件：${file.name}（大小：${(file.size / 1024).toFixed(2)}KB）`);
                const arrayBuffer = await file.arrayBuffer();
                firmwareBuffer = new Uint8Array(arrayBuffer);
                log('✅  固件读取成功！已连接设备可直接开始烧录');
                flashBtn.disabled = !espLoader;
            } catch (err) {
                log(`❌  固件读取失败：${err.message}`);
                firmwareBuffer = null;
                flashBtn.disabled = true;
            }
        });
    }

    // 7. 固件烧录核心逻辑
    if (flashBtn) {
        flashBtn.addEventListener('click', async () => {
            if (!espLoader) {
                log('ℹ️  提示：请先连接ESP设备！');
                return;
            }
            if (!firmwareBuffer) {
                log('ℹ️  提示：请先选择有效的.bin固件文件！');
                return;
            }

            try {
                flashBtn.disabled = true;
                firmwareFile.disabled = true;
                const burnMode = flashMode.value || 'update';

                log('=============================================');
                log(`🚀  开始烧录（${burnMode === 'wipe' ? '擦除所有数据' : '仅更新固件，保留数据'}）`);
                log('=============================================');

                if (burnMode === 'wipe') {
                    log('🧹  正在擦除整个闪存区域（耗时稍长，请耐心等待）...');
                    await espLoader.eraseFlash('all');
                } else {
                    log('🧹  正在自动擦除需要更新的闪存区域（快速擦除）...');
                    await espLoader.eraseFlash('auto');
                }

                log('📝  开始写入固件到闪存...');
                await espLoader.writeFlash(0x00000, firmwareBuffer, (progress) => {
                    log(`📊  烧录进度：${(progress * 100).toFixed(1)}%`);
                });

                log('✅  固件写入完成，正在校验闪存数据完整性...');
                const verifySuccess = await espLoader.verifyFlash(0x00000, firmwareBuffer);

                if (verifySuccess) {
                    log('=============================================');
                    log('🎉  固件烧录&校验成功！');
                    log('💡  提示：按下ESP设备的RESET复位键，退出烧录模式即可运行新固件！');
                    log('=============================================');
                } else {
                    throw new Error('固件校验失败，可能存在传输错误！');
                }

            } catch (err) {
                log(`❌  烧录失败：${err.message}`);
                log('💡  解决方案：1.检查设备连接 2.降低波特率 3.重新进入烧录模式');
            } finally {
                flashBtn.disabled = false;
                if (firmwareFile) firmwareFile.disabled = false;
            }
        });
    }

    // 8. 拖拽上传固件功能
    const dropArea = document.querySelector('.file-upload-label');
    if (dropArea && firmwareFile) {
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.style.borderColor = '#3b82f6';
            dropArea.style.backgroundColor = '#f0f9ff';
        });
        dropArea.addEventListener('dragleave', () => {
            dropArea.style.borderColor = '#cbd5e1';
            dropArea.style.backgroundColor = '#f8fafc';
        });
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.style.borderColor = '#cbd5e1';
            dropArea.style.backgroundColor = '#f8fafc';
            const file = e.dataTransfer.files?.[0];
            if (file && file.name.endsWith('.bin')) {
                firmwareFile.files = e.dataTransfer.files;
                firmwareFile.dispatchEvent(new Event('change'));
            } else {
                log('❌  错误：请拖拽【.bin格式】的ESP固件文件！');
            }
        });
    }

    // 9. 页面关闭时自动断开串口
    window.addEventListener('beforeunload', async () => {
        if (port) await port.close().catch(() => { });
        if (espLoader) await espLoader.close().catch(() => { });
    });

    // 初始日志提示
    log('📌  ESP在线烧录工具已就绪！');
    log('💡  使用步骤：1.ESP进入烧录模式 2.选择波特率并连接 3.选择.bin固件 4.开始烧录');
});