import { ipcRenderer, contextBridge } from 'electron'

const WINDOW_ROLE_ARG = '--window-role='
const roleArg = process.argv.find((arg) => arg.startsWith(WINDOW_ROLE_ARG))
const windowRole = roleArg ? roleArg.slice(WINDOW_ROLE_ARG.length) : null

contextBridge.exposeInMainWorld('roscaWindow', {
  role: windowRole,
})

contextBridge.exposeInMainWorld('roscaGame', {
  getState: () => ipcRenderer.invoke('rosca:get-state'),
  connect: (player: string) => ipcRenderer.send('rosca:connect', player),
  disconnect: (player: string) => ipcRenderer.send('rosca:disconnect', player),
  setStartMinutes: (minutes: number) => ipcRenderer.send('rosca:set-start-minutes', minutes),
  startGame: () => ipcRenderer.send('rosca:start'),
  reset: () => ipcRenderer.send('rosca:reset'),
  setCurrentLetter: (player: string, index: number) => ipcRenderer.send('rosca:set-current-letter', player, index),
  markResult: (result: LetterResult) => ipcRenderer.send('rosca:mark-result', result),
  onStateChange: (listener: (state: GameSnapshot) => void) => {
    const wrapped = (_event: Electron.IpcRendererEvent, state: GameSnapshot) => listener(state)
    ipcRenderer.on('rosca:state-updated', wrapped)
    return () => {
      ipcRenderer.off('rosca:state-updated', wrapped)
    }
  },
})

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // You can expose other APTs you need here.
  // ...
})
