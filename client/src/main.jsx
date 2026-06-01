import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import './index.css'
import store from './store/index.js'
import AuthBootstrap from './components/AuthBootstrap.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <AuthBootstrap />
    </Provider>
  </StrictMode>,
)
