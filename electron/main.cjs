// AtlasTv Electron Main Process
// Loads the Render-hosted web app in a native window.
const { app, BrowserWindow, shell } = require('electron')

// Disable D3D11 hardware video decoder — it renders frames on a separate GPU
// overlay plane that Chromium compositor can't see, causing black video with audio.
// Software decode uses the same compositor pipeline so it always displays correctly.
app.commandLine.appendSwitch('disable-features', 'D3D11VideoDecoder,D3D11VideoEncoder,HardwareMediaKeyHandling')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const RENDER_URL = 'https://atlastv.onrender.com'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'AtlasTv',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: false,
      backgroundThrottling: false,
      preload: require('path').join(__dirname, 'preload.cjs'),
    },
  })

  win.setMenuBarVisibility(false)
  win.loadURL(RENDER_URL)

  // Open any external pop-up links in the system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
