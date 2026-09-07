import { render } from 'preact'
import { App } from './app'
import { registerSW } from 'virtual:pwa-register'
import './styles.css'

render(<App />, document.getElementById('app')!)

// PWA Service Worker（离线缓存，静默更新）
registerSW({ immediate: true })