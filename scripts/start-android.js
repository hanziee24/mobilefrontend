const { spawn } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sdkRoot = path.resolve(projectRoot, '..', 'android-sdk');
const platformTools = path.join(sdkRoot, 'platform-tools');
const wrappers = path.join(sdkRoot, 'wrappers');
const androidHome = path.join(projectRoot, '.android-home');
const expoBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'expo.cmd' : 'expo');
const isWindows = process.platform === 'win32';

require('fs').mkdirSync(androidHome, { recursive: true });
require('fs').mkdirSync(wrappers, { recursive: true });

const env = {
  ...process.env,
  ANDROID_HOME: sdkRoot,
  ANDROID_SDK_ROOT: sdkRoot,
  ANDROID_SDK_HOME: androidHome,
  HOME: androidHome,
  USERPROFILE: androidHome,
  PATH: [wrappers, platformTools, process.env.PATH || ''].filter(Boolean).join(path.delimiter),
};

const child = spawn(expoBin, ['start', '--android'], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  shell: isWindows,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
