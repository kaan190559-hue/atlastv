// AtlasTv Electron Main Process
// Loads the Render-hosted web app in a native window.
const { app, BrowserWindow, shell } = require('electron')

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
      contextIsolation: true,
      // Hardware acceleration settings for stable video rendering
      backgroundThrottling: false,
    },
  })

  win.setMenuBarVisibility(false)
  win.loadURL(RENDER_URL)

  // Fix black screen on player open: invalidate + resize trick forces GPU repaint
  win.webContents.on('did-finish-load', () => {
    // Inject a tiny script that forces repaint whenever fullscreen changes
    win.webContents.executeJavaScript(`
      document.addEventListener('fullscreenchange', () => {
        // Force a reflow/repaint to prevent black frame on fullscreen enter
        document.body.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => { document.body.style.transform = ''; });
      });
    `).catch(() => undefined)
  })

  // When entering fullscreen, nudge the window size to force GPU surface refresh
  win.on('enter-full-screen', () => {
    const [w, h] = win.getSize()
    win.setSize(w + 1, h)
    setTimeout(() => win.setSize(w, h), 50)
  })

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
