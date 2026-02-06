// 保留你源码的所有依赖导入
import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
// 导入设备配置
import { deviceList } from './firmware-library.js';

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

    // 新增：模式切换相关元素
    const modeRadios = document.querySelectorAll('input[name="burn-mode"]');
    const deviceCards = document.getElementById('device-cards');
    const chipInfo = document.getElementById('chip-info');
    const chipName = document.getElementById('chip-name');

    // 全局变量
    let loader;
    let selectedDevice = null;
    let currentMode = 'quick'; // 默认快捷模式

    // 第一步：模式切换核心逻辑（新增）
    function switchMode(mode) {
        currentMode = mode;
        // 更新body类名，控制样式显隐
        document.body.className = mode === 'quick' ? 'quick-mode' : 'custom-mode';

        // 快捷模式：重置为0x0地址+只读+仅1个文件项
        if (mode === 'quick') {
            // 清空多余文件项
            const fileEntries = fileList.querySelectorAll('.file-entry');
            fileEntries.forEach((entry, index) => {
                if (index > 0) entry.remove();
            });
            // 地址固定0x0且只读
            const addressInput = fileList.querySelector('.address-input');
            addressInput.value = '0x000000';
            addressInput.readOnly = true;
            // 提示
            terminal.writeLine('Info: 切换到【快捷烧录模式】- 选设备后自动用0x0地址烧录');
        }
        // 自定义模式：地址可编辑+显示添加文件按钮
        else {
            // 地址可编辑
            const addressInput = fileList.querySelector('.address-input');
            addressInput.readOnly = false;
            // 重置设备选择状态
            selectedDevice = null;
            board.textContent = '未选择设备（自定义模式）';
            board.style.color = 'var(--text)';
            chipInfo.classList.add('hidden');
            // 提示
            terminal.writeLine('Info: 切换到【自定义烧录模式】- 可自由添加文件/修改地址');
        }
    }

    // 绑定模式切换事件
    modeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.checked) {
                switchMode(radio.value);
            }
        });
    });

    // 第二步：初始化设备图片卡片（仅快捷模式生效）
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
            // 卡片点击事件（仅快捷模式生效）
            card.addEventListener('click', () => {
                if (currentMode !== 'quick') return;

                // 移除其他卡片选中状态
                document.querySelectorAll('.device-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                // 记录选中设备信息
                selectedDevice = device.value;
                const chip = device.chip;

                // 显示芯片信息
                chipInfo.classList.remove('hidden');
                chipName.textContent = chip.replace('_', '-');

                // 快捷模式：强制地址为0x0
                const addressInput = fileList.querySelector('.address-input');
                addressInput.value = '0x000000';

                board.textContent = `已选择${device.label}(${chip.replace('_', '-')}) - 地址固定0x0`;
                board.style.color = 'var(--primary)';
                terminal.writeLine(`Success: 选中${device.label}，快捷模式地址固定为0x000000`);
            });
            deviceCards.appendChild(card);
        });
    }
    initDeviceList();

    // 第三步：保留你源码的文件管理逻辑
    function createFileEntry() {
        const entry = document.createElement('div');
        entry.className = 'file-entry';
        entry.innerHTML = `
      <input type="text" class="address-input" value="0x000000" placeholder="Flash地址" ${currentMode === 'quick' ? 'readonly' : ''}>
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

    // 第四步：保留你源码的终端日志逻辑
    const terminal = {
        clean: () => output.value = '',
        write: data => output.value += data,
        writeLine: data => {
            // 日志颜色区分
            let logText = data;
            if (data.includes('Error:')) logText = `\x1b[31m${data}\x1b[0m`;
            else if (data.includes('Success:')) logText = `\x1b[32m${data}\x1b[0m`;
            else if (data.includes('Warning:')) logText = `\x1b[33m${data}\x1b[0m`;

            output.value += logText + '\n';
            output.scrollTop = output.scrollHeight;
        },
    };

    // 第五步：保留你源码的连接设备逻辑
    connect.addEventListener('click', async () => {
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
            // 模式适配：快捷模式显示设备+地址，自定义模式仅显示芯片
            if (currentMode === 'quick' && selectedDevice) {
                board.textContent = `${board.textContent} - 已连接`;
            } else {
                board.textContent = `已连接 - ${chip}`;
            }
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

    // 第六步：保留你源码的擦除Flash逻辑
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

    // 第七步：保留你源码的烧录逻辑（模式适配）
    flash.addEventListener('click', async () => {
        const entries = fileList.querySelectorAll('.file-entry');
        const fileArray = [];

        // 模式校验：快捷模式需选择设备
        if (currentMode === 'quick' && !selectedDevice) {
            terminal.writeLine('Error: 快捷模式请先选择设备型号');
            return;
        }

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
            terminal.writeLine(`Info: ${currentMode === 'quick' ? '快捷模式' : '自定义模式'}开始烧录...`);
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

    // 初始化：默认快捷模式
    switchMode('quick');
    // 初始化日志
    terminal.writeLine('Info: 欢迎使用WebESP固件烧录工具');
    terminal.writeLine('Info: 快捷模式→选设备+0x0地址烧录 | 自定义模式→自由选固件/地址');
});