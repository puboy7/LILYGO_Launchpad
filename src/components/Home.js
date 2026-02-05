import React from 'react'
import PropTypes from 'prop-types'

import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
import { styled } from '@mui/material/styles'

import ChromeIcon from '../icons/Chrome'
import EdgeIcon from '../icons/Edge'
import OperaIcon from '../icons/Opera' // 保留导入，后续会正常使用
import SettingsIcon from '@mui/icons-material/Settings'

// 定制明亮风格的设置按钮
const StyledSettingsButton = styled(Button)(({ theme }) => ({
    color: theme.palette.grey[600],
    '&:hover': {
        color: theme.palette.primary.main,
        backgroundColor: theme.palette.action.hover,
    },
}))

const Home = (props) => {
    return (
        <Grid
            container
            spacing={4}
            direction='column'
            alignItems='center'
            justifyContent='center'
            sx={{
                minHeight: '70vh',
                py: 6,
                px: 2,
            }}
        >
            {/* 响应式栅格，适配所有屏幕 */}
            <Grid item xs={12} sm={8} md={6} lg={4}>
                {props.supported() ? (
                    <Grid
                        container
                        direction='column'
                        alignItems='center'
                        spacing={3}
                        sx={{
                            width: '100%',
                            p: 4,
                            borderRadius: 2,
                            boxShadow: 1,
                            backgroundColor: 'background.paper',
                        }}
                    >
                        <Grid item>
                            <Button
                                variant='contained'
                                color='primary'
                                size='large'
                                onClick={props.connect}
                                sx={{
                                    px: 6,
                                    py: 1.2,
                                    borderRadius: 1,
                                    boxShadow: 2,
                                    '&:hover': {
                                        boxShadow: 4,
                                    },
                                }}
                            >
                                Connect
                            </Button>
                        </Grid>

                        <Grid item>
                            <StyledSettingsButton
                                size='large'
                                onClick={props.openSettings}
                                startIcon={<SettingsIcon fontSize='large' />}
                            />
                        </Grid>

                        <Grid item sx={{ width: '100%' }}>
                            <Alert
                                severity='info'
                                sx={{
                                    backgroundColor: 'rgba(232, 244, 255, 0.8)',
                                    color: 'text.primary',
                                    borderRadius: 1.5,
                                    border: '1px solid rgba(59, 130, 246, 0.2)',
                                    lineHeight: 1.8,
                                    fontSize: '0.95rem',
                                }}
                            >
                                1. Click on Connect<br />
                                2. Plug in your ESP & select the port<br />
                                3. Add your .bin & set the address<br />
                                4. Click Program to flash it 😊
                            </Alert>
                        </Grid>
                    </Grid>
                ) : (
                    <Alert
                        severity='warning'
                        sx={{
                            width: '100%',
                            borderRadius: 1.5,
                            backgroundColor: 'rgba(255, 249, 232, 0.8)',
                            border: '1px solid rgba(234, 179, 8, 0.2)',
                            color: 'text.primary',
                            lineHeight: 1.8,
                            a: {
                                color: 'primary.main',
                                textDecoration: 'none',
                                '&:hover': {
                                    textDecoration: 'underline',
                                },
                            },
                            '& svg': {
                                color: 'primary.main',
                            },
                        }}
                    >
                        <AlertTitle sx={{ fontWeight: 600, color: 'text.primary' }}>
                            Your browser doesn&apos;t support Web Serial 😭
                        </AlertTitle>
                        Try using&nbsp;
                        <a href='https://www.google.com/chrome/' target='_blank' rel='noopener noreferrer'>
                            <ChromeIcon fontSize='inherit' /> <b>Chrome</b>
                        </a>
                        ,&nbsp;
                        <a href='https://www.microsoft.com/en-us/edge' target='_blank' rel='noopener noreferrer'>
                            <EdgeIcon fontSize='inherit' /> <b>Edge</b>
                        </a>
                        , or&nbsp;
                        {/* 【核心修改1】这里把EdgeIcon改成了OperaIcon，解决未使用警告 */}
                        <a href='https://www.opera.com/' target='_blank' rel='noopener noreferrer'>
                            <OperaIcon fontSize='inherit' /> <b>Opera</b>
                        </a>
                        <br />
                        {/* 【核心修改2】移除了多余的数字1，修正笔误 */}
                        (iOS & Android browsers are not supported)
                        <br />
                        <br />
                        Learn more about&nbsp;
                        <a
                            href='https://developer.mozilla.org/en-US/docs/Web/API/Serial#browser_compatibility'
                            target='_blank'
                            rel='noopener noreferrer'
                        >
                            browser compatibility
                        </a>
                    </Alert>
                )}
            </Grid>
        </Grid>
    )
}

Home.propTypes = {
    connect: PropTypes.func.isRequired,
    supported: PropTypes.func.isRequired,
    openSettings: PropTypes.func.isRequired,
}

export default Home