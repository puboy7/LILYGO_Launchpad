import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
import { deviceList } from './firmware-library.js';
import { i18n, typeNameMap, modeNameMap } from './i18n.js';

ready(() => {
    let currentLang = 'zh';
    const output = document.getElementById('output');
    const langSwitch = document.getElementById('lang-switch');

    function t(key) {
        return i18n[key] ? i18n[key][currentLang] : key;
    }

    function updateUILanguage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[key]) el.textContent = i18n[key][currentLang];
        });
        document.title = t('title');
        document.getElementById('logo-title').textContent = t('title');
        langSwitch.textContent = currentLang === 'zh' ? 'English' : '中文';
    }

    langSwitch.addEventListener('click', () => {
        currentLang = currentLang === 'zh' ? 'en' : 'zh';
        updateUILanguage();
    });

    const terminal = {
        writeLine: (msg) => {
            output.value += msg + '\n';
            output.scrollTop = output.scrollHeight;
        }
    };

    let quickLoader, customLoader, eraseLoader;
    let selectedDevice = null;
    let currentType = 'quick';
    const BAUD = 115200;

    const selectionCards = document.querySelectorAll('.selection-card');
    const functionCards = document.querySelectorAll('.function-card');

    function activateFunction(type) {
        currentType = type;
        selectionCards.forEach(c => c.classList.toggle('active', c.dataset.type === type));
        functionCards.forEach(c => c.classList.toggle('active', c.id === type + '-card'));
    }

    selectionCards.forEach(card => {
        card.addEventListener('click', () => activateFunction(card.dataset.type));
    });

    // ==================== 设备卡片渲染（已修复） ====================
    const deviceCardsEl = document.getElementById('device-cards');
    const chipInfo = document.getElementById('chip-info');
    const chipName = document.getElementById('chip-name');
    const quickBoard = document.getElementById('quick-board');

    deviceList.forEach(dev => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.innerHTML = `
      <img src="${dev.img}" alt="${dev.label}">
      <div class="device-name">${dev.label}</div>
    `;
        card.onclick = () => {
            document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedDevice = dev;
            chipInfo.classList.remove('hidden');
            chipName.textContent = dev.chip;
            quickBoard.textContent = `${dev.label} (${dev.chip})`;
            terminal.writeLine(`Selected: ${dev.label}`);
        };
        deviceCardsEl.appendChild(card);
    });

    // ==================== 快捷烧录 ====================
    const qConnect = document.getElementById('quick-connect');
    const qFile = document.getElementById('quick-file');
    const qFlash = document.getElementById('quick-flash');
    const qProgress = document.getElementById('quick-progress');
    const qStatus = document.getElementById('quick-status');

    qConnect.onclick = async () => {
        try {
            qConnect.disabled = true;
            qConnect.textContent = currentLang === 'zh' ? '连接中...' : 'Connecting...';
            const port = await requestPort();
            const tp = new Transport(port);
            quickLoader = new ESPLoader({ baudrate: BAUD, transport: tp, terminal });
            await quickLoader.main_fn();
            qStatus.textContent = currentLang === 'zh' ? '已连接' : 'Connected';
            qConnect.textContent = t('connectPortBtn');
            qConnect.disabled = false;
        } catch (e) {
            terminal.writeLine('Error: ' + e.message);
            qConnect.disabled = false;
        }
    };

    qFlash.onclick = async () => {
        if (!selectedDevice) return terminal.writeLine('Please select device first');
        if (!quickLoader) return terminal.writeLine('Please connect port');
        if (!qFile.files[0]) return terminal.writeLine('Please select firmware');
        try {
            qFlash.disabled = true;
            const data = await readAsBinaryString(qFile.files[0]);
            await quickLoader.write_flash({
                fileArray: [{ data, address: 0x000000 }],
                eraseAll: true,
                compress: true,
                reportProgress: (_, written, total) => {
                    qProgress.value = (written / total) * 100;
                }
            });
            await quickLoader.hard_reset();
            terminal.writeLine('Burn success!');
            qFlash.disabled = false;
        } catch (e) {
            terminal.writeLine('Burn failed: ' + e.message);
            qFlash.disabled = false;
        }
    };

    // ==================== 自定义烧录 ====================
    const cConnect = document.getElementById('custom-connect');
    const cAdd = document.getElementById('custom-add-file');
    const cList = document.getElementById('custom-file-list');
    const cFlash = document.getElementById('custom-flash');

    cAdd.onclick = () => {
        const div = document.createElement('div');
        div.className = 'file-entry';
        div.innerHTML = `
      <input type="text" class="address-input" value="0x000000">
      <input type="file" class="file-input">
      <button class="remove-file">-</button>
    `;
        div.querySelector('.remove-file').onclick = () => div.remove();
        cList.appendChild(div);
    };

    cConnect.onclick = async () => {
        try {
            cConnect.disabled = true;
            const port = await requestPort();
            const tp = new Transport(port);
            customLoader = new ESPLoader({ baudrate: BAUD, transport: tp, terminal });
            await customLoader.main_fn();
            document.getElementById('custom-status').textContent = 'Connected';
            cConnect.disabled = false;
        } catch (e) {
            terminal.writeLine('Error: ' + e.message);
            cConnect.disabled = false;
        }
    };

    cFlash.onclick = async () => {
        if (!customLoader) return terminal.writeLine('Connect first');
        const files = [];
        for (const fe of cList.querySelectorAll('.file-entry')) {
            const addr = fe.querySelector('.address-input').value;
            const fi = fe.querySelector('.file-input');
            if (!fi.files[0]) return terminal.writeLine('Missing file');
            const data = await readAsBinaryString(fi.files[0]);
            files.push({ data, address: parseInt(addr) });
        }
        try {
            cFlash.disabled = true;
            await customLoader.write_flash({ fileArray: files, eraseAll: true, compress: true });
            await customLoader.hard_reset();
            terminal.writeLine('Custom burn success');
            cFlash.disabled = false;
        } catch (e) {
            terminal.writeLine('Failed: ' + e.message);
            cFlash.disabled = false;
        }
    };

    // ==================== 擦除 ====================
    const eConnect = document.getElementById('erase-connect');
    const eErase = document.getElementById('erase-flash');

    eConnect.onclick = async () => {
        try {
            eConnect.disabled = true;
            const port = await requestPort();
            const tp = new Transport(port);
            eraseLoader = new ESPLoader({ baudrate: BAUD, transport: tp, terminal });
            await eraseLoader.main_fn();
            document.getElementById('erase-status').textContent = 'Connected';
            eConnect.disabled = false;
        } catch (e) {
            terminal.writeLine('Error: ' + e.message);
            eConnect.disabled = false;
        }
    };

    eErase.onclick = async () => {
        if (!eraseLoader) return terminal.writeLine('Connect first');
        try {
            eErase.disabled = true;
            await eraseLoader.erase_flash();
            terminal.writeLine('Erase done!');
            eErase.disabled = false;
        } catch (e) {
            terminal.writeLine('Erase failed: ' + e.message);
            eErase.disabled = false;
        }
    };

    // 初始化
    updateUILanguage();
    activateFunction('quick');
});