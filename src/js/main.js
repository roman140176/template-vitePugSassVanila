import '../styles/main.scss'
import 'virtual:svg-icons-register'
import { test } from './test'
// Поддержка HMR
if (import.meta.hot) {
  import.meta.hot.accept()
}
test()
