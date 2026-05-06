import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const gradleCommand = process.platform === 'win32' ? 'gradlew.bat' : './gradlew'
const javaExecutable = process.platform === 'win32' ? 'java.exe' : 'java'

const target = process.argv[2]

if (target !== 'phone' && target !== 'tv') {
  console.error('Usage: node scripts/build-android-apk.mjs <phone|tv>')
  process.exit(1)
}

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

function resolveJavaHome() {
  const candidates = [
    process.env.ANDROID_STUDIO_JBR,
    process.platform === 'win32' ? 'C:\\Program Files\\Android\\Android Studio\\jbr' : null,
    process.platform === 'darwin' ? '/Applications/Android Studio.app/Contents/jbr/Contents/Home' : null,
    process.env.JAVA_HOME,
  ].filter(Boolean)

  return candidates.find(candidate => existsSync(path.join(candidate, 'bin', javaExecutable))) ?? null
}

function getTargetConfig(buildTarget) {
  if (buildTarget === 'phone') {
    return {
      gradleDir: path.join(rootDir, 'android'),
      artifactSource: path.join(rootDir, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
      artifactDest: path.join(rootDir, 'dist-electron', 'AtlasTv-Phone.apk'),
      prebuild: () => run(npmCommand, ['run', 'cap:sync'], { cwd: rootDir, env }),
    }
  }

  return {
    gradleDir: path.join(rootDir, 'android-tv'),
    artifactSource: path.join(rootDir, 'android-tv', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'),
    artifactDest: path.join(rootDir, 'dist-electron', 'AtlasTv-TV.apk'),
    prebuild: () => run(npmCommand, ['run', 'cap:tv:sync'], { cwd: rootDir, env }),
  }
}

const env = { ...process.env }
const javaHome = resolveJavaHome()

if (javaHome) {
  env.JAVA_HOME = javaHome
  console.log(`Using JAVA_HOME=${javaHome}`)
}

const { gradleDir, artifactSource, artifactDest, prebuild } = getTargetConfig(target)

await run(npmCommand, ['run', 'build'], { cwd: rootDir, env })
await prebuild()
await run(gradleCommand, ['assembleDebug'], { cwd: gradleDir, env })

if (!existsSync(artifactSource)) {
  throw new Error(`APK not found: ${artifactSource}`)
}

mkdirSync(path.dirname(artifactDest), { recursive: true })
copyFileSync(artifactSource, artifactDest)

console.log(`Copied ${target} APK to ${artifactDest}`)