import os from 'os';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const APP_NAME = 'DoorbellWatcher';
const ENTRY_NAME = 'DoorbellWatcher';
const NODE_BIN = process.execPath;
const SCRIPT = path.join(__dirname, 'index.mjs');

function buildCmd(opts) {
    const args = [
        opts.freq !== '433930000' ? `-f ${opts.freq}` : '',
        opts.samplerate !== '250000' ? `-s ${opts.samplerate}` : '',
        opts.gain !== '0' ? `-g ${opts.gain}` : '',
        opts.device !== '0' ? `-d ${opts.device}` : '',
        opts.threshold !== '50' ? `-t ${opts.threshold}` : '',
        opts.cooldown !== '3000' ? `-c ${opts.cooldown}` : '',
        opts.title !== 'Doorbell' ? `--title "${opts.title}"` : '',
        opts.message !== '🔔 Someone is at the door!' ?
        `--message "${opts.message}"` : '',
        opts.sound ? '--sound' : '',
        opts.tray ? '--tray' : '',
    ].filter(Boolean).join(' ');

    return `"${NODE_BIN}" "${SCRIPT}"${args ? ' ' + args : ''}`;
}

function installWindows(cmd) {
    const key = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;

    execSync(`reg add "${key}" /v "${ENTRY_NAME}" /t REG_SZ /d "${cmd}" /f`);

    console.log(`[autostart] Installed to registry: ${key}\\${ENTRY_NAME}`);
}

function removeWindows() {
    const key = `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run`;

    try {
        execSync(`reg delete "${key}" /v "${ENTRY_NAME}" /f`);

        console.log(`[autostart] Removed from registry.`);
    } catch {
        console.log(`[autostart] Entry not found in registry.`);
    }
}

function installLinux(cmd) {
    const dir = path.join(os.homedir(), '.config', 'autostart');
    const file = path.join(dir, `${ENTRY_NAME}.desktop`);

    fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(file, [
        '[Desktop Entry]',
        `Name=${APP_NAME}`,
        'Type=Application',
        `Exec=${cmd}`,
        'Hidden=false',
        'NoDisplay=false',
        'X-GNOME-Autostart-enabled=true',
        `Comment=${APP_NAME} doorbell detector`
    ].join('\n') + '\n');

    console.log(`[autostart] Installed: ${file}`);
}

function removeLinux() {
    const file = path.join(os.homedir(), '.config', 'autostart', `${ENTRY_NAME}.desktop`);

    if (fs.existsSync(file)) {
      fs.unlinkSync(file);

      console.log(`[autostart] Removed: ${file}`);
    }

    else console.log(`[autostart] Entry not found: ${file}`);
}

function installMacos(cmd) {
    const dir = path.join(os.homedir(), 'Library', 'LaunchAgents');
    const file = path.join(dir, `com.doorbellwatcher.plist`);

    fs.mkdirSync(dir, { recursive: true });

    const args = cmd.split(' ').map(a => `    <string>${a}</string>`).join('\n');

    fs.writeFileSync(file, `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.doorbellwatcher</string>
  <key>ProgramArguments</key>
  <array>
${args}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <false/>
</dict>
</plist>
`);

    try {
      execSync(`launchctl load "${file}"`);
    } catch {}

    console.log(`[autostart] Installed: ${file}`);
}

function removeMacos() {
    const file = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.doorbellwatcher.plist');

    if (fs.existsSync(file)) {
        try {
          execSync(`launchctl unload "${file}"`);
        } catch {}

        fs.unlinkSync(file);

        console.log(`[autostart] Removed: ${file}`);
    }

    else console.log(`[autostart] Entry not found: ${file}`);
}

export function setupAutostart(opts) {
    const cmd = buildCmd(opts);
    const p = os.platform();

    if (p === 'win32') installWindows(cmd);
    else if (p === 'darwin') installMacos(cmd);
    else installLinux(cmd);
}

export function removeAutostart() {
    const p = os.platform();

    if (p === 'win32') removeWindows();
    else if (p === 'darwin') removeMacos();
    else removeLinux();
}
