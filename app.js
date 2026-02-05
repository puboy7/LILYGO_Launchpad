import { ready } from 'https://lsong.org/scripts/dom.js';
import { readAsBinaryString } from 'https://lsong.org/scripts/file.js';
import { requestPort } from 'https://lsong.org/scripts/serialport.js';
import { ESPLoader, Transport } from './esptool.min.js';

ready(() => {
    const connect = document.getElementById('connect');
    const baudrate = document.getElementById('baudrate');
    const flash = document.getElementById('flash');
    const erase = document.getElementById('erase');
    const output = document.getElementById('output');
    const status = document.getElementById('status');
    const board = document.getElementById('device');
    const progressBar = document.querySelector('progress-bar');
    const fileList = document.getElementById('file-list');
    const addFileButton = document.getElementById('add-file');
    const eraseAllCheckbox = document.getElementById('erase-all');
    const compressCheckbox = document.getElementById('compress');

    // 文件管理
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

    // 终端日志
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

    let loader;

    // 连接设备
    connect.addEventListener('click', async () => {
        try {
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
        } catch (error) {
            terminal.writeLine(`Error: 连接失败 - ${error.message}`);
            status.textContent = '连接失败';
            status.style.color = 'var(--danger)';
        }
    });

    // 擦除Flash
    erase.addEventListener('click', async () => {
        if (!loader) {
            terminal.writeLine('Error: 请先连接设备');
            return;
        }
        try {
            terminal.writeLine('Info: 开始擦除Flash...');
            await loader.erase_flash();
            terminal.writeLine('Success: Flash擦除完成');
        } catch (error) {
            terminal.writeLine(`Error: 擦除失败 - ${error.message}`);
        }
    });

    // 烧录文件
    flash.addEventListener('click', async () => {
        const entries = fileList.querySelectorAll('.file-entry');
        const fileArray = [];

        for (const entry of entries) {
            const fileInput = entry.querySelector('.file-input');
            const addressInput = entry.querySelector('.address-input');

            const file = fileInput.files[0];
            if (!file) {
                terminal.writeLine('Error: 请选择所有文件');
                return;
            }

            // 验证文件类型（支持bin/elf/hex）
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
            terminal.writeLine('Info: 开始烧录...');
            await loader.write_flash(flashOptions);
            await loader.hard_reset();
            terminal.writeLine('Success: 烧录完成！设备已重启');
            progressBar.value = 0;
        } catch (error) {
            terminal.writeLine(`Error: 烧录失败 - ${error.message}`);
            progressBar.value = 0;
        }
    });
});