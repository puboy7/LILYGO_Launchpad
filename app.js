import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
import { deviceList } from './firmware-library.js';
import { i18n, typeNameMap, modeNameMap } from './i18n.js';

ready(() => {
    // ====================== 中英文切换核心逻辑 ======================
    let currentLang = 'zh'; // 默认中文
    const langSwitchBtn = document.getElementById('lang-switch');
    const output = document.getElementById('output');

    // 切换语言
    function switchLanguage(lang) {
        currentLang = lang;
        // 更新按钮文字
        langSwitchBtn.textContent = i18n.switchLangBtn[lang];
        // 更新页面标题
        document.title = i18n.title[lang];
        document.getElementById('logo-title').textContent = i18n.title[lang];
        // 更新所有带data-i18n属性的元素
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[key]) el.textContent = i18n[key][lang];
        });
        // 清空日志并重新输出初始化日志
        output.value = '';
        terminal.writeLine(i18n.initLog1[lang]);
        terminal.writeLine(i18n.initLog2[lang]);
        terminal.writeLine(i18n.initLog3[lang]);
    }

    // 绑定切换按钮点击事件
    langSwitchBtn.addEventListener('click', () => {
        const newLang = currentLang === 'zh' ? 'en' : 'zh';
        switchLanguage(newLang);
    });

    // 日志输出（支持双语）
    const terminal = {
        clean: () => output.value = '',
        write: data => output.value += data,
        writeLine: (key, params = {}) => {
            let logText = i18n[key][currentLang];
            // 替换日志中的占位符（如{type}、{device}等）
            Object.keys(params).forEach(param => {
                logText = logText.replace(`{${param}}`, params[param]);
            });
            // 保留颜色区分
            if (key.includes('Error')) logText = `\x1b[31m${logText}\x1b[0m`;
            else if (key.includes('Success')) logText = `\x1b[32m${logText}\x1b[0m`;
            else if (key.includes('Info')) logText = `\x1b[34m${logText}\x1b[0m`;
            output.value += logText + '\n';
            output.scrollTop = output.scrollHeight;
        },
    };

    // ====================== 原有核心逻辑（整合双语） ======================
    let quickLoader = null;
    let customLoader = null;
    let eraseLoader = null;
    let selectedDevice = null;
    let currentType = 'quick';
    const DEFAULT_BAUDRATE = 115200;

    // 卡片切换逻辑
    const selectionCards = document.querySelectorAll('.selection-card');
    const functionCards = document.querySelectorAll('.function-card');

    function activateFunction(type) {
        selectionCards.forEach(card => {
            card.classList.toggle('active', card.dataset.type === type);
        });
        functionCards.forEach(card => {
            card.classList.toggle('active', card.id === `${type}-card`);
        });
        currentType = type;
        // 双语日志
        terminal.writeLine('activateFunction', { type: typeNameMap[type][currentType] });
    }

    selectionCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            if (type !== currentType) activateFunction(type);
        });
    });

    // 初始化（默认中文）
    switchLanguage('zh');
    activateFunction('quick');

    // ====================== 快捷烧录逻辑 ======================
    const quickConnect = document.getElementById('quick-connect');
    const quickBoard = document.getElementById('quick-board');
    const quickStatus = document.getElementById('quick-status');
    const quickFile = document.getElementById('quick-file');
    const quickFlash = document.getElementById('quick-flash');
    const quickProgress = document.getElementById('quick-progress');
    const deviceCards = document.getElementById('device-cards');
    const chipInfo = document.getElementById('chip-info');
    const chipName = document.getElementById('chip-name');

    deviceList.forEach(device => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `<img src="${device.img}" alt="${device.label}"><p class="device-name">${device.label}</p>`;
        card.addEventListener('click', () => {
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedDevice = device;
            chipInfo.classList.remove('hidden');
            chipName.textContent = device.chip.replace('_', '-');
            quickBoard.textContent = `${i18n.selectDeviceSuccess[currentLang].replace('{device}', device.label).replace('地址固定为0x000000', '')} (${device.chip.replace('_', '-')})`;
            quickBoard.style.color = 'var(--primary)';
            terminal.writeLine('selectDeviceSuccess', { device: device.label });
        });
        deviceCards.appendChild(card);
    });

    quickConnect.addEventListener('click', async () => {
        try {
            quickConnect.disabled = true;
            quickConnect.textContent = `${i18n.connectPortBtn[currentLang].split(' ')[0]} 正在连接...`;
            quickStatus.textContent = i18n.connectSuccess[currentLang].includes('connected') ? 'Connecting' : '连接中';
            quickStatus.className = 'primary';

            const device = await requestPort();
            const transport = new Transport(device);
            const portInfo = await transport.get_info();
            quickStatus.textContent = portInfo;
            quickStatus.className = 'success';

            quickLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport,
                terminal
            });
            const chip = await quickLoader.main_fn();
            quickBoard.textContent += ` - ${currentLang === 'zh' ? '已连接' : 'Connected'}(${chip})`;
            terminal.writeLine('connectSuccess', { mode: modeNameMap.quick[currentLang], chip, baudrate: DEFAULT_BAUDRATE });

            quickConnect.textContent = i18n.connectPortBtn[currentLang].replace('🔌 ', '') === '连接设备端口' ? '🔌 已连接' : '🔌 Connected';
            quickConnect.disabled = false;
        } catch (error) {
            terminal.writeLine('connectFail', { mode: modeNameMap.quick[currentLang], msg: error.message });
            quickStatus.textContent = currentLang === 'zh' ? '连接失败' : 'Connection Failed';
            quickStatus.className = 'danger';
            quickConnect.textContent = i18n.connectPortBtn[currentLang];
            quickConnect.disabled = false;
        }
    });

    quickFlash.addEventListener('click', async () => {
        if (!selectedDevice) {
            terminal.writeLine('noDeviceError');
            return;
        }
        if (!quickLoader) {
            terminal.writeLine('noConnectionError');
            return;
        }
        if (!quickFile.files[0]) {
            terminal.writeLine('noFileError');
            return;
        }

        try {
            quickFlash.disabled = true;
            quickFlash.textContent = `${i18n.burnBtn[currentLang].split(' ')[0]} 正在烧录...`;
            quickProgress.value = 0;

            const file = quickFile.files[0];
            const data = await readAsBinaryString(file);
            const fileArray = [{ data, address: 0x000000 }];
            terminal.writeLine('burnStart', { file: file.name, addr: '0x000000' });

            await quickLoader.write_flash({
                fileArray,
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    const progress = (written / total) * 100;
                    quickProgress.value = progress;
                    const progressText = currentLang === 'zh' ? `烧录中 ${progress.toFixed(2)}%` : `Burning ${progress.toFixed(2)}%`;
                    terminal.writeLine('Info', { type: progressText });
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });

            await quickLoader.hard_reset();
            terminal.writeLine('burnSuccess', { mode: modeNameMap.quick[currentLang] });
            quickProgress.value = 0;
            quickFlash.textContent = i18n.burnBtn[currentLang];
            quickFlash.disabled = false;
        } catch (error) {
            terminal.writeLine('burnFail', { mode: modeNameMap.quick[currentLang], msg: error.message });
            quickProgress.value = 0;
            quickFlash.textContent = i18n.burnBtn[currentLang];
            quickFlash.disabled = false;
        }
    });

    // ====================== 自定义烧录逻辑 ======================
    const customConnect = document.getElementById('custom-connect');
    const customStatus = document.getElementById('custom-status');
    const customFileList = document.getElementById('custom-file-list');
    const customAddFile = document.getElementById('custom-add-file');
    const customFlash = document.getElementById('custom-flash');
    const customProgress = document.getElementById('custom-progress');

    customAddFile.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.className = 'file-entry';
        entry.innerHTML = `
      <input type="text" class="address-input" value="0x000000" placeholder="${currentLang === 'zh' ? 'Flash地址' : 'Flash Address'}">
      <input type="file" class="file-input">
      <button class="remove-file">-</button>
    `;
        entry.querySelector('.remove-file').addEventListener('click', () => {
            if (customFileList.children.length > 1) entry.remove();
        });
        customFileList.appendChild(entry);
    });

    customConnect.addEventListener('click', async () => {
        try {
            customConnect.disabled = true;
            customConnect.textContent = `${i18n.connectPortBtn[currentLang].split(' ')[0]} 正在连接...`;
            customStatus.textContent = currentLang === 'zh' ? '连接中' : 'Connecting';
            customStatus.className = 'primary';

            const device = await requestPort();
            const transport = new Transport(device);
            const portInfo = await transport.get_info();
            customStatus.textContent = portInfo;
            customStatus.className = 'success';

            customLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport,
                terminal
            });
            const chip = await customLoader.main_fn();
            terminal.writeLine('connectSuccess', { mode: modeNameMap.custom[currentLang], chip, baudrate: DEFAULT_BAUDRATE });

            customConnect.textContent = i18n.connectPortBtn[currentLang].replace('🔌 ', '') === '连接设备端口' ? '🔌 已连接' : '🔌 Connected';
            customConnect.disabled = false;
        } catch (error) {
            terminal.writeLine('connectFail', { mode: modeNameMap.custom[currentLang], msg: error.message });
            customStatus.textContent = currentLang === 'zh' ? '连接失败' : 'Connection Failed';
            customStatus.className = 'danger';
            customConnect.textContent = i18n.connectPortBtn[currentLang];
            customConnect.disabled = false;
        }
    });

    customFlash.addEventListener('click', async () => {
        if (!customLoader) {
            terminal.writeLine('noConnectionError');
            return;
        }

        const fileArray = [];
        const entries = customFileList.querySelectorAll('.file-entry');
        for (const entry of entries) {
            const fileInput = entry.querySelector('.file-input');
            const addressInput = entry.querySelector('.address-input');
            if (!fileInput.files[0]) {
                terminal.writeLine('allFileError');
                return;
            }
            if (!/^0x[0-9A-Fa-f]+$/.test(addressInput.value)) {
                terminal.writeLine('addressFormatError', { addr: addressInput.value });
                return;
            }
            const data = await readAsBinaryString(fileInput.files[0]);
            fileArray.push({
                data,
                address: parseInt(addressInput.value)
            });
            terminal.writeLine('burnStart', { file: fileInput.files[0].name, addr: addressInput.value });
        }

        try {
            customFlash.disabled = true;
            customFlash.textContent = `${i18n.burnBtn[currentLang].split(' ')[0]} 正在烧录...`;
            customProgress.value = 0;

            terminal.writeLine('customBurnStart');
            await customLoader.write_flash({
                fileArray,
                flashSize: "keep",
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    const progress = (written / total) * 100;
                    customProgress.value = progress;
                    const progressText = currentLang === 'zh' ? `烧录中 ${progress.toFixed(2)}%` : `Burning ${progress.toFixed(2)}%`;
                    terminal.writeLine('Info', { type: progressText });
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });

            await customLoader.hard_reset();
            terminal.writeLine('burnSuccess', { mode: modeNameMap.custom[currentLang] });
            customProgress.value = 0;
            customFlash.textContent = i18n.burnBtn[currentLang];
            customFlash.disabled = false;
        } catch (error) {
            terminal.writeLine('burnFail', { mode: modeNameMap.custom[currentLang], msg: error.message });
            customProgress.value = 0;
            customFlash.textContent = i18n.burnBtn[currentLang];
            customFlash.disabled = false;
        }
    });

    // ====================== 擦除Flash逻辑 ======================
    const eraseConnect = document.getElementById('erase-connect');
    const eraseStatus = document.getElementById('erase-status');
    const eraseFlash = document.getElementById('erase-flash');

    eraseConnect.addEventListener('click', async () => {
        try {
            eraseConnect.disabled = true;
            eraseConnect.textContent = `${i18n.connectSerialBtn[currentLang].split(' ')[0]} 正在连接...`;
            eraseStatus.textContent = currentLang === 'zh' ? '连接中' : 'Connecting';
            eraseStatus.className = 'primary';

            const device = await requestPort();
            const transport = new Transport(device);
            const portInfo = await transport.get_info();
            eraseStatus.textContent = portInfo;
            eraseStatus.className = 'success';

            eraseLoader = new ESPLoader({
                baudrate: DEFAULT_BAUDRATE,
                transport,
                terminal
            });
            await eraseLoader.main_fn();
            terminal.writeLine('connectSuccess', { mode: modeNameMap.erase[currentLang], chip: 'Serial Port', baudrate: DEFAULT_BAUDRATE });

            eraseConnect.textContent = i18n.connectSerialBtn[currentLang].replace('🔌 ', '') === '连接串口' ? '🔌 已连接' : '🔌 Connected';
            eraseConnect.disabled = false;
        } catch (error) {
            terminal.writeLine('connectFail', { mode: modeNameMap.erase[currentLang], msg: error.message });
            eraseStatus.textContent = currentLang === 'zh' ? '连接失败' : 'Connection Failed';
            eraseStatus.className = 'danger';
            eraseConnect.textContent = i18n.connectSerialBtn[currentLang];
            eraseConnect.disabled = false;
        }
    });

    eraseFlash.addEventListener('click', async () => {
        if (!eraseLoader) {
            terminal.writeLine('noConnectionError');
            return;
        }

        try {
            eraseFlash.disabled = true;
            eraseFlash.textContent = `${i18n.eraseBtn[currentLang].split(' ')[0]} 擦除中...`;
            terminal.writeLine('eraseStart');

            await eraseLoader.erase_flash();
            terminal.writeLine('eraseSuccess');

            eraseFlash.textContent = i18n.eraseBtn[currentLang];
            eraseFlash.disabled = false;
        } catch (error) {
            terminal.writeLine('eraseFail', { msg: error.message });
            eraseFlash.textContent = i18n.eraseBtn[currentLang];
            eraseFlash.disabled = false;
        }
    });
});