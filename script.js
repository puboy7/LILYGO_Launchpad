// 全局包裹DOM加载完成事件，确保所有元素加载后再执行JS
document.addEventListener('DOMContentLoaded', function () {
    // 1. 获取所有DOM元素 + 兜底校验（避免null报错，核心修复）
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
        // 页面日志区域打印
        if (logArea) {
            logArea.value += logMsg;
            logArea.scrollTop = logArea.scrollHeight; // 自动滚动到底部
        }
        // 控制台同步打印，方便排查
        console.log(logMsg);
    }

    // 3. 前置校验核心元素，提示ID错误（方便排查）
    if (!document.getElementById('connectBtn')) {
        log('⚠️  警告：未找到核心元素 [id="connectBtn"]，请检查HTML文件！');
    }
    if (!document.getElementById('log-area')) {
        log('⚠️  警告：未找到日志元素 [id="log-area"]，请检查HTML文件！');
    }

    // 4. 连接设备（已包含过滤参数兼容修复）
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            try {
                // 校验浏览器是否支持Web Serial API
                if (!('serial' in navigator)) {
                    throw new Error('浏览器不支持Web Serial API，请使用Chrome/Edge 100+最新版本！');
                }

                log('🔌  正在请求串口权限，请选择ESP物理串口（排除蓝牙/虚拟串口）...');
                let port;
                try {
                    // 方案1：新版浏览器 - 过滤常见ESP串口厂商ID+USB接口类，精准匹配物理串口
                    port = await navigator.serial.requestPort({
                        filters: [
                            { usbVendorId: 0x10c4 }, // Silicon Labs（常见ESP下载器）
                            { usbVendorId: 0x0403 }, // FTDI
                            { usbVendorId: 0x1a86 }, // 沁恒CH340/CH341
                            { usbVendorId: 0x067b }, // Prolific PL2303
                            { interfaceClass: 0x02 } // USB通信设备类（兜底过滤）
                        ]
                    });
                } catch (err) {
                    // 方案2：旧版浏览器 - 过滤参数不兼容时，无过滤请求串口，手动提示用户
                    if (err.message.includes('filter') || err.message.includes('property') || err.message.includes('must provide')) {
                        log('ℹ️  浏览器兼容模式：将显示所有串口，请手动选择ESP物理串口（不要选蓝牙/虚拟串口）！');
                        port = await navigator.serial.requestPort(); // 无过滤，兼容所有版本
                    } else {
                        throw err; // 非过滤参数错误，正常抛出
                    }
                }

                // 打开串口（获取波特率，默认115200）
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

                // 初始化esptool-js核心实例（依赖本地esptool.min.js）
                espLoader = new esptool.ESPLoader(stream, baud);
                espLoader.on('log', (msg) => log(msg)); // 绑定库内置日志

                // 初始化设备连接
                await espLoader.initialize();
                log(`✅  设备连接成功！芯片类型：${espLoader.chipName || '未知'}，波特率：${baud}`);

                // 更新按钮状态
                connectBtn.disabled = true;
                disconnectBtn.disabled = false;
                flashBtn.disabled = !firmwareBuffer; // 有固件才启用烧录

            } catch (err) {
                // 友好处理各类错误，避免程序崩溃
                if (err.name === 'AbortError') {
                    log('ℹ️  提示：你取消了串口设备选择！');
                } else if (err.message.includes('Serial blocklist') || err.message.includes('bluetooth')) {
                    log('ℹ️  提示：请确保ESP通过USB连接并进入烧录模式，不要选择蓝牙串口！');
                } else {
                    log(`❌  连接失败：${err.message}`);
                }
                // 异常时确保串口关闭，释放资源
                if (port) port.close().catch(() => { });
            }
        });
    }

    // 5. 断开设备连接
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', async () => {
            try {
                log('🔌  正在断开设备连接...');
                // 关闭esptool和串口
                if (espLoader) await espLoader.close().catch(() => { });
                if (port) await port.close().catch(() => { });
            } catch (err) {
                log(`❌  断开连接失败：${err.message}`);
            } finally {
                // 重置全局变量和按钮状态
                espLoader = null;
                port = null;
                connectBtn.disabled = false;
                disconnectBtn.disabled = true;
                flashBtn.disabled = true;
                log('✅  设备已成功断开连接！');
            }
        });
    }

    // 6. 选择/读取固件文件（.bin格式）
    if (firmwareFile) {
        firmwareFile.addEventListener('change', async (e) => {
            const file = e.target?.files?.[0] || firmwareFile.files[0];
            if (!file) return;

            // 校验固件格式（必须是.bin）
            if (!file.name.endsWith('.bin')) {
                log('❌  错误：请选择【.bin格式】的ESP固件文件！');
                firmwareFile.value = ''; // 清空选择
                firmwareBuffer = null;
                flashBtn.disabled = true;
                return;
            }

            try {
                log(`📂  正在读取固件：${file.name}（大小：${(file.size / 1024).toFixed(2)}KB）`);
                // 读取文件为ArrayBuffer，转换为Uint8Array
                const arrayBuffer = await file.arrayBuffer();
                firmwareBuffer = new Uint8Array(arrayBuffer);
                log('✅  固件读取成功！已连接设备可直接开始烧录');
                flashBtn.disabled = !espLoader; // 已连接设备才启用烧录
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
            // 前置校验：设备已连接 + 固件已加载
            if (!espLoader) {
                log('ℹ️  提示：请先连接ESP设备！');
                return;
            }
            if (!firmwareBuffer) {
                log('ℹ️  提示：请先选择有效的.bin固件文件！');
                return;
            }

            try {
                // 禁用按钮，防止重复点击
                flashBtn.disabled = true;
                firmwareFile.disabled = true;
                const burnMode = flashMode.value || 'update';

                log('=============================================');
                log(`🚀  开始烧录（${burnMode === 'wipe' ? '擦除所有数据' : '仅更新固件，保留数据'}）`);
                log('=============================================');

                // 根据烧录模式擦除闪存
                if (burnMode === 'wipe') {
                    log('🧹  正在擦除整个闪存区域（耗时稍长，请耐心等待）...');
                    await espLoader.eraseFlash('all');
                } else {
                    log('🧹  正在自动擦除需要更新的闪存区域（快速擦除）...');
                    await espLoader.eraseFlash('auto');
                }

                // 写入固件，实时返回烧录进度
                log('📝  开始写入固件到闪存...');
                await espLoader.writeFlash(0x00000, firmwareBuffer, (progress) => {
                    log(`📊  烧录进度：${(progress * 100).toFixed(1)}%`);
                });

                // 校验固件完整性，确保烧录无错误
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
                log('💡  解决方案：1.检查设备连接 2.降低波特率 3.重新进入烧录模式 4.关闭占用串口的软件');
            } finally {
                // 无论成功/失败，恢复按钮和文件选择状态
                flashBtn.disabled = false;
                if (firmwareFile) firmwareFile.disabled = false;
            }
        });
    }

    // 8. 拖拽上传固件功能（兼容拖拽元素缺失）
    const dropArea = document.querySelector('.file-upload-label');
    if (dropArea && firmwareFile) {
        // 拖拽悬浮效果
        dropArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropArea.style.borderColor = '#3b82f6';
            dropArea.style.backgroundColor = '#f0f9ff';
        });
        // 离开拖拽区域恢复样式
        dropArea.addEventListener('dragleave', () => {
            dropArea.style.borderColor = '#cbd5e1';
            dropArea.style.backgroundColor = '#f8fafc';
        });
        // 释放文件触发上传
        dropArea.addEventListener('drop', (e) => {
            e.preventDefault();
            dropArea.style.borderColor = '#cbd5e1';
            dropArea.style.backgroundColor = '#f8fafc';
            // 获取拖拽的文件
            const file = e.dataTransfer.files?.[0];
            if (file && file.name.endsWith('.bin')) {
                firmwareFile.files = e.dataTransfer.files;
                firmwareFile.dispatchEvent(new Event('change')); // 触发文件选择事件
            } else {
                log('❌  错误：请拖拽【.bin格式】的ESP固件文件！');
            }
        });
    }

    // 9. 页面关闭/刷新时，自动断开串口（避免资源占用）
    window.addEventListener('beforeunload', async () => {
        if (port) await port.close().catch(() => { });
        if (espLoader) await espLoader.close().catch(() => { });
    });

    // 初始日志提示
    log('📌  ESP在线烧录工具已就绪！');
    log('💡  使用步骤：1.连接ESP设备并进入烧录模式 2.选择波特率并连接 3.选择.bin固件 4.开始烧录');
});