import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
import { deviceList } from './firmware-library.js';
import { i18n, typeNameMap, modeNameMap } from './i18n.js';

ready(() => {
    // 全局变量
    let currentLang = 'zh'; // 默认中文
    const output = document.getElementById('output');
    const langSwitch = document.getElementById('lang-switch');
    let quickLoader = null, customLoader = null, eraseLoader = null;
    let selectedDevice = null;
    let currentType = 'quick';
    const DEFAULT_BAUDRATE = 115200; // 固定波特率

    // ==================== 核心修复：补充terminal.clean方法，解决报错 ====================
    const terminal = {
        clean: () => { output.value = ''; }, // 新增clean方法，清空日志
        write: (data) => { output.value += data; },
        writeLine: (data) => {
            output.value += data + '\n';
            output.scrollTop = output.scrollHeight; // 日志自动滚到底部
        }
    };

    // ==================== 中英文切换逻辑 ====================
    // 翻译方法：根据当前语言获取对应文本
    function t(key) {
        return i18n[key] ? i18n[key][currentLang] : key;
    }
    // 更新整个界面的文字
    function updateUILanguage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[key]) el.textContent = i18n[key][currentLang];
        });
        document.title = t('title');
        document.getElementById('logo-title').textContent = t('title');
        langSwitch.textContent = t('switchLangBtn');
        // 状态文字同步翻译
        if (document.getElementById('port-dot').classList.contains('disconnected')) {
            document.getElementById('port-text').textContent = t('disconnectedText');
            document.getElementById('c-port-text').textContent = t('disconnectedText');
            document.getElementById('e-port-text').textContent = t('disconnectedText');
        } else {
            document.getElementById('port-text').textContent = t('connectedText');
            document.getElementById('c-port-text').textContent = t('connectedText');
            document.getElementById('e-port-text').textContent = t('connectedText');
        }
        if (!selectedDevice) {
            document.getElementById('device-label').textContent = t('noDeviceText');
        }
    }
    // 绑定语言切换按钮
    langSwitch.addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        updateUILanguage();
    });

    // ==================== 卡片切换逻辑（快捷/自定义/擦除） ====================
    const selectionCards = document.querySelectorAll('.selection-card');
    const functionCards = document.querySelectorAll('.function-card');
    function activateFunction(type) {
        currentType = type;
        // 切换卡片选中状态
        selectionCards.forEach(card => card.classList.toggle('active', card.dataset.type === type));
        functionCards.forEach(card => card.classList.toggle('active', card.id === `${type}-card`));
        terminal.writeLine(`Info: ${t('activateFunction').replace('{type}', typeNameMap[type][currentLang])}`);
    }
    // 绑定卡片点击
    selectionCards.forEach(card => {
        card.addEventListener('click', () => activateFunction(card.dataset.type));
    });

    // ==================== 设备卡片渲染（正常显示+点击选中） ====================
    const deviceCardsEl = document.getElementById('device-cards');
    deviceList.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `<img src="${dev.img}" alt="${dev.label}"><div class="device-name">${dev.label}</div>`;
        // 设备卡片点击事件
        card.addEventListener('click', () => {
            // 取消其他设备选中，当前设备选中
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedDevice = dev;
            // 更新设备标签显示
            const deviceText = `${dev.label} (${dev.chip.replace('_', '-')})`;
            document.getElementById('device-label').textContent = deviceText;
            document.getElementById('device-label').style.color = 'var(--primary)';
            terminal.writeLine(`Success: ${t('selectDeviceSuccess').replace('{device}', dev.label)}`);
        });
        deviceCardsEl.appendChild(card);
    });

    // ==================== 状态更新工具方法（统一红绿圆点，避免重复代码） ====================
    /**
     * 更新端口状态
     * @param {string} dotId - 圆点ID（port-dot/c-port-dot/e-port-dot）
     * @param {string} textId - 文字ID（port-text/c-port-text/e-port-text）
     * @param {boolean} isConnected - 是否连接成功
     */
    function updatePortStatus(dotId, textId, isConnected) {
        const dot = document.getElementById(dotId);
        const text = document.getElementById(textId);
        if (isConnected) {
            dot.className = 'status-dot connected'; // 绿色圆点
            text.textContent = t('connectedText');
            text.style.color = 'var(--success)';
        } else {
            dot.className = 'status-dot disconnected'; // 红色圆点
            text.textContent = t('disconnectedText');
            text.style.color = 'var(--danger)';
        }
    }

    // ==================== 快捷烧录核心逻辑 ====================
    const qConnect = document.getElementById('quick-connect');
    const qFile = document.getElementById('quick-file');
    const qFlash = document.getElementById('quick-flash');
    const qProgress = document.getElementById('quick-progress');
    // 快捷连接端口
    qConnect.addEventListener('click', async () => {
        try {
            qConnect.disabled = true;
            const loadingText = currentLang === 'zh' ? '🔌 正在连接...' : '🔌 Connecting...';
            qConnect.textContent = loadingText;
            // 重置状态为红色
            updatePortStatus('port-dot', 'port-text', false);
            // 请求串口端口
            const port = await requestPort();
            const transport = new Transport(port);
            // 初始化ESPLoader
            quickLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport: transport,
                terminal: terminal // 传入terminal，包含clean方法
            });
            // 连接设备
            const chip = await quickLoader.main_fn();
            updatePortStatus('port-dot', 'port-text', true); // 绿色已连接
            qConnect.textContent = t('connectPortBtn');
            qConnect.disabled = false;
            terminal.writeLine(`Success: ${t('connectSuccess').replace('{mode}', modeNameMap.quick[currentLang]).replace('{chip}', chip).replace('{baudrate}', DEFAULT_BAUDRATE)}`);
        } catch (e) {
            updatePortStatus('port-dot', 'port-text', false); // 红色未连接
            qConnect.textContent = t('connectPortBtn');
            qConnect.disabled = false;
            terminal.writeLine(`Error: ${t('connectFail').replace('{mode}', modeNameMap.quick[currentLang]).replace('{msg}', e.message)}`);
        }
    });
    // 快捷烧录固件
    qFlash.addEventListener('click', async () => {
        // 前置校验
        if (!selectedDevice) return terminal.writeLine(`Error: ${t('noDeviceError')}`);
        if (!quickLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);
        if (!qFile.files[0]) return terminal.writeLine(`Error: ${t('noFileError')}`);

        try {
            qFlash.disabled = true;
            const loadingText = currentLang === 'zh' ? '⚡ 正在烧录...' : '⚡ Burning...';
            qFlash.textContent = loadingText;
            qProgress.value = 0;
            // 读取固件文件
            const file = qFile.files[0];
            const data = await readAsBinaryString(file);
            const fileArray = [{ data: data, address: 0x000000 }];
            terminal.writeLine(`Info: ${t('burnStart').replace('{file}', file.name).replace('{addr}', '0x000000')}`);
            // 烧录固件（自动擦除+压缩）
            await quickLoader.write_flash({
                fileArray: fileArray,
                flashSize: "keep",
                eraseAll: true, // 自动擦除全部Flash
                compress: true, // 压缩烧录
                reportProgress: (_, written, total) => {
                    qProgress.value = (written / total) * 100;
                    terminal.writeLine(`Progress: ${currentLang === 'zh' ? '烧录中' : 'Burning'} ${(written / total * 100).toFixed(2)}%`);
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });
            // 烧录完成重启设备
            await quickLoader.hard_reset();
            qProgress.value = 0;
            qFlash.textContent = t('burnBtn');
            qFlash.disabled = false;
            terminal.writeLine(`Success: ${t('burnSuccess').replace('{mode}', modeNameMap.quick[currentLang])}`);
        } catch (e) {
            qProgress.value = 0;
            qFlash.textContent = t('burnBtn');
            qFlash.disabled = false;
            terminal.writeLine(`Error: ${t('burnFail').replace('{mode}', modeNameMap.quick[currentLang]).replace('{msg}', e.message)}`);
        }
    });

    // ==================== 自定义烧录核心逻辑 ====================
    const cConnect = document.getElementById('custom-connect');
    const cAddFile = document.getElementById('custom-add-file');
    const cFileList = document.getElementById('custom-file-list');
    const cFlash = document.getElementById('custom-flash');
    const cProgress = document.getElementById('custom-progress');
    // 添加固件文件项
    cAddFile.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.className = 'file-entry';
        const placeholder = currentLang === 'zh' ? 'Flash地址' : 'Flash Address';
        entry.innerHTML = `
      <input type="text" class="address-input" value="0x000000" placeholder="${placeholder}">
      <input type="file" class="file-input">
      <button class="remove-file">-</button>
    `;
        // 移除文件项
        entry.querySelector('.remove-file').addEventListener('click', () => entry.remove());
        cFileList.appendChild(entry);
    });
    // 自定义连接端口
    cConnect.addEventListener('click', async () => {
        try {
            cConnect.disabled = true;
            const loadingText = currentLang === 'zh' ? '🔌 正在连接...' : '🔌 Connecting...';
            cConnect.textContent = loadingText;
            updatePortStatus('c-port-dot', 'c-port-text', false);
            // 请求串口
            const port = await requestPort();
            const transport = new Transport(port);
            customLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport: transport,
                terminal: terminal
            });
            const chip = await customLoader.main_fn();
            updatePortStatus('c-port-dot', 'c-port-text', true);
            cConnect.textContent = t('connectPortBtn');
            cConnect.disabled = false;
            terminal.writeLine(`Success: ${t('connectSuccess').replace('{mode}', modeNameMap.custom[currentLang]).replace('{chip}', chip).replace('{baudrate}', DEFAULT_BAUDRATE)}`);
        } catch (e) {
            updatePortStatus('c-port-dot', 'c-port-text', false);
            cConnect.textContent = t('connectPortBtn');
            cConnect.disabled = false;
            terminal.writeLine(`Error: ${t('connectFail').replace('{mode}', modeNameMap.custom[currentLang]).replace('{msg}', e.message)}`);
        }
    });
    // 自定义烧录固件
    cFlash.addEventListener('click', async () => {
        if (!customLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);
        const fileArray = [];
        const entries = cFileList.querySelectorAll('.file-entry');
        // 校验并读取所有固件文件
        for (const entry of entries) {
            const addrInput = entry.querySelector('.address-input');
            const fileInput = entry.querySelector('.file-input');
            if (!fileInput.files[0]) return terminal.writeLine(`Error: ${t('allFileError')}`);
            if (!/^0x[0-9A-Fa-f]+$/.test(addrInput.value)) {
                return terminal.writeLine(`Error: ${t('addressFormatError').replace('{addr}', addrInput.value)}`);
            }
            const data = await readAsBinaryString(fileInput.files[0]);
            fileArray.push({
                data: data,
                address: parseInt(addrInput.value)
            });
            terminal.writeLine(`Info: ${t('addFileInfo').replace('{file}', fileInput.files[0].name).replace('{addr}', addrInput.value)}`);
        }
        // 开始烧录
        try {
            cFlash.disabled = true;
            const loadingText = currentLang === 'zh' ? '⚡ 正在烧录...' : '⚡ Burning...';
            cFlash.textContent = loadingText;
            cProgress.value = 0;
            terminal.writeLine(`Info: ${t('customBurnStart')}`);
            await customLoader.write_flash({
                fileArray: fileArray,
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    cProgress.value = (written / total) * 100;
                    terminal.writeLine(`Progress: ${currentLang === 'zh' ? '烧录中' : 'Burning'} ${(written / total * 100).toFixed(2)}%`);
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });
            await customLoader.hard_reset();
            cProgress.value = 0;
            cFlash.textContent = t('burnBtn');
            cFlash.disabled = false;
            terminal.writeLine(`Success: ${t('burnSuccess').replace('{mode}', modeNameMap.custom[currentLang])}`);
        } catch (e) {
            cProgress.value = 0;
            cFlash.textContent = t('burnBtn');
            cFlash.disabled = false;
            terminal.writeLine(`Error: ${t('burnFail').replace('{mode}', modeNameMap.custom[currentLang]).replace('{msg}', e.message)}`);
        }
    });

    // ==================== 擦除Flash核心逻辑 ====================
    const eConnect = document.getElementById('erase-connect');
    const eErase = document.getElementById('erase-flash');
    // 擦除连接端口
    eConnect.addEventListener('click', async () => {
        try {
            eConnect.disabled = true;
            const loadingText = currentLang === 'zh' ? '🔌 正在连接...' : '🔌 Connecting...';
            eConnect.textContent = loadingText;
            updatePortStatus('e-port-dot', 'e-port-text', false);
            // 请求串口
            const port = await requestPort();
            const transport = new Transport(port);
            eraseLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport: transport,
                terminal: terminal
            });
            await eraseLoader.main_fn();
            updatePortStatus('e-port-dot', 'e-port-text', true);
            eConnect.textContent = t('connectSerialBtn');
            eConnect.disabled = false;
            terminal.writeLine(`Success: ${t('connectSuccess').replace('{mode}', modeNameMap.erase[currentLang]).replace('{chip}', 'Serial Port').replace('{baudrate}', DEFAULT_BAUDRATE)}`);
        } catch (e) {
            updatePortStatus('e-port-dot', 'e-port-text', false);
            eConnect.textContent = t('connectSerialBtn');
            eConnect.disabled = false;
            terminal.writeLine(`Error: ${t('connectFail').replace('{mode}', modeNameMap.erase[currentLang]).replace('{msg}', e.message)}`);
        }
    });
    // 执行擦除Flash
    eErase.addEventListener('click', async () => {
        if (!eraseLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);
        try {
            eErase.disabled = true;
            const loadingText = currentLang === 'zh' ? '🗑️ 擦除中...' : '🗑️ Erasing...';
            eErase.textContent = loadingText;
            terminal.writeLine(`Info: ${t('eraseStart')}`);
            await eraseLoader.erase_flash();
            eErase.textContent = t('eraseBtn');
            eErase.disabled = false;
            terminal.writeLine(`Success: ${t('eraseSuccess')}`);
        } catch (e) {
            eErase.textContent = t('eraseBtn');
            eErase.disabled = false;
            terminal.writeLine(`Error: ${t('eraseFail').replace('{msg}', e.message)}`);
        }
    });

    // ==================== 初始化 ====================
    updateUILanguage(); // 初始化语言
    activateFunction('quick'); // 默认激活快捷烧录
    terminal.writeLine(`Info: ${t('initLog1')}`);
    terminal.writeLine(`Info: ${t('initLog2')}`);
    terminal.writeLine(`Info: ${t('initLog3')}`);
});