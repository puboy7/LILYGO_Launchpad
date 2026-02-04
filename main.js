const connectBtn = document.getElementById('connectBtn');
const downloadBtn = document.getElementById('downloadBtn');
const flashBtn = document.getElementById('flashBtn');
const logEl = document.getElementById('log');
const deviceStatus = document.getElementById('deviceStatus');

let port = null;
let espLoader = null;

// 日志输出
function log(msg) {
  logEl.textContent += msg + '\n';
  logEl.scrollTop = logEl.scrollHeight;
}

/** 连接设备 */
connectBtn.addEventListener('click', async () => {
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    deviceStatus.textContent = '设备已连接';

    log('串口已打开');

    // 初始化 esptool‑js loader
    espLoader = new ESPLoader({ port, baudRate: 115200 });
    await espLoader.connect();
    log('esptool‑js 已就绪');
  } catch (err) {
    log('连接失败: ' + err);
  }
});

/** 下载固件 */
downloadBtn.addEventListener('click', async () => {
  const url = document.getElementById('firmwareUrl').value;
  if (!url) return log('请输入固件 URL');

  try {
    const res = await fetch(url);
    const blob = await res.blob();

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = url.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    log('固件下载完成: ' + a.download);
  } catch (err) {
    log('下载失败: ' + err);
  }
});

/** 烧录固件 */
flashBtn.addEventListener('click', async () => {
  if (!espLoader) return log('请先连接设备');

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.bin';

  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    const bin = new Uint8Array(await file.arrayBuffer());

    log(`开始刷写: ${file.name}`);

    try {
      // 写入 flash
      await espLoader.flash(bin, /* address */ 0x10000);
      log('刷写完成 🎉');
    } catch (err) {
      log('刷写失败: ' + err);
    }
  };
  fileInput.click();
});
