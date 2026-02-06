// 双语配置：key为统一标识，value为中/英文文本
export const i18n = {
    // 页面标题
    title: {
        zh: "WebESP 固件一键烧录工具",
        en: "WebESP Firmware One-Click Burner"
    },
    // 选择卡片
    quickCardTitle: { zh: "快捷烧录", en: "Quick Burn" },
    quickCardDesc: { zh: "选设备 → 一键烧录", en: "Select Device → One-Click Burn" },
    customCardTitle: { zh: "自定义烧录", en: "Custom Burn" },
    customCardDesc: { zh: "自由选固件 → 自定义地址", en: "Select Firmware → Custom Address" },
    eraseCardTitle: { zh: "擦除Flash", en: "Erase Flash" },
    eraseCardDesc: { zh: "仅擦除设备Flash → 无需固件", en: "Erase Device Flash → No Firmware Needed" },
    // 功能区标题
    quickConfigTitle: { zh: "快捷烧录配置", en: "Quick Burn Configuration" },
    customConfigTitle: { zh: "自定义烧录配置", en: "Custom Burn Configuration" },
    eraseConfigTitle: { zh: "擦除Flash配置", en: "Erase Flash Configuration" },
    // 标签文字
    selectDeviceLabel: { zh: "点击设备图片选择", en: "Click Device Image to Select" },
    selectFirmwareLabel: { zh: "选择固件文件（地址固定0x0）", en: "Select Firmware File (Address: 0x000000)" },
    firmwareListLabel: { zh: "固件文件列表（自定义地址）", en: "Firmware File List (Custom Address)" },
    portStatusLabel: { zh: "端口状态：", en: "Port Status:" },
    deviceStatusLabel: { zh: "设备状态：", en: "Device Status:" },
    logTitle: { zh: "操作日志", en: "Operation Log" },
    // 按钮文字
    connectPortBtn: { zh: "🔌 连接设备端口", en: "🔌 Connect Device Port" },
    connectSerialBtn: { zh: "🔌 连接串口", en: "🔌 Connect Serial Port" },
    addFileBtn: { zh: "+ 添加固件文件", en: "+ Add Firmware File" },
    burnBtn: { zh: "⚡ 一键烧录固件", en: "⚡ One-Click Burn Firmware" },
    eraseBtn: { zh: "🗑️ 执行擦除Flash", en: "🗑️ Execute Erase Flash" },
    switchLangBtn: { zh: "English", en: "中文" },
    // 日志提示
    activateFunction: {
        zh: "Info: 已激活【{type}】功能",
        en: "Info: Activated [{type}] function"
    },
    selectDeviceSuccess: {
        zh: "Success: 选中设备{device}，地址固定为0x000000",
        en: "Success: Selected device {device}, fixed address 0x000000"
    },
    connectSuccess: {
        zh: "Success: {mode}模式连接设备成功 - {chip}（波特率：{baudrate}）",
        en: "Success: {mode} mode connected to device - {chip} (Baudrate: {baudrate})"
    },
    connectFail: {
        zh: "Error: {mode}模式连接失败 - {msg}",
        en: "Error: {mode} mode connection failed - {msg}"
    },
    burnStart: {
        zh: "Info: 开始烧录文件 - {file} (地址: {addr})，自动擦除全部Flash+压缩烧录",
        en: "Info: Start burning file - {file} (Address: {addr}), auto erase all Flash + compressed burn"
    },
    customBurnStart: {
        zh: "Info: 开始自定义烧录，自动擦除全部Flash+压缩烧录",
        en: "Info: Start custom burning, auto erase all Flash + compressed burn"
    },
    burnSuccess: {
        zh: "Success: {mode}模式烧录完成！设备已重启",
        en: "Success: {mode} mode burning completed! Device restarted"
    },
    burnFail: {
        zh: "Error: {mode}模式烧录失败 - {msg}",
        en: "Error: {mode} mode burning failed - {msg}"
    },
    eraseStart: {
        zh: "Info: 开始擦除Flash...（请勿断开设备）",
        en: "Info: Starting to erase Flash... (Do not disconnect device)"
    },
    eraseSuccess: {
        zh: "Success: Flash擦除完成！",
        en: "Success: Flash erase completed!"
    },
    eraseFail: {
        zh: "Error: Flash擦除失败 - {msg}",
        en: "Error: Flash erase failed - {msg}"
    },
    noDeviceError: {
        zh: "Error: 请先选择设备型号",
        en: "Error: Please select device model first"
    },
    noConnectionError: {
        zh: "Error: 请先连接设备端口",
        en: "Error: Please connect to device port first"
    },
    noFileError: {
        zh: "Error: 请选择固件文件",
        en: "Error: Please select firmware file"
    },
    allFileError: {
        zh: "Error: 请选择所有固件文件",
        en: "Error: Please select all firmware files"
    },
    addressFormatError: {
        zh: "Error: 地址格式错误 - {addr}（需以0x开头的十六进制）",
        en: "Error: Invalid address format - {addr} (Hexadecimal starting with 0x required)"
    },
    initLog1: {
        zh: "Info: 欢迎使用WebESP固件烧录工具",
        en: "Info: Welcome to WebESP Firmware Burner"
    },
    initLog2: {
        zh: "Info: 功能说明：快捷烧录（设备+0x0）、自定义烧录（自由配置）、擦除Flash（单独擦除）",
        en: "Info: Features: Quick Burn (Device+0x0), Custom Burn (Free Config), Erase Flash (Standalone Erase)"
    },
    initLog3: {
        zh: "Info: 波特率默认115200 | 压缩烧录已开启 | 烧录前自动擦除全部Flash",
        en: "Info: Default baudrate 115200 | Compressed burn enabled | Auto erase all Flash before burning"
    }
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