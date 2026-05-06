import { spawn } from 'node:child_process'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const useCmdShim = process.platform === 'win32' && /\.(cmd|bat)$/i.test(command)
    const child = useCmdShim
      ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', formatWindowsCommand(command, args)], {
          stdio: 'inherit',
          shell: false,
          ...options,
        })
      : spawn(command, args, {
          stdio: 'inherit',
          shell: false,
          ...options,
        })

    child.on('exit', code => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}`))
    })

    child.on('error', reject)
  })
}

function quoteWindowsArg(value) {
  if (value.length === 0) {
    return '""'
  }

  if (!/[\s"]/u.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '\\"')}"`
}

function formatWindowsCommand(command, args) {
  return [command, ...args].map(quoteWindowsArg).join(' ')
}

const env = {
  ...process.env,
  CSC_IDENTITY_AUTO_DISCOVERY: 'false',
}

await run(process.execPath, [path.join(rootDir, 'scripts', 'generate-electron-icon.mjs')], {
  cwd: rootDir,
  env,
})

await run(npmCommand, ['exec', 'electron-builder', '--', '--win'], {
  cwd: rootDir,
  env,
})