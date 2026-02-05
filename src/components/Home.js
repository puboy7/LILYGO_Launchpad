import React from 'react'
import PropTypes from 'prop-types'

import {
    Grid,
    Paper,
    Card,
    CardContent,
    CardActions,
    Button,
    Alert,
    AlertTitle,
    Typography,
    Box,
    Stepper,
    Step,
    StepLabel,
    Chip,
    Divider,
    IconButton,
    Tooltip,
    Fade,
    useTheme
} from '@mui/material'

import SettingsIcon from '@mui/icons-material/Settings'
import DownloadIcon from '@mui/icons-material/Download'
import UsbIcon from '@mui/icons-material/Usb'
import DeviceHubIcon from '@mui/icons-material/DeviceHub'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'

import ChromeIcon from '../icons/Chrome'
import EdgeIcon from '../icons/Edge'
import OperaIcon from '../icons/Opera'

const steps = ['选择设备', '连接端口', '下载程序']

const Home = (props) => {
    const theme = useTheme()
    const [activeStep, setActiveStep] = React.useState(0)
    const [selectedDevice, setSelectedDevice] = React.useState(null)
    const [isConnected, setIsConnected] = React.useState(false)

    const devices = [
        { id: 'esp32', name: 'ESP32 DevKit', icon: '⚡' },
        { id: 'esp8266', name: 'ESP8266 NodeMCU', icon: '🌐' },
        { id: 'arduino', name: 'Arduino Uno', icon: '🖥️' },
    ]

    const ports = [
        { id: 'port1', name: 'COM3', device: 'ESP32' },
        { id: 'port2', name: 'COM5', device: 'Arduino' },
        { id: 'port3', name: 'USB Serial', device: 'USB' },
    ]

    const handleDeviceSelect = (device) => {
        setSelectedDevice(device)
        setActiveStep(1)
    }

    const handleConnect = () => {
        setIsConnected(true)
        setActiveStep(2)
        props.connect?.()
    }

    const handleDownload = () => {
        // 下载逻辑
        alert('开始下载程序...')
    }

    return (
        <Grid
            container
            justifyContent="center"
            alignItems="center"
            sx={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                p: 3
            }}
        >
            <Grid item xs={12} sm={10} md={8} lg={6}>
                <Fade in={true} timeout={800}>
                    <Card
                        elevation={6}
                        sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        {/* 头部 */}
                        <Box
                            sx={{
                                background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                p: 3,
                                textAlign: 'center'
                            }}
                        >
                            <Typography variant="h4" component="h1" gutterBottom>
                                <DownloadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                                设备下载器
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.9 }}>
                                快速连接并下载程序到您的设备
                            </Typography>
                        </Box>

                        <CardContent sx={{ p: 4 }}>
                            {/* 步骤指示器 */}
                            <Stepper
                                activeStep={activeStep}
                                alternativeLabel
                                sx={{ mb: 4 }}
                            >
                                {steps.map((label) => (
                                    <Step key={label}>
                                        <StepLabel>{label}</StepLabel>
                                    </Step>
                                ))}
                            </Stepper>

                            {props.supported() ? (
                                <Box>
                                    {/* 设备选择 */}
                                    <Box sx={{ mb: 4 }}>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <DeviceHubIcon sx={{ mr: 1 }} />
                                            选择设备类型
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {devices.map((device) => (
                                                <Grid item xs={12} sm={4} key={device.id}>
                                                    <Paper
                                                        elevation={selectedDevice?.id === device.id ? 4 : 1}
                                                        onClick={() => handleDeviceSelect(device)}
                                                        sx={{
                                                            p: 3,
                                                            textAlign: 'center',
                                                            cursor: 'pointer',
                                                            borderRadius: 2,
                                                            transition: 'all 0.3s',
                                                            border: selectedDevice?.id === device.id ?
                                                                `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
                                                            '&:hover': {
                                                                transform: 'translateY(-4px)',
                                                                boxShadow: 6
                                                            }
                                                        }}
                                                    >
                                                        <Typography variant="h3" sx={{ mb: 1 }}>
                                                            {device.icon}
                                                        </Typography>
                                                        <Typography variant="subtitle1">
                                                            {device.name}
                                                        </Typography>
                                                    </Paper>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>

                                    {/* 端口连接 */}
                                    <Box sx={{ mb: 4 }}>
                                        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                                            <UsbIcon sx={{ mr: 1 }} />
                                            连接端口
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {ports.map((port) => (
                                                <Grid item xs={12} sm={6} md={4} key={port.id}>
                                                    <Chip
                                                        label={`${port.name} (${port.device})`}
                                                        onClick={handleConnect}
                                                        variant={isConnected ? "filled" : "outlined"}
                                                        color="primary"
                                                        icon={<UsbIcon />}
                                                        sx={{
                                                            width: '100%',
                                                            py: 2,
                                                            fontSize: '1rem',
                                                            borderRadius: 2
                                                        }}
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>

                                    {/* 操作按钮 */}
                                    <Grid container spacing={2} justifyContent="center">
                                        <Grid item>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                startIcon={<DownloadIcon />}
                                                onClick={handleDownload}
                                                disabled={!isConnected || !selectedDevice}
                                                sx={{
                                                    borderRadius: 3,
                                                    px: 4,
                                                    py: 1.5,
                                                    fontSize: '1.1rem',
                                                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)'
                                                }}
                                            >
                                                开始下载
                                            </Button>
                                        </Grid>
                                        <Grid item>
                                            <Tooltip title="设置">
                                                <IconButton
                                                    onClick={props.openSettings}
                                                    size="large"
                                                    sx={{
                                                        border: '2px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 2
                                                    }}
                                                >
                                                    <SettingsIcon />
                                                </IconButton>
                                            </Tooltip>
                                        </Grid>
                                    </Grid>

                                    {/* 使用指南 */}
                                    <Alert
                                        severity="info"
                                        icon={<InfoIcon />}
                                        sx={{
                                            mt: 4,
                                            borderRadius: 2,
                                            background: 'rgba(33, 150, 243, 0.1)'
                                        }}
                                    >
                                        <AlertTitle>使用说明</AlertTitle>
                                        <ol style={{ margin: 0, paddingLeft: '20px' }}>
                                            <li>选择您的设备类型</li>
                                            <li>连接设备端口</li>
                                            <li>上传您的 .bin 文件并设置地址</li>
                                            <li>点击下载按钮开始烧录程序</li>
                                        </ol>
                                    </Alert>
                                </Box>
                            ) : (
                                // 浏览器不支持提示
                                <Alert
                                    severity="warning"
                                    sx={{
                                        borderRadius: 2,
                                        background: 'rgba(255, 193, 7, 0.1)'
                                    }}
                                >
                                    <AlertTitle>您的浏览器不支持 Web Serial</AlertTitle>
                                    <Typography variant="body2" gutterBottom>
                                        请使用以下支持的浏览器：
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 2, mt: 1, mb: 2 }}>
                                        <Button
                                            variant="outlined"
                                            startIcon={<ChromeIcon />}
                                            href="https://www.google.com/chrome/"
                                            target="_blank"
                                        >
                                            Chrome
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<EdgeIcon />}
                                            href="https://www.microsoft.com/en-us/edge"
                                            target="_blank"
                                        >
                                            Edge
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            startIcon={<OperaIcon />}
                                            href="https://www.opera.com/"
                                            target="_blank"
                                        >
                                            Opera
                                        </Button>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary">
                                        <small>iOS 和 Android 浏览器暂不支持此功能</small>
                                    </Typography>
                                    <Box sx={{ mt: 2 }}>
                                        <Button
                                            variant="text"
                                            size="small"
                                            href="https://developer.mozilla.org/en-US/docs/Web/API/Serial#browser_compatibility"
                                            target="_blank"
                                        >
                                            了解更多浏览器兼容性信息
                                        </Button>
                                    </Box>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </Fade>
            </Grid>
        </Grid>
    )
}

Home.propTypes = {
    connect: PropTypes.func,
    supported: PropTypes.func,
    openSettings: PropTypes.func,
}

export default Home