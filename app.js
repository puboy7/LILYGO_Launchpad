// 保留你源码的所有依赖导入
import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
// 导入设备配置（匹配图片卡片）
import { deviceList, firmwareAddressMap } from './firmware-library.js';

ready(() => {
    // 保留你源码的DOM元素
    const connect = document.getElementById('connect');
    const baudrate = document.getElementById('baudrate');
    const flash = document.getElementById('flash');
    const erase = document.getElementById('erase');
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const board = document.getElementById('board');
    const progressBar = document.querySelector('progress-bar');
    const fileList = document.getElementById('file-list');
    const addFileButton = document.getElementById('add-file');
    const eraseAllCheckbox = document.getElementById('erase-all');
    const compressCheckbox = document.getElementById('compress');

    // 新增：设备卡片相关元素
    const deviceCards = document.getElementById('device-cards');
    const chipInfo = document.getElementById('chip-info');
    const chipName = document.getElementById('chip-name');

    // 全局变量（保留你的loader + 新增设备选择变量）
    let loader;
    let selectedDevice = null; // 选中的设备
    let selectedChip = null;   // 选中设备的芯片

    // 第一步：初始化设备图片卡片（新增逻辑，不影响你的源码）
    function initDeviceList() {
        deviceList.forEach(device => {
            const card = document.createElement('div');
            card.className = 'device-card';
            card.dataset.device = device.value;
            card.dataset.chip = device.chip;
            card.innerHTML = `
        <img src="${device.img}" alt="${device.label}">
        <p class="device-name">${device.label}</p>
      `;
            // 卡片点击事件：选择设备 + 自动填充固件地址
            card.addEventListener('click', () => {
                // 移除其他卡片选中状态
                document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // 记录选中设备信息
                selectedDevice = device.value;
                selectedChip = device.chip;

                // 显示芯片信息
                chipInfo.classList.remove('hidden');
                chipName.textContent = selectedChip.replace('_', '-');

                // 自动填充该设备的固件地址（从配置文件读取）
                if (firmwareAddressMap[selectedDevice]) {
                    const fileEntries = fileList.querySelectorAll('.file-entry');
                    // 清空原有文件项
                    fileEntries.forEach((entry, index) => {
                        if (index > 0) entry.remove();
                    });
                    // 填充默认地址
                    const firstAddressInput = fileList.querySelector('.address-input');
                    firstAddressInput.value = firmwareAddressMap[selectedDevice].main;

                    // 若有分区表，自动添加第二个文件项
                    if (firmwareAddressMap[selectedDevice].partition) {
                        createFileEntry();
                        const secondAddressInput = fileList.querySelectorAll('.address-input')[1];
                        secondAddressInput.value = firmwareAddressMap[selectedDevice].partition;
                    }

                    terminal.writeLine(`Success: 选中设备 ${device.label}，已自动填充固件地址`);
                }

                board.textContent = `已选择${device.label}(${selectedChip.replace('_', '-')})`;
                board.style.color = 'var(--primary)';
            });
            deviceCards.appendChild(card);
        });
    }
    initDeviceList();

    // 第二步：保留你源码的文件管理逻辑
    function createFileEntry() {
        const entry = document.createElement('div');
        entry.className = 'file-entry';
        entry.innerHTML = `
      <input type="text" class="address-input" value="0x000000" placeholder="Flash地址">
      <input type="file" class="file-input">
      <button class="remove-file">-</button>
    `;

        const removeButton = entry.querySelector('.remove-file');
        removeButton.addEventListener('click', () => {
            if (fileList.children.length > 1) entry.remove();
            updateRemoveButtons();
        });

        const updateRemoveButtons = () => {
            document.querySelectorAll('.remove-file').forEach(btn => {
                btn.style.display = fileList.children.length > 1 ? 'inline' : 'none';
            });
        };

        fileList.appendChild(entry);
        updateRemoveButtons();
    }
    addFileButton.addEventListener('click', createFileEntry);

    // 第三步：保留你源码的终端日志逻辑（彩色日志）
    const terminal = {
        clean: () => output.value = '',
        write: data => output.value += data,
        writeLine: data => {
            // 日志颜色区分（保留你的逻辑）
            let logText = data;
            if (data.includes('Error:')) logText = `\x1b[31m${data}\x1b[0m`;
            else if (data.includes('Success:')) logText = `\x1b[32m${data}\x1b[0m`;
            else if (data.includes('Warning:')) logText = `\x1b[33m${data}\x1b[0m`;

            output.value += logText + '\n';
            output.scrollTop = output.scrollHeight;
        },
    };

    // 第四步：保留你源码的连接设备逻辑（适配新UI）
    connect.addEventListener('click', async () => {
        // 新增：检查是否选择设备
        if (!selectedDevice) {
            terminal.writeLine('Warning: 建议先选择设备型号，再连接端口');
        }

        try {
            connect.disabled = true;
            connect.textContent = '🔌 正在连接...';
            status.textContent = '连接中';
            status.style.color = 'var(--primary)';

            // 保留你的核心连接逻辑
            const device = await requestPort();
            const transport = new Transport(device);
            status.textContent = await transport.get_info();
            status.style.color = 'var(--success)';

            const loaderOptions = {
                baudrate: +baudrate.value,
                transport,
                terminal,
            };
            loader = new ESPLoader(loaderOptions);
            const chip = await loader.main_fn();
            board.textContent = chip;
            board.style.color = 'var(--primary)';
            terminal.writeLine(`Success: 已连接设备 - ${chip}`);

            connect.textContent = '🔌 已连接';
            connect.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 连接失败 - ${error.message}`);
            status.textContent = '连接失败';
            status.style.color = 'var(--danger)';
            connect.textContent = '🔌 连接设备端口';
            connect.disabled = false;
        }
    });

    // 第五步：保留你源码的擦除Flash逻辑
    erase.addEventListener('click', async () => {
        if (!loader) {
            terminal.writeLine('Error: 请先连接设备');
            return;
        }
        try {
            erase.disabled = true;
            erase.textContent = '🗑️ 擦除中...';
            terminal.writeLine('Info: 开始擦除Flash...');
            await loader.erase_flash();
            terminal.writeLine('Success: Flash擦除完成');
            erase.textContent = '🗑️ 擦除Flash';
            erase.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 擦除失败 - ${error.message}`);
            erase.textContent = '🗑️ 擦除Flash';
            erase.disabled = false;
        }
    });

    // 第六步：保留你源码的烧录逻辑（适配新UI）
    flash.addEventListener('click', async () => {
        const entries = fileList.querySelectorAll('.file-entry');
        const fileArray = [];

        // 保留你的文件验证逻辑
        for (const entry of entries) {
            const fileInput = entry.querySelector('.file-input');
            const addressInput = entry.querySelector('.address-input');

            const file = fileInput.files[0];
            if (!file) {
                terminal.writeLine('Error: 请选择所有文件');
                return;
            }

            // 验证文件类型
            const allowedTypes = ['application/octet-stream', 'application/x-executable', 'application/intel-hex'];
            if (!allowedTypes.includes(file.type) && !file.name.endsWith('.bin') && !file.name.endsWith('.elf') && !file.name.endsWith('.hex')) {
                terminal.writeLine(`Error: 不支持的文件类型 - ${file.name}`);
                return;
            }

            const data = await readAsBinaryString(file);
            fileArray.push({
                data,
                address: parseInt(addressInput.value)
            });
            terminal.writeLine(`Info: 已添加文件 - ${file.name} (地址: ${addressInput.value})`);
        }

        if (fileArray.length === 0) {
            terminal.writeLine('Error: 无文件可烧录');
            return;
        }

        if (!loader) {
            terminal.writeLine('Error: 请先连接设备');
            return;
        }

        // 保留你的烧录配置
        const flashOptions = {
            fileArray,
            flashSize: "keep",
            eraseAll: eraseAllCheckbox.checked,
            compress: compressCheckbox.checked,
            reportProgress: (index, written, total) => {
                const progress = (written / total) * 100;
                progressBar.value = progress;
                terminal.writeLine(`Progress: 烧录中 ${progress.toFixed(2)}%`);
            },
            calculateMD5Hash: image =>
                CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString(),
        };

        try {
            flash.disabled = true;
            flash.textContent = '⚡ 正在烧录...';
            terminal.writeLine('Info: 开始烧录...');
            await loader.write_flash(flashOptions);
            await loader.hard_reset();
            terminal.writeLine('Success: 烧录完成！设备已重启');
            progressBar.value = 0;
            flash.textContent = '⚡ 一键烧录固件';
            flash.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 烧录失败 - ${error.message}`);
            progressBar.value = 0;
            flash.textContent = '⚡ 一键烧录固件';
            flash.disabled = false;
        }
    });

    // 初始化日志
    terminal.writeLine('Info: 欢迎使用WebESP固件烧录工具，操作步骤：1.选设备 → 2.连端口 → 3.添加文件 → 4.烧录');
});