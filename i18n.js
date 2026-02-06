// 双语配置：key为统一标识，value为中/英文文本
export const i18n = {
    // 页面标题
    title: { zh: "WebESP 固件一键烧录工具", en: "WebESP Firmware One-Click Burner" },
    // 选择卡片
    quickCardTitle: { zh: "快捷烧录", en: "Quick Burn" },
    quickCardDesc: { zh: "选设备 → 一键烧录", en: "Select Device → One-Click Burn" },
    customCardTitle: { zh: "自定义烧录", en: "Custom Burn" },
    customCardDesc: { zh: "自由选固件 → 自定义地址", en: "Custom Firmware + Address" },
    eraseCardTitle: { zh: "擦除Flash", en: "Erase Flash" },
    eraseCardDesc: { zh: "仅擦除设备Flash → 无需固件", en: "Erase Only, No Firmware" },
    // 功能区标题
    quickConfigTitle: { zh: "快捷烧录配置", en: "Quick Burn Config" },
    customConfigTitle: { zh: "自定义烧录配置", en: "Custom Burn Config" },
    eraseConfigTitle: { zh: "擦除Flash配置", en: "Erase Flash Config" },
    // 标签文字
    selectDeviceLabel: { zh: "点击设备图片选择", en: "Click Device to Select" },
    selectFirmwareLabel: { zh: "选择固件文件（地址固定0x0）", en: "Select Firmware (0x0 fixed)" },
    firmwareListLabel: { zh: "固件文件列表（自定义地址）", en: "Firmware List (Custom Address)" },
    logTitle: { zh: "操作日志", en: "Operation Log" },
    // 按钮文字
    connectPortBtn: { zh: "🔌 连接设备端口", en: "🔌 Connect Port" },
    connectSerialBtn: { zh: "🔌 连接串口", en: "🔌 Connect Serial" },
    addFileBtn: { zh: "+ 添加固件文件", en: "+ Add File" },
    burnBtn: { zh: "⚡ 一键烧录固件", en: "⚡ Burn Firmware" },
    eraseBtn: { zh: "🗑️ 执行擦除Flash", en: "🗑️ Erase Flash" },
    switchLangBtn: { zh: "English", en: "中文" },
    // 状态文字（新增）
    disconnectedText: { zh: "未连接", en: "Disconnected" },
    connectedText: { zh: "已连接", en: "Connected" },
    noDeviceText: { zh: "未选择设备", en: "No Device Selected" },
    // 日志提示
    activateFunction: { zh: "已激活【{type}】功能", en: "Activated [{type}] function" },
    selectDeviceSuccess: { zh: "选中设备{device}，地址固定为0x000000", en: "Selected device {device}, fixed address 0x000000" },
    connectSuccess: { zh: "{mode}模式连接成功 - {chip}（波特率：{baudrate}）", en: "{mode} mode connected - {chip} (Baudrate: {baudrate})" },
    connectFail: { zh: "{mode}模式连接失败 - {msg}", en: "{mode} mode connect failed - {msg}" },
    addFileInfo: { zh: "已添加文件 - {file} (地址: {addr})", en: "Added file - {file} (Address: {addr})" },
    burnStart: { zh: "开始烧录文件 - {file} (地址: {addr})，自动擦除+压缩烧录", en: "Start burning - {file} (Address: {addr}), Auto Erase + Compress" },
    customBurnStart: { zh: "开始自定义烧录，自动擦除+压缩烧录", en: "Start custom burning, Auto Erase + Compress" },
    burnSuccess: { zh: "{mode}模式烧录完成！设备已重启", en: "{mode} burn completed! Device restarted" },
    burnFail: { zh: "{mode}模式烧录失败 - {msg}", en: "{mode} burn failed - {msg}" },
    eraseStart: { zh: "开始擦除Flash...（请勿断开设备）", en: "Start erasing Flash... (Do not disconnect)" },
    eraseSuccess: { zh: "Flash擦除完成！", en: "Flash erase completed!" },
    eraseFail: { zh: "Flash擦除失败 - {msg}", en: "Flash erase failed - {msg}" },
    noDeviceError: { zh: "请先选择设备型号", en: "Please select device model first" },
    noConnectionError: { zh: "请先连接设备端口", en: "Please connect to device port first" },
    noFileError: { zh: "请选择固件文件", en: "Please select firmware file" },
    allFileError: { zh: "请选择所有固件文件", en: "Please select all firmware files" },
    addressFormatError: { zh: "地址格式错误 - {addr}（需以0x开头的十六进制）", en: "Invalid address - {addr} (Hex start with 0x required)" },
    initLog1: { zh: "欢迎使用WebESP固件烧录工具", en: "Welcome to WebESP Firmware Burner" },
    initLog2: { zh: "功能：快捷烧录/自定义烧录/擦除Flash", en: "Features: Quick Burn / Custom Burn / Erase Flash" },
    initLog3: { zh: "默认配置：波特率115200 | 自动擦除 | 压缩烧录", en: "Default: Baudrate 115200 | Auto Erase | Compressed Burn" }
};

// 功能类型名称映射（用于日志）
export const typeNameMap = {
    quick: { zh: "快捷烧录", en: "Quick Burn" },
    custom: { zh: "自定义烧录", en: "Custom Burn" },
    erase: { zh: "擦除Flash", en: "Erase Flash" }
};

// 模式名称映射（用于日志）
export const modeNameMap = {
    quick: { zh: "快捷", en: "Quick" },
    custom: { zh: "自定义", en: "Custom" },
    erase: { zh: "擦除", en: "Erase" }
};