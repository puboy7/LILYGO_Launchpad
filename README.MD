# ESP32 Web Flasher

基于 Web Serial API 的 ESP32 网页固件烧录工具，设计灵感来源于 [ESP Launchpad](https://espressif.github.io/esp-launchpad/)。

## ✨ 功能特性

- **双模式操作**：一键体验（预置固件）和自定义烧录模式
- **纯网页运行**：无需安装任何软件或驱动，支持 Chrome/Edge 87+ 浏览器
- **Web Serial API**：直接通过浏览器与 ESP32 串口通信
- **预置固件库**：内置多个常用示例固件，一键烧录
- **实时控制台**：完整的烧录过程日志输出
- **响应式设计**：适配桌面和移动设备

## 🚀 快速开始

### 在线使用
1. 访问部署在 GitHub Pages 的页面
2. 使用 **Chrome 或 Edge (版本 87+)** 浏览器
3. 点击"连接设备"按钮，选择你的 ESP32 开发板
4. 选择预置固件或上传自定义固件
5. 点击"开始烧录"

### 本地部署
```bash
# 克隆仓库
git clone https://github.com/yourusername/esp32-web-flasher.git

# 进入目录
cd esp32-web-flasher

# 启动本地服务器 (Python 3)
python -m http.server 8000

# 或使用其他静态服务器
# npx serve .