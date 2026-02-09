// 双语配置：LILYGO品牌版
export const i18n = {
    // 页面标题
    title: { zh: "LILYGO ESP32 固件在线烧录工具", en: "LILYGO ESP32 Firmware Online Burner" },
    // 功能选择卡片
    quickCardTitle: { zh: "快捷烧录", en: "Quick Burn" },
    quickCardDesc: { zh: "选设备 → 选版本 → 连端口 → 烧固件", en: "Select Dev → Ver → Connect → Burn" },
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
    firmwareVersionLabel: { zh: "选择固件版本", en: "Select Firmware Version" },
    firmwareAddrLabel: { zh: "固件烧录地址", en: "Firmware Burn Address" },
    firmwareListLabel: { zh: "固件文件列表（自定义地址）", en: "Firmware List (Custom Address)" },
    logTitle: { zh: "操作日志", en: "Operation Log" },
    // 按钮文字
    connectPortBtn: { zh: "🔌 连接设备端口", en: "🔌 Connect Device Port" },
    connectSerialBtn: { zh: "🔌 连接串口", en: "🔌 Connect Serial Port" },
    addFileBtn: { zh: "+ 添加固件文件", en: "+ Add Firmware File" },
    burnBtn: { zh: "⚡ 烧录固件", en: "⚡ Burn Firmware" },
    eraseBtn: { zh: "🗑️ 执行擦除Flash", en: "🗑️ Erase Flash" },
    switchLangBtn: { zh: "English", en: "中文" },
    // 状态文字
    disconnectedText: { zh: "未连接", en: "Disconnected" },
    connectedText: { zh: "已连接", en: "Connected" },
    noDeviceText: { zh: "未选择设备", en: "No Device Selected" },
    // 日志提示
    activateFunction: { zh: "已激活【{type}】功能", en: "Activated [{type}] Function" },
    loadFirmwareVersionSuccess: { zh: "加载{device}的固件版本：{versions}", en: "Load {device} firmware versions: {versions}" },
    selectDeviceSuccess: { zh: "选中LILYGO {device}，默认烧录地址：{addr}", en: "Selected LILYGO {device}, Default Burn Address: {addr}" },
    firmwareLoadFail: { zh: "加载固件{firmware}失败：{msg}", en: "Load Firmware {firmware} Failed: {msg}" },
    connectSuccess: { zh: "设备端口连接成功", en: "Device Port Connected Successfully" },
    connectFail: { zh: "设备端口连接失败 - {msg}", en: "Device Port Connect Failed - {msg}" },
    burnStart: { zh: "开始烧录固件：{file}（地址：{addr}），自动擦除+压缩烧录", en: "Start Burning Firmware: {file} (Address: {addr}), Auto Erase + Compress" },
    burnSuccess: { zh: "固件烧录完成！设备已自动重启", en: "Firmware Burn Completed! Device Restarted Automatically" },
    burnFail: { zh: "固件烧录失败 - {msg}", en: "Firmware Burn Failed - {msg}" },
    eraseStart: { zh: "开始擦除Flash...（请勿断开设备）", en: "Start Erasing Flash... (Do Not Disconnect)" },
    eraseSuccess: { zh: "Flash擦除完成！", en: "Flash Erase Completed!" },
    eraseFail: { zh: "Flash擦除失败 - {msg}", en: "Flash Erase Failed - {msg}" },
    noDeviceError: { zh: "请先选择LILYGO设备型号", en: "Please Select LILYGO Device Model First" },
    selectFirmwareVersionFirst: { zh: "请先选择固件版本", en: "Please Select Firmware Version First" },
    noConnectionError: { zh: "设备端口未连接，请先点击【连接设备端口】", en: "Device Port Not Connected, Please Click [Connect Device Port] First" },
    addressFormatError: { zh: "地址格式错误：{addr}（需以0x开头的十六进制数）", en: "Invalid Address Format: {addr} (Must be Hex Starting with 0x)" },
    noFileError: { zh: "请选择固件文件", en: "Please Select Firmware File" },
    allFileError: { zh: "请选择所有固件文件", en: "Please Select All Firmware Files" },
    initLog1: { zh: "欢迎使用LILYGO ESP32固件在线烧录工具", en: "Welcome to LILYGO ESP32 Firmware Online Burner" },
    initLog2: { zh: "快捷烧录流程：选设备 → 选版本 → 连接端口 → 点击烧录", en: "Quick Burn Process: Select Dev → Ver → Connect Port → Click Burn" },
    initLog3: { zh: "默认配置：波特率115200 | 自动擦除Flash | 压缩烧录", en: "Default Config: Baudrate 115200 | Auto Erase Flash | Compressed Burn" }
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