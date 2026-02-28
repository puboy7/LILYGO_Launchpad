import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
import { deviceList } from './firmware-library.js';
import { i18n, typeNameMap, modeNameMap } from './i18n.js';

ready(() => {
    // 全局变量
    let currentLang = 'en'; // 注意：这里你写的"默认中文"但值是en，如需默认中文改currentLang = 'zh'
    const output = document.getElementById('output');
    const langSwitch = document.getElementById('lang-switch');
    // 烧录器实例：快捷/自定义/擦除
    let quickLoader = null, customLoader = null, eraseLoader = null;
    let selectedDevice = null; // 选中的设备
    let selectedFirmwarePath = ''; // 选中的固件路径
    let firmwareBlob = null;  // 选中固件的Blob数据
    let currentType = 'quick'; // 默认激活快捷烧录
    const DEFAULT_BAUDRATE = 115200; // 固定波特率

    // 【核心修复1：精简日志但保留基础功能，不影响事件】
    const terminal = {
        clean: () => { output.value = ''; },
        write: (data) => { 
            // 过滤串口底层冗余打印
            const skipKeywords = ['发送', '接收', '字节', '波特率', '握手', 'ACK', 'NAK', 'sync', 'chip id'];
            if (skipKeywords.some(key => data.includes(key))) return;
            output.value += data; 
        },
        writeLine: (data) => {
            // 只保留关键日志（错误、成功、核心操作）
            const skipKeywords = ['Info: 选择固件版本', 'Success: 固件加载成功', 'Success: 连接成功', 'Info: 加载固件版本成功'];
            if (skipKeywords.some(key => data.includes(key))) return;
            output.value += data + '\n';
            output.scrollTop = output.scrollHeight; // 日志自动滚到底部
        }
    };

    // 翻译方法：根据当前语言获取对应文本
    function t(key) {
        return i18n[key] ? i18n[key][currentLang] : key;
    }

    // 更新整个界面的文字（中英文切换）
    function updateUILanguage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[key]) el.textContent = i18n[key][currentLang];
        });
        document.title = t('title');
        document.getElementById('logo-title').textContent = t('title');
        langSwitch.textContent = t('switchLangBtn');
        // 状态文字同步翻译
        const portDot = document.getElementById('port-dot');
        if (portDot) {
            document.getElementById('port-text').textContent = portDot.classList.contains('connected') ? t('connectedText') : t('disconnectedText');
            document.getElementById('c-port-text').textContent = document.getElementById('c-port-dot').classList.contains('connected') ? t('connectedText') : t('disconnectedText');
            document.getElementById('e-port-text').textContent = document.getElementById('e-port-dot').classList.contains('connected') ? t('connectedText') : t('disconnectedText');
        }
        // 设备标签文字同步
        if (!selectedDevice) {
            document.getElementById('device-label').textContent = t('noDeviceText');
        }
        // 固件版本选择框默认提示文字
        const versionSelect = document.getElementById('firmware-version');
        if (versionSelect.disabled) {
            versionSelect.innerHTML = `<option value="" selected>${currentLang === 'zh' ? '请先选择设备' : 'Please select device first'}</option>`;
        }
    }

    // 更新端口状态（红绿圆点切换，统一方法）
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

    // 【核心修复2：激活功能卡片逻辑完全保留，只删冗余日志，保证样式切换正常】
    function activateFunction(type) {
        currentType = type;
        // 切换卡片选中样式（这行是按钮切换的核心，必须保留）
        document.querySelectorAll('.selection-card').forEach(card => {
            card.classList.toggle('active', card.dataset.type === type);
        });
        // 切换功能面板显示（这行是面板切换的核心，必须保留）
        document.querySelectorAll('.function-card').forEach(card => {
            card.classList.toggle('active', card.id === `${type}-card`);
        });
        // 只删除冗余日志，不删核心逻辑
    }

    // ==================== 核心：设备卡片渲染+选设备加载固件版本 ====================
    const deviceCardsEl = document.getElementById('device-cards');
    // 删除无用的quickAddrInput变量（输入框已移除）
    const firmwareVersionSelect = document.getElementById('firmware-version');
    const qConnectBtn = document.getElementById('quick-connect');
    const qFlashBtn = document.getElementById('quick-flash');
    const qProgress = document.getElementById('quick-progress');

    deviceList.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `<img src="${dev.img}" alt="${dev.label}"><div class="device-name">${dev.label}</div>`;
        // 设备卡片点击事件（完全保留，不影响切换）
        card.addEventListener('click', async () => {
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedDevice = dev;

            // 加载该设备的所有固件版本到下拉框
            firmwareVersionSelect.innerHTML = '';
            firmwareVersionSelect.disabled = false;
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = currentLang === 'zh' ? '请选择固件版本' : 'Select firmware version';
            firmwareVersionSelect.appendChild(defaultOption);
            dev.firmwareVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version.path;
                option.textContent = version.name;
                firmwareVersionSelect.appendChild(option);
            });

            // 重置按钮/固件/进度条状态
            qConnectBtn.disabled = true;
            qFlashBtn.disabled = true;
            firmwareBlob = null;
            selectedFirmwarePath = '';
            qProgress.value = 0;

            // 更新设备状态显示
            const deviceText = `${dev.value} (${dev.chip.replace('_', '-')})`;
            document.getElementById('device-label').textContent = deviceText;
            document.getElementById('device-label').style.color = 'var(--primary)';
        });
        deviceCardsEl.appendChild(card);
    });

    // ==================== 核心：固件版本选择事件 ====================
    firmwareVersionSelect.addEventListener('change', async () => {
        const selectedPath = firmwareVersionSelect.value;
        const selectedVersionName = firmwareVersionSelect.options[firmwareVersionSelect.selectedIndex].text;
        if (!selectedPath || !selectedDevice) {
            firmwareBlob = null;
            selectedFirmwarePath = '';
            qConnectBtn.disabled = true;
            qFlashBtn.disabled = true;
            return;
        }

        try {
            selectedFirmwarePath = selectedPath;
            const response = await fetch(selectedPath);
            if (!response.ok) throw new Error(`HTTP ${response.status} (文件不存在/路径错误/跨域)`);
            firmwareBlob = await response.blob();
            qConnectBtn.disabled = false;
        } catch (e) {
            firmwareBlob = null;
            selectedFirmwarePath = '';
            qConnectBtn.disabled = true;
            qFlashBtn.disabled = true;
            terminal.writeLine(`Error: ${t('firmwareLoadFail').replace('{firmware}', selectedVersionName).replace('{msg}', e.message)}`);
        }
    });

    // ==================== 快捷烧录：连接设备端口 ====================
    qConnectBtn.addEventListener('click', async () => {
        if (!selectedDevice) return terminal.writeLine(`Error: ${t('noDeviceError')}`);
        if (!selectedFirmwarePath) return terminal.writeLine(`Error: ${t('selectFirmwareVersionFirst')}`);

        try {
            qConnectBtn.disabled = true;
            const loadingText = currentLang === 'zh' ? '🔌 连接中...' : '🔌 Connecting...';
            qConnectBtn.textContent = loadingText;
            updatePortStatus('port-dot', 'port-text', false);

            const port = await requestPort();
            const transport = new Transport(port);
            quickLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport: transport,
                terminal: terminal
            });
            await quickLoader.main_fn();

            updatePortStatus('port-dot', 'port-text', true);
            qConnectBtn.textContent = t('connectPortBtn');
            qConnectBtn.disabled = false;
            qFlashBtn.disabled = false;
        } catch (e) {
            updatePortStatus('port-dot', 'port-text', false);
            qConnectBtn.textContent = t('connectPortBtn');
            qConnectBtn.disabled = false;
            qFlashBtn.disabled = true;
            terminal.writeLine(`Error: ${t('connectFail').replace('{msg}', e.message)}`);
        }
    });

    // ==================== 快捷烧录：烧录固件 ====================
    qFlashBtn.addEventListener('click', async () => {
        if (!selectedDevice) return terminal.writeLine(`Error: ${t('noDeviceError')}`);
        if (!selectedFirmwarePath) return terminal.writeLine(`Error: ${t('selectFirmwareVersionFirst')}`);
        if (!firmwareBlob) return terminal.writeLine(`Error: ${t('firmwareLoadFail').replace('{firmware}', selectedFirmwarePath).replace('{msg}', '固件未加载/加载失败，请重新选择版本')}`);
        if (!quickLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);

        // 使用firmware-library里的默认地址
        const quickAddr = selectedDevice.defaultAddr || '0x000000';
        if (!/^0x[0-9A-Fa-f]+$/.test(quickAddr)) {
            return terminal.writeLine(`Error: ${t('addressFormatError').replace('{addr}', quickAddr)}`);
        }
        const addrNum = parseInt(quickAddr);
        const selectedVersionName = firmwareVersionSelect.options[firmwareVersionSelect.selectedIndex].text;

        try {
            qFlashBtn.disabled = true;
            const loadingText = currentLang === 'zh' ? '⚡ 烧录中...' : '⚡ Flashing...';
            qFlashBtn.textContent = loadingText;
            qProgress.value = 0;

            const data = await readAsBinaryString(firmwareBlob);
            const fileArray = [{ data: data, address: addrNum }];

            await quickLoader.write_flash({
                fileArray: fileArray,
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    qProgress.value = (written / total) * 100;
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });

            await quickLoader.hard_reset();
            qProgress.value = 0;
            qFlashBtn.textContent = t('burnBtn');
            qFlashBtn.disabled = false;
            terminal.writeLine(`Success: ${t('burnSuccess')}（${selectedDevice.label} - ${selectedVersionName}）`);
        } catch (e) {
            qProgress.value = 0;
            qFlashBtn.textContent = t('burnBtn');
            qFlashBtn.disabled = false;
            terminal.writeLine(`Error: ${t('burnFail').replace('{msg}', e.message)}`);
        }
    });

    // ==================== 自定义烧录（完整保留，保证切换可用） ====================
    const cConnect = document.getElementById('custom-connect');
    const cAddFile = document.getElementById('custom-add-file');
    const cFileList = document.getElementById('custom-file-list');
    const cFlash = document.getElementById('custom-flash');
    const cProgress = document.getElementById('custom-progress');

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
        } catch (e) {
            updatePortStatus('c-port-dot', 'c-port-text', false);
            cConnect.textContent = t('connectPortBtn');
            cConnect.disabled = false;
        }
    });

    cFlash.addEventListener('click', async () => {
        if (!customLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);
        const fileArray = [];
        const entries = cFileList.querySelectorAll('.file-entry');
        for (const entry of entries) {
            const addrInput = entry.querySelector('.address-input');
            const fileInput = entry.querySelector('.file-input');
            if (!fileInput.files[0]) return terminal.writeLine(`Error: ${t('allFileError')}`);
            if (!/^0x[0-9A-Fa-f]+$/.test(addrInput.value)) {
                return terminal.writeLine(`Error: ${t('addressFormatError').replace('{addr}', addrInput.value)}`);
            }
            const data = await readAsBinaryString(fileInput.files[0]);
            fileArray.push({ data: data, address: parseInt(addrInput.value) });
        }
        try {
            cFlash.disabled = true;
            cFlash.textContent = currentLang === 'zh' ? '⚡ 烧录中...' : '⚡ Flashing...';
            cProgress.value = 0;
            await customLoader.write_flash({
                fileArray: fileArray,
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    cProgress.value = (written / total) * 100;
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });
            await customLoader.hard_reset();
            cProgress.value = 0;
            cFlash.textContent = t('burnBtn');
            cFlash.disabled = false;
            terminal.writeLine(`Success: 自定义烧录 - 烧录完成！设备已重启`);
        } catch (e) {
            cProgress.value = 0;
            cFlash.textContent = t('burnBtn');
            cFlash.disabled = false;
            terminal.writeLine(`Error: 自定义烧录 - 烧录失败 - ${e.message}`);
        }
    });

    // ==================== 擦除Flash（完整保留，保证切换可用） ====================
    const eConnect = document.getElementById('erase-connect');
    const eErase = document.getElementById('erase-flash');

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
        } catch (e) {
            updatePortStatus('e-port-dot', 'e-port-text', false);
            eConnect.textContent = t('connectSerialBtn');
            eConnect.disabled = false;
        }
    });

    eErase.addEventListener('click', async () => {
        if (!eraseLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);
        try {
            eErase.disabled = true;
            eErase.textContent = currentLang === 'zh' ? '🗑️ 擦除中...' : '🗑️ Erasing...';
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

    // ==================== 初始化（保证事件绑定生效） ====================
    // 【核心修复3：重新绑定功能卡片点击事件，防止事件丢失】
    document.querySelectorAll('.selection-card').forEach(card => {
        card.addEventListener('click', () => activateFunction(card.dataset.type));
    });
    // 中英文切换事件
    langSwitch.addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        updateUILanguage();
    });
    // 初始化界面
    updateUILanguage();
    activateFunction('quick');
    // 精简初始化日志
    terminal.writeLine(`Info: ${t('initLog1')}`);
});