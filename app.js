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
    // 烧录器实例：快捷/自定义/擦除
    let quickLoader = null, customLoader = null, eraseLoader = null;
    let selectedDevice = null; // 选中的设备
    let selectedFirmwarePath = ''; // 选中的固件路径
    let firmwareBlob = null;  // 选中固件的Blob数据
    let currentType = 'quick'; // 默认激活快捷烧录
    const DEFAULT_BAUDRATE = 115200; // 固定波特率

    // 终端日志对象（补充clean方法）
    const terminal = {
        clean: () => { output.value = ''; },
        write: (data) => { output.value += data; },
        writeLine: (data) => {
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

    // 激活功能卡片（快捷/自定义/擦除）
    function activateFunction(type) {
        currentType = type;
        // 切换卡片选中样式
        document.querySelectorAll('.selection-card').forEach(card => card.classList.toggle('active', card.dataset.type === type));
        document.querySelectorAll('.function-card').forEach(card => card.classList.toggle('active', card.id === `${type}-card`));
        terminal.writeLine(`Info: ${t('activateFunction').replace('{type}', typeNameMap[type][currentLang])}`);
    }

    // ==================== 中英文切换绑定 ====================
    langSwitch.addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        updateUILanguage();
    });

    // ==================== 功能卡片切换绑定 ====================
    document.querySelectorAll('.selection-card').forEach(card => {
        card.addEventListener('click', () => activateFunction(card.dataset.type));
    });

    // ==================== 核心：设备卡片渲染+选设备加载固件版本/填地址 ====================
    const deviceCardsEl = document.getElementById('device-cards');
    const quickAddrInput = document.getElementById('quick-addr');
    const firmwareVersionSelect = document.getElementById('firmware-version');
    const qConnectBtn = document.getElementById('quick-connect');
    const qFlashBtn = document.getElementById('quick-flash');
    const qProgress = document.getElementById('quick-progress');

    deviceList.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `<img src="${dev.img}" alt="${dev.label}"><div class="device-name">${dev.label}</div>`;
        // 设备卡片点击事件
        card.addEventListener('click', async () => {
            // 取消其他设备选中，标记当前设备为选中
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedDevice = dev;

            // 1. 自动填充该设备的默认烧录地址
            quickAddrInput.value = dev.defaultAddr || '0x000000';
            terminal.writeLine(`Info: ${t('selectDeviceSuccess').replace('{device}', dev.label).replace('{addr}', dev.defaultAddr)}`);

            // 2. 加载该设备的所有固件版本到下拉框
            firmwareVersionSelect.innerHTML = ''; // 清空原有选项
            firmwareVersionSelect.disabled = false; // 启用下拉框
            // 添加默认提示选项
            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = currentLang === 'zh' ? '请选择固件版本' : 'Select firmware version';
            firmwareVersionSelect.appendChild(defaultOption);
            // 添加该设备的所有固件版本
            dev.firmwareVersions.forEach(version => {
                const option = document.createElement('option');
                option.value = version.path; // 值为固件路径
                option.textContent = version.name; // 显示版本名
                firmwareVersionSelect.appendChild(option);
            });
            // 日志提示加载成功
            const versionNames = dev.firmwareVersions.map(v => v.name).join(', ');
            terminal.writeLine(`Info: ${t('loadFirmwareVersionSuccess').replace('{device}', dev.label).replace('{versions}', versionNames)}`);

            // 3. 重置按钮/固件/进度条状态
            qConnectBtn.disabled = true;
            qFlashBtn.disabled = true;
            firmwareBlob = null;
            selectedFirmwarePath = '';
            qProgress.value = 0;

            // 4. 更新设备状态显示
            const deviceText = `${dev.value} (${dev.chip.replace('_', '-')})`;
            document.getElementById('device-label').textContent = deviceText;
            document.getElementById('device-label').style.color = 'var(--primary)';
        });
        deviceCardsEl.appendChild(card);
    });

    // ==================== 核心：固件版本选择事件（选版本自动加载固件） ====================
    firmwareVersionSelect.addEventListener('change', async () => {
        const selectedPath = firmwareVersionSelect.value;
        const selectedVersionName = firmwareVersionSelect.options[firmwareVersionSelect.selectedIndex].text;
        if (!selectedPath || !selectedDevice) {
            // 未选版本/设备：清空固件，禁用按钮
            firmwareBlob = null;
            selectedFirmwarePath = '';
            qConnectBtn.disabled = true;
            qFlashBtn.disabled = true;
            return;
        }

        // 加载选中版本的固件
        try {
            selectedFirmwarePath = selectedPath;
            terminal.writeLine(`Info: 选择固件版本【${selectedVersionName}】，固件路径：${selectedPath}`);
            const response = await fetch(selectedPath);
            if (!response.ok) throw new Error(`HTTP ${response.status} (文件不存在/路径错误/跨域)`);
            firmwareBlob = await response.blob(); // 保存固件Blob
            terminal.writeLine(`Success: 固件【${selectedVersionName}】加载成功`);
            qConnectBtn.disabled = false; // 启用连接按钮
        } catch (e) {
            // 加载失败：清空固件，禁用按钮
            firmwareBlob = null;
            selectedFirmwarePath = '';
            qConnectBtn.disabled = true;
            qFlashBtn.disabled = true;
            terminal.writeLine(`Error: ${t('firmwareLoadFail').replace('{firmware}', selectedVersionName).replace('{msg}', e.message)}`);
        }
    });

    // ==================== 快捷烧录：仅连接设备端口（无烧录，单独逻辑） ====================
    qConnectBtn.addEventListener('click', async () => {
        // 前置校验：必须先选择设备+固件版本
        if (!selectedDevice) return terminal.writeLine(`Error: ${t('noDeviceError')}`);
        if (!selectedFirmwarePath) return terminal.writeLine(`Error: ${t('selectFirmwareVersionFirst')}`);

        try {
            // 按钮状态：禁用+加载中
            qConnectBtn.disabled = true;
            const loadingText = currentLang === 'zh' ? '🔌 连接中...' : '🔌 Connecting...';
            qConnectBtn.textContent = loadingText;
            updatePortStatus('port-dot', 'port-text', false); // 先置为红色未连接

            // 申请串口端口并建立连接（仅连串口，不烧录）
            const port = await requestPort();
            const transport = new Transport(port);
            quickLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport: transport,
                terminal: terminal
            });
            await quickLoader.main_fn(); // 初始化烧录器，建立串口连接

            // 连接成功：红绿圆点变绿，恢复按钮，启用烧录按钮，日志提示
            updatePortStatus('port-dot', 'port-text', true);
            qConnectBtn.textContent = t('connectPortBtn');
            qConnectBtn.disabled = false;
            qFlashBtn.disabled = false; // 启用烧录按钮
            terminal.writeLine(`Success: ${t('connectSuccess')}（${selectedDevice.chip.replace('_', '-')}）`);
        } catch (e) {
            // 连接失败：圆点保持红色，恢复按钮，禁用烧录按钮，日志报错
            updatePortStatus('port-dot', 'port-text', false);
            qConnectBtn.textContent = t('connectPortBtn');
            qConnectBtn.disabled = false;
            qFlashBtn.disabled = true;
            terminal.writeLine(`Error: ${t('connectFail').replace('{msg}', e.message)}`);
        }
    });

    // ==================== 快捷烧录：烧录固件（必须先连接端口，单独逻辑） ====================
    qFlashBtn.addEventListener('click', async () => {
        // 前置全校验：选设备+选版本+固件加载成功+已连接端口+地址格式正确
        if (!selectedDevice) return terminal.writeLine(`Error: ${t('noDeviceError')}`);
        if (!selectedFirmwarePath) return terminal.writeLine(`Error: ${t('selectFirmwareVersionFirst')}`);
        if (!firmwareBlob) return terminal.writeLine(`Error: ${t('firmwareLoadFail').replace('{firmware}', selectedFirmwarePath).replace('{msg}', '固件未加载/加载失败，请重新选择版本')}`);
        if (!quickLoader) return terminal.writeLine(`Error: ${t('noConnectionError')}`);

        // 地址格式校验
        const quickAddr = quickAddrInput.value.trim();
        if (!/^0x[0-9A-Fa-f]+$/.test(quickAddr)) {
            return terminal.writeLine(`Error: ${t('addressFormatError').replace('{addr}', quickAddr)}`);
        }
        const addrNum = parseInt(quickAddr); // 转成烧录所需的数字格式
        const selectedVersionName = firmwareVersionSelect.options[firmwareVersionSelect.selectedIndex].text;

        try {
            // 烧录中：禁用按钮，重置进度条，日志提示
            qFlashBtn.disabled = true;
            const loadingText = currentLang === 'zh' ? '⚡ 烧录中...' : '⚡ Flashing...';
            qFlashBtn.textContent = loadingText;
            qProgress.value = 0;
            terminal.writeLine(`Info: ${t('burnStart').replace('{file}', `${selectedVersionName}`).replace('{addr}', quickAddr)}`);

            // 读取已加载的固件Blob数据
            const data = await readAsBinaryString(firmwareBlob);
            const fileArray = [{ data: data, address: addrNum }];

            // 执行烧录（使用已建立的quickLoader串口连接，无需重新连）
            await quickLoader.write_flash({
                fileArray: fileArray,
                flashSize: "keep",
                eraseAll: true, // 自动擦除全部Flash
                compress: true, // 压缩烧录（加快速度）
                reportProgress: (_, written, total) => {
                    qProgress.value = (written / total) * 100;
                    terminal.writeLine(`Progress: 烧录进度 ${(written / total * 100).toFixed(2)}%`);
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });

            // 烧录完成：重启设备，恢复按钮，进度条归0，日志提示
            await quickLoader.hard_reset();
            qProgress.value = 0;
            qFlashBtn.textContent = t('burnBtn');
            qFlashBtn.disabled = false;
            terminal.writeLine(`Success: ${t('burnSuccess')}（${selectedDevice.label} - ${selectedVersionName}）`);
        } catch (e) {
            // 烧录失败：恢复按钮，进度条归0，日志报错
            qProgress.value = 0;
            qFlashBtn.textContent = t('burnBtn');
            qFlashBtn.disabled = false;
            terminal.writeLine(`Error: ${t('burnFail').replace('{msg}', e.message)}`);
        }
    });

    // ==================== 自定义烧录（完整保留，无修改） ====================
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

    // 自定义烧录-连接端口
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
            terminal.writeLine(`Success: 自定义烧录 - 设备端口连接成功`);
        } catch (e) {
            updatePortStatus('c-port-dot', 'c-port-text', false);
            cConnect.textContent = t('connectPortBtn');
            cConnect.disabled = false;
            terminal.writeLine(`Error: 自定义烧录 - 连接失败 - ${e.message}`);
        }
    });

    // 自定义烧录-执行烧录
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
            fileArray.push({ data: data, address: parseInt(addrInput.value) });
            terminal.writeLine(`Info: 自定义烧录 - 添加文件：${fileInput.files[0].name}（地址：${addrInput.value}）`);
        }
        // 开始烧录
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

    // ==================== 擦除Flash（完整保留，无修改） ====================
    const eConnect = document.getElementById('erase-connect');
    const eErase = document.getElementById('erase-flash');

    // 擦除Flash-连接串口
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
            terminal.writeLine(`Success: 擦除Flash - 串口连接成功`);
        } catch (e) {
            updatePortStatus('e-port-dot', 'e-port-text', false);
            eConnect.textContent = t('connectSerialBtn');
            eConnect.disabled = false;
            terminal.writeLine(`Error: 擦除Flash - 连接失败 - ${e.message}`);
        }
    });

    // 擦除Flash-执行擦除
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

    // ==================== 初始化 ====================
    updateUILanguage(); // 初始化界面语言
    activateFunction('quick'); // 默认激活快捷烧录
    // 初始化日志
    terminal.writeLine(`Info: ${t('initLog1')}`);
    terminal.writeLine(`Info: ${t('initLog2')}`);
    terminal.writeLine(`Info: ${t('initLog3')}`);
});