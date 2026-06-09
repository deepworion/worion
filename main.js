const { app, BrowserWindow, shell, Menu, MenuItem } = require('electron')
const fs = require('fs')
const path = require('path')
const { createWorionApiServer } = require('./worion-api/server')
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true })

const ELECTRON_DATA_DIR = path.join(__dirname, 'data', 'electron')
const ELECTRON_CACHE_DIR = path.join(ELECTRON_DATA_DIR, 'cache')
const ELECTRON_SESSION_DIR = path.join(ELECTRON_DATA_DIR, 'session')
const ELECTRON_RUN_CACHE_DIR = path.join(ELECTRON_CACHE_DIR, String(process.pid))
const ELECTRON_RUN_SESSION_DIR = path.join(ELECTRON_SESSION_DIR, String(process.pid))
const worionApi = createWorionApiServer()

fs.mkdirSync(ELECTRON_RUN_CACHE_DIR, { recursive: true })
fs.mkdirSync(ELECTRON_RUN_SESSION_DIR, { recursive: true })

app.disableHardwareAcceleration()
app.setPath('userData', ELECTRON_DATA_DIR)
app.setPath('sessionData', ELECTRON_RUN_SESSION_DIR)
app.commandLine.appendSwitch('disk-cache-dir', ELECTRON_RUN_CACHE_DIR)
app.commandLine.appendSwitch('disable-http-cache')
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('disable-gpu-rasterization')
app.commandLine.appendSwitch('disable-accelerated-2d-canvas')
app.commandLine.appendSwitch('disable-gpu-sandbox')
app.commandLine.appendSwitch('in-process-gpu')

function canUseEditFlag(params, flagName) {
  return params?.editFlags?.[flagName] !== false
}

function appendMenuItem(menu, template) {
  if (!menu || !template || typeof template !== 'object') return
  menu.append(new MenuItem(template))
}

function buildSpellcheckMenu(params = {}, webContents) {
  const menu = new Menu()
  const suggestions = Array.isArray(params.dictionarySuggestions)
    ? params.dictionarySuggestions
        .filter(suggestion => typeof suggestion === 'string' && suggestion.trim().length > 0)
        .map(suggestion => suggestion.trim())
        .slice(0, 5)
    : []

  if (params.isEditable && params.misspelledWord && suggestions.length > 0) {
    for (const suggestion of suggestions) {
      appendMenuItem(menu, {
        label: suggestion,
        click: () => {
          try {
            webContents.replaceMisspelling(suggestion)
          } catch (error) {
            console.error('[spellcheck] replaceMisspelling failed:', error)
          }
        }
      })
    }

    appendMenuItem(menu, { type: 'separator' })
  }

  if (params.isEditable) {
    if (params.misspelledWord) {
      appendMenuItem(menu, {
        label: 'Adicionar ao dicionário',
        enabled: Boolean(params.misspelledWord),
        click: () => {
          try {
            webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord)
          } catch (error) {
            console.error('[spellcheck] addWordToSpellCheckerDictionary failed:', error)
          }
        }
      })
      appendMenuItem(menu, { type: 'separator' })
    }

    appendMenuItem(menu, { label: 'Verificação ortográfica: português (Brasil)', enabled: false })
    appendMenuItem(menu, { type: 'separator' })
    appendMenuItem(menu, { label: 'Desfazer', role: 'undo', enabled: canUseEditFlag(params, 'canUndo') })
    appendMenuItem(menu, { label: 'Refazer', role: 'redo', enabled: canUseEditFlag(params, 'canRedo') })
    appendMenuItem(menu, { type: 'separator' })
    appendMenuItem(menu, { label: 'Recortar', role: 'cut', enabled: canUseEditFlag(params, 'canCut') })
    appendMenuItem(menu, { label: 'Copiar', role: 'copy', enabled: canUseEditFlag(params, 'canCopy') })
    appendMenuItem(menu, { label: 'Colar', role: 'paste', enabled: canUseEditFlag(params, 'canPaste') })
    appendMenuItem(menu, { label: 'Colar como texto sem formatação', role: 'pasteAndMatchStyle', enabled: canUseEditFlag(params, 'canPaste') })
    appendMenuItem(menu, { type: 'separator' })
    appendMenuItem(menu, { label: 'Selecionar tudo', role: 'selectAll', enabled: canUseEditFlag(params, 'canSelectAll') })
  } else {
    appendMenuItem(menu, { label: 'Copiar', role: 'copy', enabled: canUseEditFlag(params, 'canCopy') })
    appendMenuItem(menu, { label: 'Selecionar tudo', role: 'selectAll', enabled: canUseEditFlag(params, 'canSelectAll') })
  }

  return menu
}

function createWindow () {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      spellcheck: true
    }
  })

  try {
    win.webContents.session.setSpellCheckerLanguages(['pt-BR', 'pt', 'en-US'])
  } catch (error) {
    console.warn('Nao foi possivel configurar idiomas do corretor ortografico:', error.message)
  }

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    const currentUrl = win.webContents.getURL();
    if ((url.startsWith('http://') || url.startsWith('https://')) && url !== currentUrl && !url.includes('localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Prevent new windows from opening
  win.webContents.on('new-window', (event, url) => {
    event.preventDefault();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
  });

  win.webContents.on('context-menu', (event, params) => {
    try {
      const menu = buildSpellcheckMenu(params, win.webContents)
      if (menu.items.length > 0) {
        menu.popup({ window: BrowserWindow.fromWebContents(win.webContents) || win })
      }
    } catch (error) {
      console.error('[context-menu] failed:', error)
    }
  })

  // Log console messages from renderer
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    const levelMap = ['DEBUG', 'INFO', 'WARN', 'ERROR']
    console.log(`[RENDERER ${levelMap[level]}] ${message} (${sourceId}:${line})`)
  })

  win.loadFile(path.join(__dirname, 'index.html'))
}

app.whenReady().then(async () => {
  try {
    const apiInfo = await worionApi.start()
    console.log(`[Worion API] listening on http://${apiInfo.host}:${apiInfo.port}`)
  } catch (error) {
    console.error('[Worion API] falha ao iniciar:', error)
  }
  createWindow()
})

app.on('before-quit', () => {
  worionApi.stop().catch(() => {})
})
