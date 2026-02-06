import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';
import { deviceList } from './firmware-library.js';

ready(() => {
    // 日志输出
    const output = document.getElementById('output');
    const terminal = {
        clean: () => output.value = '',
        write: data => output.value += data,
        writeLine: data => {
            let logText = data;
            if (data.includes('Error:')) logText = `\x1b[31m${data}\x1b[0m`;
            else if (data.includes('Success:')) logText = `\x1b[32m${data}\x1b[0m`;
            else if (data.includes('Warning:')) logText = `\x1b[33m${data}\x1b[0m`;
            output.value += logText + '\n';
            output.scrollTop = output.scrollHeight;
        },
    };

    // 全局变量
    let quickLoader = null;
    let customLoader = null;
    let eraseLoader = null;
    let selectedDevice = null;
    let currentType = 'quick';

    // ====================== 卡片切换逻辑 ======================
    const selectionCards = document.querySelectorAll('.selection-card');
    const functionCards = document.querySelectorAll('.function-card');

    function activateFunction(type) {
        // 更新选择卡片
        selectionCards.forEach(card => {
            card.classList.toggle('active', card.dataset.type === type);
        });
        // 更新功能区
        functionCards.forEach(card => {
            card.classList.toggle('active', card.id === `${type}-card`);
        });
        // 记录当前类型
        currentType = type;
        // 日志提示
        const typeName = {
            quick: '快捷烧录',
            custom: '自定义烧录',
            erase: '擦除Flash'
        }[type];
        terminal.writeLine(`Info: 已激活【${typeName}】功能`);
    }

    // 绑定卡片点击
    selectionCards.forEach(card => {
        card.addEventListener('click', () => {
            const type = card.dataset.type;
            if (type !== currentType) {
                activateFunction(type);
            }
        });
    });

    // 初始化激活快捷烧录
    activateFunction('quick');

    // ====================== 快捷烧录逻辑 ======================
    const quickBaudrate = document.getElementById('quick-baudrate');
    const quickConnect = document.getElementById('quick-connect');
    const quickBoard = document.getElementById('quick-board');
    const quickStatus = document.getElementById('quick-status');
    const quickFile = document.getElementById('quick-file');
    const quickEraseAll = document.getElementById('quick-erase-all');
    const quickFlash = document.getElementById('quick-flash');
    const quickProgress = document.getElementById('quick-progress');
    const deviceCards = document.getElementById('device-cards');
    const chipInfo = document.getElementById('chip-info');
    const chipName = document.getElementById('chip-name');

    // 初始化设备卡片
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
            quickBoard.textContent = `已选择${device.label}(${device.chip.replace('_', '-')})`;
            quickBoard.style.color = 'var(--primary)';
            terminal.writeLine(`Success: 选中设备${device.label}，地址固定为0x000000`);
        });
        deviceCards.appendChild(card);
    });

    // 快捷连接
    quickConnect.addEventListener('click', async () => {
        try {
            quickConnect.disabled = true;
            quickConnect.textContent = '🔌 正在连接...';
            quickStatus.textContent = '连接中';
            quickStatus.className = 'primary';

            const device = await requestPort();
            const transport = new Transport(device);
            const portInfo = await transport.get_info();
            quickStatus.textContent = portInfo;
            quickStatus.className = 'success';

            quickLoader = new ESPLoader({
                baudrate: +quickBaudrate.value,
                transport,
                terminal
            });
            const chip = await quickLoader.main_fn();
            quickBoard.textContent += ` - 已连接(${chip})`;
            terminal.writeLine(`Success: 快捷模式连接设备成功 - ${chip}`);

            quickConnect.textContent = '🔌 已连接';
            quickConnect.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 快捷模式连接失败 - ${error.message}`);
            quickStatus.textContent = '连接失败';
            quickStatus.className = 'danger';
            quickConnect.textContent = '🔌 连接设备端口';
            quickConnect.disabled = false;
        }
    });

    // 快捷烧录（默认压缩）
    quickFlash.addEventListener('click', async () => {
        if (!selectedDevice) {
            terminal.writeLine('Error: 请先选择设备型号');
            return;
        }
        if (!quickLoader) {
            terminal.writeLine('Error: 请先连接设备端口');
            return;
        }
        if (!quickFile.files[0]) {
            terminal.writeLine('Error: 请选择固件文件');
            return;
        }

        try {
            quickFlash.disabled = true;
            quickFlash.textContent = '⚡ 正在烧录...';
            quickProgress.value = 0;

            const file = quickFile.files[0];
            const data = await readAsBinaryString(file);
            const fileArray = [{ data, address: 0x000000 }];
            terminal.writeLine(`Info: 开始烧录文件 - ${file.name} (地址: 0x000000)`);

            await quickLoader.write_flash({
                fileArray,
                flashSize: "keep",
                eraseAll: quickEraseAll.checked,
                compress: true, // 默认压缩烧录
                reportProgress: (_, written, total) => {
                    const progress = (written / total) * 100;
                    quickProgress.value = progress;
                    terminal.writeLine(`Progress: 烧录中 ${progress.toFixed(2)}%`);
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });

            await quickLoader.hard_reset();
            terminal.writeLine('Success: 快捷模式烧录完成！设备已重启');
            quickProgress.value = 0;
            quickFlash.textContent = '⚡ 一键烧录固件';
            quickFlash.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 快捷模式烧录失败 - ${error.message}`);
            quickProgress.value = 0;
            quickFlash.textContent = '⚡ 一键烧录固件';
            quickFlash.disabled = false;
        }
    });

    // ====================== 自定义烧录逻辑 ======================
    const customBaudrate = document.getElementById('custom-baudrate');
    const customConnect = document.getElementById('custom-connect');
    const customStatus = document.getElementById('custom-status');
    const customFileList = document.getElementById('custom-file-list');
    const customAddFile = document.getElementById('custom-add-file');
    const customEraseAll = document.getElementById('custom-erase-all');
    const customFlash = document.getElementById('custom-flash');
    const customProgress = document.getElementById('custom-progress');

    // 添加文件项
    customAddFile.addEventListener('click', () => {
        const entry = document.createElement('div');
        entry.className = 'file-entry';
        entry.innerHTML = `
      <input type="text" class="address-input" value="0x000000" placeholder="Flash地址">
      <input type="file" class="file-input">
      <button class="remove-file">-</button>
    `;
        entry.querySelector('.remove-file').addEventListener('click', () => {
            if (customFileList.children.length > 1) entry.remove();
        });
        customFileList.appendChild(entry);
    });

    // 自定义连接
    customConnect.addEventListener('click', async () => {
        try {
            customConnect.disabled = true;
            customConnect.textContent = '🔌 正在连接...';
            customStatus.textContent = '连接中';
            customStatus.className = 'primary';

            const device = await requestPort();
            const transport = new Transport(device);
            const portInfo = await transport.get_info();
            customStatus.textContent = portInfo;
            customStatus.className = 'success';

            customLoader = new ESPLoader({
                baudrate: +customBaudrate.value,
                transport,
                terminal
            });
            const chip = await customLoader.main_fn();
            terminal.writeLine(`Success: 自定义模式连接设备成功 - ${chip}`);

            customConnect.textContent = '🔌 已连接';
            customConnect.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 自定义模式连接失败 - ${error.message}`);
            customStatus.textContent = '连接失败';
            customStatus.className = 'danger';
            customConnect.textContent = '🔌 连接设备端口';
            customConnect.disabled = false;
        }
    });

    // 自定义烧录（默认压缩）
    customFlash.addEventListener('click', async () => {
        if (!customLoader) {
            terminal.writeLine('Error: 请先连接设备端口');
            return;
        }

        const fileArray = [];
        const entries = customFileList.querySelectorAll('.file-entry');
        for (const entry of entries) {
            const fileInput = entry.querySelector('.file-input');
            const addressInput = entry.querySelector('.address-input');
            if (!fileInput.files[0]) {
                terminal.writeLine('Error: 请选择所有固件文件');
                return;
            }
            if (!/^0x[0-9A-Fa-f]+$/.test(addressInput.value)) {
                terminal.writeLine(`Error: 地址格式错误 - ${addressInput.value}（需以0x开头的十六进制）`);
                return;
            }
            const data = await readAsBinaryString(fileInput.files[0]);
            fileArray.push({
                data,
                address: parseInt(addressInput.value)
            });
            terminal.writeLine(`Info: 已添加文件 - ${fileInput.files[0].name} (地址: ${addressInput.value})`);
        }

        try {
            customFlash.disabled = true;
            customFlash.textContent = '⚡ 正在烧录...';
            customProgress.value = 0;

            await customLoader.write_flash({
                fileArray,
                flashSize: "keep",
                eraseAll: customEraseAll.checked,
                compress: true, // 默认压缩烧录
                reportProgress: (_, written, total) => {
                    const progress = (written / total) * 100;
                    customProgress.value = progress;
                    terminal.writeLine(`Progress: 烧录中 ${progress.toFixed(2)}%`);
                },
                calculateMD5Hash: image => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)).toString()
            });

            await customLoader.hard_reset();
            terminal.writeLine('Success: 自定义模式烧录完成！设备已重启');
            customProgress.value = 0;
            customFlash.textContent = '⚡ 一键烧录固件';
            customFlash.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 自定义模式烧录失败 - ${error.message}`);
            customProgress.value = 0;
            customFlash.textContent = '⚡ 一键烧录固件';
            customFlash.disabled = false;
        }
    });

    // ====================== 擦除Flash逻辑 ======================
    const eraseBaudrate = document.getElementById('erase-baudrate');
    const eraseConnect = document.getElementById('erase-connect');
    const eraseStatus = document.getElementById('erase-status');
    const eraseFlash = document.getElementById('erase-flash');

    // 擦除连接
    eraseConnect.addEventListener('click', async () => {
        try {
            eraseConnect.disabled = true;
            eraseConnect.textContent = '🔌 正在连接...';
            eraseStatus.textContent = '连接中';
            eraseStatus.className = 'primary';

            const device = await requestPort();
            const transport = new Transport(device);
            const portInfo = await transport.get_info();
            eraseStatus.textContent = portInfo;
            eraseStatus.className = 'success';

            eraseLoader = new ESPLoader({
                baudrate: +eraseBaudrate.value,
                transport,
                terminal
            });
            await eraseLoader.main_fn();
            terminal.writeLine('Success: 擦除模式连接串口成功');

            eraseConnect.textContent = '🔌 已连接';
            eraseConnect.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: 擦除模式连接失败 - ${error.message}`);
            eraseStatus.textContent = '连接失败';
            eraseStatus.className = 'danger';
            eraseConnect.textContent = '🔌 连接串口';
            eraseConnect.disabled = false;
        }
    });

    // 执行擦除
    eraseFlash.addEventListener('click', async () => {
        if (!eraseLoader) {
            terminal.writeLine('Error: 请先连接串口');
            return;
        }

        try {
            eraseFlash.disabled = true;
            eraseFlash.textContent = '🗑️ 擦除中...';
            terminal.writeLine('Info: 开始擦除Flash...（请勿断开设备）');

            await eraseLoader.erase_flash();
            terminal.writeLine('Success: Flash擦除完成！');

            eraseFlash.textContent = '🗑️ 执行擦除Flash';
            eraseFlash.disabled = false;
        } catch (error) {
            terminal.writeLine(`Error: Flash擦除失败 - ${error.message}`);
            eraseFlash.textContent = '🗑️ 执行擦除Flash';
            eraseFlash.disabled = false;
        }
    });

    // 初始化日志
    terminal.writeLine('Info: 欢迎使用WebESP固件烧录工具');
    terminal.writeLine('Info: 功能说明：快捷烧录（设备+0x0）、自定义烧录（自由配置）、擦除Flash（单独擦除）');
    terminal.writeLine('Info: 压缩烧录已默认开启，无需手动设置');
});