import React from 'react'
import PropTypes from 'prop-types'

// 移除重复导入的 Box（直接用 Grid 替代，MUI Grid 已具备布局能力）
import Grid from '@mui/material/Grid'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import AlertTitle from '@mui/material/AlertTitle'
// 引入 MUI 主题定制工具（用于局部样式优化）
import { styled } from '@mui/material/styles'

import ChromeIcon from '../icons/Chrome'
import EdgeIcon from '../icons/Edge'
import OperaIcon from '../icons/Opera'
import SettingsIcon from '@mui/icons-material/Settings'

// 定制明亮风格的设置按钮（统一配色和交互）
const StyledSettingsButton = styled(Button)(({ theme }) => ({
  color: theme.palette.grey[600], // 浅灰色图标，适配明亮风格
  '&:hover': {
    color: theme.palette.primary.main, // 悬浮时变主色，增加交互反馈
    backgroundColor: theme.palette.action.hover, // 轻量悬浮背景，不突兀
  },
}))

const Home = (props) => {
  return (
    <Grid
      container
      spacing={4} // 增大间距，让布局更宽松，提升明亮感
      direction='column'
      alignItems='center'
      justifyContent='center'
      sx={{
        minHeight: '70vh', // 适度最小高度，避免内容挤在一起
        py: 6, // 上下内边距，让内容和页面边缘有距离
        px: 2, // 左右内边距，适配移动端
      }}
    >
      <Grid item xs={12} sm={8} md={6} lg={4}>
        {/* 移除 xs={3} 限制，适配多屏幕，小屏占满、大屏适中，避免内容压缩 */}
        {props.supported() ? (
          <Grid
            container
            direction='column'
            alignItems='center'
            spacing={3} // 内部元素间距，保持布局宽松
            sx={{
              width: '100%',
              p: 4, // 内边距，让内容和容器边缘有呼吸感
              borderRadius: 2, // 圆角，弱化硬朗感，适配明亮风格
              boxShadow: 1, // 轻量阴影，增加层次感但不厚重
              backgroundColor: 'background.paper', // 纯白背景，强化明亮基础
            }}
          >
            <Grid item>
              <Button
                variant='contained'
                color='primary' // 主色按钮（替代success），更符合明亮清新的视觉调性
                size='large'
                onClick={props.connect}
                sx={{
                  px: 6, // 增大左右内边距，按钮更饱满
                  py: 1.2, // 适度上下内边距
                  borderRadius: 1, // 轻微圆角，按钮更柔和
                  boxShadow: 2, // 轻量阴影，让按钮有轻微悬浮感
                  '&:hover': {
                    boxShadow: 4, // 悬浮时阴影稍大，增强交互
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
                startIcon={<SettingsIcon fontSize='large' />} // 图标前置，视觉更协调
              />
            </Grid>

            <Grid item sx={{ width: '100%' }}>
              <Alert
                severity='info'
                sx={{
                  backgroundColor: 'rgba(232, 244, 255, 0.8)', // 浅蓝透明背景，明亮不刺眼
                  color: 'text.primary', // 主色文字，保证可读性
                  borderRadius: 1.5, // 圆角，和整体风格统一
                  border: '1px solid rgba(59, 130, 246, 0.2)', // 轻量边框，增加层次感
                  lineHeight: 1.8, // 行高，让文字排版更宽松
                  fontSize: '0.95rem', // 适度字号，保证阅读体验
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
              borderRadius: 1.5, // 统一圆角风格
              backgroundColor: 'rgba(255, 249, 232, 0.8)', // 浅黄透明背景，明亮不刺眼
              border: '1px solid rgba(234, 179, 8, 0.2)', // 轻量边框，替代厚重底色
              color: 'text.primary', // 主色文字，提升可读性
              lineHeight: 1.8, // 宽松行高
              a: {
                color: 'primary.main', // 链接改主色，适配明亮风格，统一视觉
                textDecoration: 'none', // 移除默认下划线，更简洁
                '&:hover': {
                  textDecoration: 'underline', // 悬浮下划线，增加交互提示
                },
              },
              '& svg': {
                color: 'primary.main', // 浏览器图标改主色，和链接统一，更协调
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
            <a href='https://www.opera.com/' target='_blank' rel='noopener noreferrer'>
              <EdgeIcon fontSize='inherit' /> <b>Opera</b>
            </a>
            <br />
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
  connect: PropTypes.func.isRequired, // 标记为必传，提升组件健壮性
  supported: PropTypes.func.isRequired,
  openSettings: PropTypes.func.isRequired,
}

export default Home