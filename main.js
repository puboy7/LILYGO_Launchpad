import { ESPLoader, Transport } from "https://unpkg.com/esptool-js@3.1.0/bundle.js";

let firmwareData = null;

const logEl = document.getElementById("log");
const uploadBox = document.getElementById("uploadBox");
const fileInput = document.getElementById("firmwareFile");
const flashBtn = document.getElementById("flashBtn");

function log(txt) {
    logEl.textContent += txt + "\n";
    logEl.scrollTop = logEl.scrollHeight;
}

// --------------------- 文件上传处理 ---------------------

uploadBox.onclick = () => fileInput.click();
uploadBox.ondragover = e => e.preventDefault();

uploadBox.ondrop = e => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
};

fileInput.onchange = () => {
    const file = fileInput.files[0];
    handleFile(file);
};

function handleFile(file) {
    if (!file || !file.name.endsWith(".bin")) {
        alert("请选择 .bin 固件文件");
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        firmwareData = new Uint8Array(reader.result);
        uploadBox.textContent = "已选择固件：" + file.name;
        flashBtn.disabled = false;
        log("✔ 固件已加载：" + file.name);
    };
    reader.readAsArrayBuffer(file);
}

// --------------------- 烧录逻辑 ---------------------

flashBtn.onclick = async () => {
    if (!firmwareData) return;

    try {
        log("请求串口权限…");
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 115200 });

        log("初始化传输接口…");
        const transport = new Transport(port);

        log("连接 ESP 芯片…");
        const loader = new ESPLoader(transport);

        await loader.main();

        log("✨ 正在烧录…");

        await loader.writeFlash({
            offset: 0x0,
            data: firmwareData,
            compress: true
        });

        log("🎉 烧录成功！设备已重启");

    } catch (err) {
        log("❌ 错误：" + err);
        console.error(err);
    }
};
