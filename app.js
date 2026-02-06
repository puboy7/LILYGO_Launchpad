import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
import { deviceList } from './firmware-library.js';
import { i18n, typeNameMap, modeNameMap } from './i18n.js';

ready(() => {
    // 全局变量
    let currentLang = 'zh';
    const output = document.getElementById('output');
    const langSwitch = document.getElementById('lang-switch');
    let quickLoader = null;
    let selectedDevice = null;
    let currentType = 'quick';
    const DEFAULT_BAUDRATE = 115200;
    let firmwareBlob = null; // 存储选中设备的固件Blob

    // 终端日志（补充clean方法）
    const terminal = {
        clean: () => { output.value = ''; },
        write: (data) => { output.value += data; },
        writeLine: (data) => {
            output.value += data + '\n';
            output.scrollTop = output.scrollHeight;
        }
    };

    // 翻译方法
    function t(key) {
        return i18n[key] ? i18n[key][currentLang] : key;
    }

    // 更新界面语言
    function updateUILanguage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[key]) el.textContent = i18n[key][currentLang];
        });
        document.title = t('title');
        document.getElementById('logo-title').textContent = t('title');
        langSwitch.textContent = t('switchLangBtn');
        // 状态文字同步
        const portDot = document.getElementById('port-dot');
        if (portDot) {
            document.getElementById('port-text').textContent = portDot.classList.contains('connected') ? t('connectedText') : t('disconnectedText');
            document.getElementById('c-port-text').textContent = document.getElementById('c-port-dot').classList.contains('connected') ? t('connectedText') : t('disconnectedText');
            document.getElementById('e-port-text').textContent = document.getElementById('e-port-dot').classList.contains('connected') ? t('connectedText') : t('disconnectedText');
        }
        if (!selectedDevice) {
            document.getElementById('device-label').textContent = t('noDeviceText');
        }
    }

    // 语言切换绑定
    langSwitch.addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        updateUILanguage();
    });

    // 卡片切换逻辑
    const selectionCards = document.querySelectorAll('.selection-card');
    const functionCards = document.querySelectorAll('.function-card');
    function activateFunction(type) {
        currentType = type;
        selectionCards.forEach(card => card.classList.toggle('active', card.dataset.type === type));
        functionCards.forEach(card => card.classList.toggle('active', card.id === `${type}-card`));
        terminal.writeLine(`Info: ${t('activateFunction').replace('{type}', typeNameMap[type][currentLang])}`);
    }
    selectionCards.forEach(card => {
        card.addEventListener('click', () => activateFunction(card.dataset.type));
    });

    // 更新端口状态（红绿圆点）
    function updatePortStatus(dotId, textId, isConnected) {
        const dot = document.getElementById(dotId);
        const text = document.getElementById(textId);
        if (isConnected) {
            dot.className = 'status-dot connected';
            text.textContent = t('connectedText');
            text.style.color = 'var(--success)';
        } else {
            dot.className = 'status-dot disconnected';
            text.textContent = t('disconnectedText');
            text.style.color = 'var(--danger)';
        }
    }

    // ==================== 核心：选设备自动绑定固件+填充地址 ====================
    const deviceCardsEl = document.getElementById('device-cards');
    const quickAddrInput = document.getElementById('quick-addr');
    deviceList.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `<img src="${dev.img}" alt="${dev.label}"><div class="device-name">${dev.label}</div>`;
        card.addEventListener('click', async () => {
            // 选中设备样式
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedDevice = dev;

            // 1. 填充默认地址
            quickAddrInput.value = dev.defaultAddr || '0x000000';

            // 2. 加载对应固件（核心）
            try {
                terminal.writeLine(`Info: ${t('selectDeviceSuccess').replace('{device}', dev.label).replace('{firmware}', dev.firmwarePath).replace('{addr}', dev.defaultAddr)}`);
                const response = await fetch(dev.firmwarePath);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                firmwareBlob = await response.blob(); // 保存固件Blob
                terminal.writeLine(`Success: 固件${dev.firmwarePath}加载成功`);
            } catch (e) {
                firmwareBlob = null;
                terminal.writeLine(`Error: ${t('firmwareLoadFail').replace('{firmware}', dev.firmwarePath).replace('{msg}', e.message)}`);
            }

            // 3. 更新设备状态显示
            const deviceText = `${dev.label} (${dev.chip.replace('_', '-')})`;
            document.getElementById('device-label').textContent = deviceText;
            document.getElementById('device-label').style.color = 'var(--primary)';
        });
        deviceCardsEl.appendChild(card);
    });

    // ==================== 核心：连接端口 → 自动烧录 ====================
    const qConnectBtn = document.getElementById('quick-connect');
    const qProgress = document.getElementById('quick-progress');
    qConnectBtn.addEventListener('click', async () => {
        // 前置校验
        if (!selectedDevice) return terminal.writeLine(`Error: ${t('noDeviceError')}`);
        if (!firmwareBlob) return terminal.writeLine(`Error: ${t('firmwareLoadFail').replace('{firmware}', selectedDevice.firmwarePath).replace('{msg}', '固件未加载')}`);

        // 地址格式校验
        const quickAddr = quickAddrInput.value.trim();
        if (!/^0x[0-9A-Fa-f]+$/.test(quickAddr)) {
            return terminal.writeLine(`Error: ${t('addressFormatError').replace('{addr}', quickAddr)}`);
        }
        const addrNum = parseInt(quickAddr);

        try {
            // 按钮状态：禁用+加载中
            qConnectBtn.disabled = true;
            const loadingText = currentLang === 'zh' ? '🔌 连接并烧录中...' : '🔌 Connecting & Burning...';
            qConnectBtn.textContent = loadingText;
            updatePortStatus('port-dot', 'port-text', false);
            qProgress.value = 0;
            terminal.writeLine(`Info: ${t('connectBurnStart')}`);

            // 1. 连接串口
            const port = await requestPort();
            const transport = new Transport(port);
            quickLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport: transport,
                terminal: terminal
            });
            await quickLoader.main_fn();
            updatePortStatus('port-dot', 'port-text', true);
            terminal.writeLine(`Success: ${t('connectSuccess')}`);

            // 2. 读取固件数据
            const data = await readAsBinaryString(firmwareBlob);
            const fileArray = [{ data: data, address: addrNum }];
            terminal.writeLine(`Info: ${t('burnStart').replace('{file}', selectedDevice.firmwarePath).replace('{addr}', quickAddr)}`);

            // 3. 自动烧录
            await quickLoader.write_flash({
                fileArray: fileArray,
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    qProgress.value = (written / total) * 100;
                    terminal.writeLine(`Progress: ${(written / total * 100).toFixed(2)}%`);
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });

            // 4. 烧录完成重启
            await quickLoader.hard_reset();
            qProgress.value = 100;
            terminal.writeLine(`Success: ${t('burnSuccess')}`);

        } catch (e) {
            updatePortStatus('port-dot', 'port-text', false);
            terminal.writeLine(`Error: ${t('burnFail').replace('{msg}', e.message)}`);
        } finally {
            // 恢复按钮状态
            qConnectBtn.disabled = false;
            qConnectBtn.textContent = t('connectBurnBtn');
            qProgress.value = 0;
        }
    });

    // ==================== 自定义烧录（保留不变） ====================
    const cConnect = document.getElementById('custom-connect');
    const cAddFile = document.getElementById('custom-add-file');
    const cFileList = document.getElementById('custom-file-list');
    const cFlash = document.getElementById('custom-flash');
    const cProgress = document.getElementById('custom-progress');
    let customLoader = null;

    cAddFile.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.className = 'file-entry';
        const placeholder = currentLang === 'zh' ? 'Flash地址' : 'Flash Address';
        entry.innerHTML = `
      <input type="text" class="address-input" value="0x000000" placeholder="${placeholder}">
      <input type="file" class="file-input">
      <button class="remove-file">-</button>
    `;
        entry.querySelector('.remove-file').addEventListener('click', () => entry.remove());
        cFileList.appendChild(entry);
    });

    cConnect.addEventListener('click', async () => {
        try {
            cConnect.disabled = true;
            const loadingText = currentLang === 'zh' ? '🔌 正在连接...' : '🔌 Connecting...';
            cConnect.textContent = loadingText;
            updatePortStatus('c-port-dot', 'c-port-text', false);
            const port = await requestPort();
            const transport = new Transport(port);
            customLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport: transport,
                terminal: terminal
            });
            await customLoader.main_fn();
            updatePortStatus('c-port-dot', 'c-port-text', true);
            cConnect.textContent = t('connectPortBtn');
            cConnect.disabled = false;
            terminal.writeLine(`Success: 自定义模式连接成功`);
        } catch (e) {
            updatePortStatus('c-port-dot', 'c-port-text', false);
            cConnect.textContent = t('connectPortBtn');
            cConnect.disabled = false;
            terminal.writeLine(`Error: 自定义模式连接失败 - ${e.message}`);
        }
    });

    cFlash.addEventListener('click', async () => {
        if (!customLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);
        const fileArray = [];
        const entries = cFileList.querySelectorAll('.file-entry');
        for (const entry of entries) {
            const addrInput = entry.querySelector('.address-input');
            const fileInput = entry.querySelector('.file-input');
            if (!fileInput.files[0]) return terminal.writeLine(`Error: ${t('noFileError')}`);
            if (!/^0x[0-9A-Fa-f]+$/.test(addrInput.value)) {
                return terminal.writeLine(`Error: ${t('addressFormatError').replace('{addr}', addrInput.value)}`);
            }
            const data = await readAsBinaryString(fileInput.files[0]);
            fileArray.push({ data: data, address: parseInt(addrInput.value) });
        }
        try {
            cFlash.disabled = true;
            cFlash.textContent = currentLang === 'zh' ? '⚡ 烧录中...' : '⚡ Burning...';
            cProgress.value = 0;
            await customLoader.write_flash({
                fileArray: fileArray,
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    cProgress.value = (written / total) * 100;
                }
            });
            await customLoader.hard_reset();
            cProgress.value = 0;
            cFlash.textContent = t('burnBtn');
            cFlash.disabled = false;
            terminal.writeLine(`Success: 自定义烧录完成`);
        } catch (e) {
            cProgress.value = 0;
            cFlash.textContent = t('burnBtn');
            cFlash.disabled = false;
            terminal.writeLine(`Error: 自定义烧录失败 - ${e.message}`);
        }
    });

    // ==================== 擦除Flash（保留不变） ====================
    const eConnect = document.getElementById('erase-connect');
    const eErase = document.getElementById('erase-flash');
    let eraseLoader = null;

    eConnect.addEventListener('click', async () => {
        try {
            eConnect.disabled = true;
            eConnect.textContent = currentLang === 'zh' ? '🔌 连接中...' : '🔌 Connecting...';
            updatePortStatus('e-port-dot', 'e-port-text', false);
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
            terminal.writeLine(`Success: 擦除模式连接成功`);
        } catch (e) {
            updatePortStatus('e-port-dot', 'e-port-text', false);
            eConnect.textContent = t('connectSerialBtn');
            eConnect.disabled = false;
            terminal.writeLine(`Error: 擦除模式连接失败 - ${e.message}`);
        }
    });

    eErase.addEventListener('click', async () => {
        if (!eraseLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);
        try {
            eErase.disabled = true;
            eErase.textContent = currentLang === 'zh' ? '🗑️ 擦除中...' : '🗑️ Erasing...';
            await eraseLoader.erase_flash();
            eErase.textContent = t('eraseBtn');
            eErase.disabled = false;
            terminal.writeLine(`Success: Flash擦除完成`);
        } catch (e) {
            eErase.textContent = t('eraseBtn');
            eErase.disabled = false;
            terminal.writeLine(`Error: Flash擦除失败 - ${e.message}`);
        }
    });

    // 初始化
    updateUILanguage();
    activateFunction('quick');
    terminal.writeLine(`Info: ${t('initLog1')}`);
    terminal.writeLine(`Info: ${t('initLog2')}`);
    terminal.writeLine(`Info: ${t('initLog3')}`);
});