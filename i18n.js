export const i18n = {
    title: { zh: "WebESP 固件一键烧录工具", en: "WebESP Firmware One-Click Burner" },
    quickCardTitle: { zh: "快捷烧录", en: "Quick Burn" },
    quickCardDesc: { zh: "选设备 → 一键连接烧录", en: "Select Device → Connect & Burn" },
    customCardTitle: { zh: "自定义烧录", en: "Custom Burn" },
    customCardDesc: { zh: "自由选固件 → 自定义地址", en: "Custom Firmware + Address" },
    eraseCardTitle: { zh: "擦除Flash", en: "Erase Flash" },
    eraseCardDesc: { zh: "仅擦除设备Flash → 无需固件", en: "Erase Only, No Firmware" },
    quickConfigTitle: { zh: "快捷烧录配置", en: "Quick Burn Config" },
    customConfigTitle: { zh: "自定义烧录配置", en: "Custom Burn Config" },
    eraseConfigTitle: { zh: "擦除Flash配置", en: "Erase Flash Config" },
    selectDeviceLabel: { zh: "点击设备图片选择", en: "Click Device to Select" },
    firmwareAddrLabel: { zh: "固件烧录地址（默认自动匹配设备）", en: "Firmware Address (Auto Match Device)" },
    firmwareListLabel: { zh: "固件文件列表（自定义地址）", en: "Firmware List (Custom Address)" },
    logTitle: { zh: "操作日志", en: "Operation Log" },
    connectBurnBtn: { zh: "🔌 连接并自动烧录", en: "🔌 Connect & Auto Burn" },
    connectPortBtn: { zh: "🔌 连接设备端口", en: "🔌 Connect Port" },
    connectSerialBtn: { zh: "🔌 连接串口", en: "🔌 Connect Serial" },
    addFileBtn: { zh: "+ 添加固件文件", en: "+ Add File" },
    burnBtn: { zh: "⚡ 一键烧录固件", en: "⚡ Burn Firmware" },
    eraseBtn: { zh: "🗑️ 执行擦除Flash", en: "🗑️ Erase Flash" },
    switchLangBtn: { zh: "English", en: "中文" },
    disconnectedText: { zh: "未连接", en: "Disconnected" },
    connectedText: { zh: "已连接", en: "Connected" },
    noDeviceText: { zh: "未选择设备", en: "No Device Selected" },
    activateFunction: { zh: "已激活【{type}】功能", en: "Activated [{type}] function" },
    selectDeviceSuccess: { zh: "选中设备{device}，自动绑定固件：{firmware}，默认地址：{addr}", en: "Selected {device}, auto bind firmware: {firmware}, default address: {addr}" },
    connectBurnStart: { zh: "开始连接端口并自动烧录...", en: "Start connecting port and auto burning..." },
    connectSuccess: { zh: "端口连接成功，开始烧录固件...", en: "Port connected, start burning firmware..." },
    connectFail: { zh: "端口连接失败 - {msg}", en: "Port connect failed - {msg}" },
    burnStart: { zh: "烧录固件：{file}（地址：{addr}），自动擦除+压缩", en: "Burning firmware: {file} (Address: {addr}), Auto Erase + Compress" },
    burnSuccess: { zh: "烧录完成！设备已重启", en: "Burn completed! Device restarted" },
    burnFail: { zh: "烧录失败 - {msg}", en: "Burn failed - {msg}" },
    firmwareLoadFail: { zh: "加载固件{firmware}失败：{msg}，请检查文件路径", en: "Load firmware {firmware} failed: {msg}, check file path" },
    addressFormatError: { zh: "地址格式错误：{addr}（需0x开头十六进制）", en: "Invalid address: {addr} (Hex start with 0x required)" },
    noDeviceError: { zh: "请先选择设备", en: "Please select device first" },
    initLog1: { zh: "欢迎使用WebESP一键烧录工具", en: "Welcome to WebESP One-Click Burner" },
    initLog2: { zh: "快捷烧录：选设备 → 点击连接 → 自动烧录", en: "Quick Burn: Select Device → Click Connect → Auto Burn" },
    initLog3: { zh: "默认配置：波特率115200 | 自动擦除 | 压缩烧录", en: "Default: Baudrate 115200 | Auto Erase | Compressed Burn" }
};

export const typeNameMap = {
    quick: { zh: "快捷烧录", en: "Quick Burn" },
    custom: { zh: "自定义烧录", en: "Custom Burn" },
    erase: { zh: "擦除Flash", en: "Erase Flash" }
};

export const modeNameMap = {
    quick: { zh: "快捷", en: "Quick" },
    custom: { zh: "自定义", en: "Custom" },
    erase: { zh: "擦除", en: "Erase" }
};