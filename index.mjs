import { program } from 'commander';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import notifier from 'node-notifier';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import fs from 'fs';

import { setupAutostart, removeAutostart } from './autostart.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const require = createRequire(import.meta.url);

const BELL_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAqElEQVR42u3ZwRGAIAwF0V+2DdmL5diBXh0POkAChGyGAvadIIPO4CMAAAAAWBVwbHqeMIBr1/eZF/Cb7sFQ/3RbhgbWmxg0tr7doOH1jYbEAMP6FgMAAAAAAADAUyIsIPxrdIV9AAAbGSsl9wArZUqAeX21ISXAqb7OkA/gWl9hSAboUF9q0GzppQwAAAAkAZTO65ve77MeAIBJAd0GAAAAAAAAADBybqbUqraX4tXOAAAAAElFTkSuQmCC';

program
    .name('DoorbellWatcher')
    .description('433.93 MHz RTL-SDR doorbell detector (Era A01 / OOK)')
    .option('-f, --freq <hz>', 'center frequency in Hz', '433930000')
    .option('-s, --samplerate <hz>', 'sample rate', '250000')
    .option('-g, --gain <db>', 'tuner gain in dB  (0 = auto)', '0')
    .option('-d, --device <index>', 'RTL-SDR device index', '0')
    .option('-t, --threshold <n>', 'signal/noise ratio × 10 to trigger', '50')
    .option('-c, --cooldown <ms>', 'minimum ms between notifications', '3000')
    .option('--title <text>', 'notification title', 'Doorbell')
    .option('--message <text>', 'notification message', '🔔 Someone is at the door!')
    .option('--sound', 'play a sound on ring', false)
    .option('--tray', 'show system tray icon', false)
    .option('--autostart', 'install autostart entry and exit', false)
    .option('--no-autostart', 'remove autostart entry and exit')
    .option('--scan', 'calibration mode: print signal levels, no notifications', false)
    .option('--simulate', 'simulate 3 rings every 5 s (no SDR needed)', false)
    .option('--debug', 'verbose per-window output', false)
    .parse();

const opts = program.opts();

const FREQ = parseInt(opts.freq);
const SAMPLERATE = parseInt(opts.samplerate);
const GAIN = opts.gain;
const DEVICE = parseInt(opts.device);
const THRESHOLD = parseInt(opts.threshold);
const COOLDOWN_MS = parseInt(opts.cooldown);
const DEBUG = opts.debug;
const SIMULATE = opts.simulate;
const SCAN = opts.scan;

const ts = () => new Date().toLocaleTimeString('en-US', { hour12: false });
const log = (...a) => console.log(`[${ts()}]`, ...a);
const dbg = (...a) => {
  if (DEBUG) console.log(`[${ts()}] [DBG]`, ...a);
};

if (opts.autostart === true) {
    setupAutostart(opts);

    process.exit(0);
}

if (opts.autostart === false && process.argv.includes('--no-autostart')) {
    removeAutostart();

    process.exit(0);
}

let lastRingAt = 0;
let ringCount = 0;
let tray = null;

function ring() {
    const now = Date.now();

    if (now - lastRingAt < COOLDOWN_MS) {
        dbg('cooldown active');

        return;
    }

    lastRingAt = now;
    ringCount++;

    log(`🔔  RING #${ringCount}`);

    const iconPath = path.join(__dirname, 'bell.png');

    if (!fs.existsSync(iconPath)) {
        try {
            fs.writeFileSync(iconPath, Buffer.from(BELL_PNG_B64, 'base64'));
        } catch {}
    }

    notifier.notify({
        title: opts.title,
        message: opts.message,
        appName: 'DoorbellWatcher',
        sound: false,
        wait: false,
        icon: iconPath
    }, err => {
      if (err) dbg('notifier error:', err.message);
    });

    if (opts.sound) playSound();

    if (tray) updateTrayTitle(ringCount);
}

function playSound() {
    try {
        if (os.platform() === 'win32')
            execSync('powershell -c "[console]::beep(880,300);[console]::beep(1100,300)"', { timeout: 3000 });

        else if (os.platform() === 'darwin')
            execSync('afplay /System/Library/Sounds/Glass.aiff', { timeout: 2000 });

        else {
            for (const cmd of [
                    'paplay /usr/share/sounds/freedesktop/stereo/bell.oga',
                    'aplay /usr/share/sounds/alsa/Front_Center.wav',
                    'beep -f 880 -l 300 -D 100 -r 2'
                ]) {
                try {
                    execSync(cmd, { timeout: 2000, stdio: 'ignore' });

                    break;
                } catch {}
            }
        }
    } catch {
      dbg('sound playback failed');
    }
}

function startTray() {
    const SysTray = require('systray2').default;

    const menuItems = {
        RINGS: {
          title: 'Rings: 0',
          tooltip: '',
          enabled: false
        },
        SEP: SysTray.separator,
        AUTOSTART: {
          title: 'Run on startup',
          tooltip: '',
          checked: false,
          enabled: true
        },
        SEP2: SysTray.separator,
        QUIT: {
          title: 'Quit',
          tooltip: 'Exit DoorbellWatcher',
          enabled: true
        }
    };

    tray = new SysTray({
        menu: {
            icon: getTrayIcon(),
            title: '',
            tooltip: 'DoorbellWatcher',
            items: Object.values(menuItems)
        },
        debug: false,
        copyDir: true
    });

    tray.onClick(action => {
        switch (action.__id) {
            case 2:
                menuItems.AUTOSTART.checked = !menuItems.AUTOSTART.checked;

                if (menuItems.AUTOSTART.checked) setupAutostart(opts);

                else removeAutostart();

                tray.sendAction({ type: 'update-item', item: menuItems.AUTOSTART, seq_id: action.seq_id });

                break;

            case 4:
                tray.kill();

                break;
        }
    });

    tray.onError(err => dbg('tray error:', err.message));

    log('Tray icon started');
}

function updateTrayTitle(count) {
    if (!tray) return;

    tray.sendAction({
        type: 'update-item',
        item: {
            title: `Rings: ${count}`,
            tooltip: '',
            enabled: false
        },
        seq_id: 0
    });
}

function getTrayIcon() {
    const iconPath = path.join(__dirname, 'bell.png');

    if (fs.existsSync(iconPath)) return fs.readFileSync(iconPath).toString('base64');

    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

const WINDOW_MS = 10;
const WINDOW_BYTES = SAMPLERATE * WINDOW_MS / 1000 * 2;
const MIN_ACTIVE_MS = 50;
const MAX_ACTIVE_MS = 1000;
const GATE_MS = 700;
const HOLDOFF_WINS = 3;

class IqDetector {
    constructor() {
        this._buf = Buffer.alloc(0);
        this._baseline = -1;
        this._inBurst = false;
        this._winCount = 0;
        this._burstWin = 0;
        this._quietCount = 0;
        this._activeLog = [];

        this._scanPeak = 0;
        this._scanSum = 0;
        this._scanCount = 0;
        this._scanRatioMax = 0;

        if (SCAN) setInterval(() => this._printScan(), 1000);
    }

    feed(chunk) {
        this._buf = Buffer.concat([this._buf, chunk]);

        while (this._buf.length >= WINDOW_BYTES) {
            const win = this._buf.subarray(0, WINDOW_BYTES);

            this._buf = this._buf.subarray(WINDOW_BYTES);
            this._processWindow(win);
        }
    }

    _processWindow(win) {
        let sum = 0;
        const n = win.length >> 1;

        for (let i = 0; i < win.length; i += 2) {
            const I = win[i] - 127;
            const Q = win[i + 1] - 127;

            sum += I * I + Q * Q;
        }

        const power = sum / n;

        if (this._baseline < 0) this._baseline = power;

        if (power < this._baseline * 2.5)
            this._baseline = this._baseline * 0.997 + power * 0.003;

        const ratio = power / (this._baseline || 1);
        const active = ratio >= (THRESHOLD / 10);

        if (SCAN) {
            this._scanCount++;
            this._scanSum += power;

            if (power > this._scanPeak) this._scanPeak = power;

            if (ratio > this._scanRatioMax) this._scanRatioMax = ratio;

            return;
        }

        dbg(
            `pwr=${Math.round(power).toString().padStart(7)}`,
            `base=${Math.round(this._baseline).toString().padStart(7)}`,
            `ratio=${ratio.toFixed(2).padStart(6)}`,
            `active=${active}`
        );

        this._winCount++;

        if (active) {
            this._quietCount = 0;

            if (!this._inBurst) {
                this._inBurst = true;
                this._burstWin = this._winCount;

                dbg('↑ burst start');
            } else {
                const runningMs = (this._winCount - this._burstWin) * WINDOW_MS;

                if (runningMs > MAX_ACTIVE_MS) {
                    this._inBurst = false;
                    this._quietCount = 0;
                    this._burstWin = 0;

                    dbg(`burst force-closed (>${MAX_ACTIVE_MS} ms)`);
                }
            }
        } else if (this._inBurst) {
            this._quietCount++;

            if (this._quietCount >= HOLDOFF_WINS) {
                const durWins = this._winCount - this._burstWin - this._quietCount;
                const dur = durWins * WINDOW_MS;

                this._inBurst = false;
                this._quietCount = 0;

                dbg(`↓ burst end  dur=${dur} ms  (${durWins} windows)`);

                if (durWins > 0 && dur <= MAX_ACTIVE_MS) {
                    this._activeLog.push({ t: Date.now(), dur });
                    this._check();
                }

                else if (durWins > 0) dbg(`burst discarded (${dur} ms — too long)`);
            }
        }
    }

    _check() {
        const now = Date.now();

        this._activeLog = this._activeLog.filter(e => now - e.t < GATE_MS);

        const total = this._activeLog.reduce((s, e) => s + e.dur, 0);
        const count = this._activeLog.length;

        dbg(`gate: ${count} burst(s), ${total} ms active`);

        if (total >= MIN_ACTIVE_MS && total <= MAX_ACTIVE_MS) {
            log(`Pattern confirmed: ${count} burst(s) / ${total} ms`);

            this._activeLog = [];

            ring();
        }

    }

    _printScan() {
        if (this._scanCount === 0) return;

        const avg = Math.round(this._scanSum / this._scanCount);
        const peak = Math.round(this._scanPeak);
        const base = Math.round(this._baseline);
        const ratio = this._scanRatioMax.toFixed(1);
        const thr = (THRESHOLD / 10).toFixed(1);
        const fired = this._scanRatioMax >= THRESHOLD / 10;
        const barLen = Math.min(40, Math.round(this._scanRatioMax));
        const bar = (fired ? '▓' : '░').repeat(Math.max(1, barLen));
        const tag = fired ? ' ✓ WOULD FIRE' : '';

        process.stdout.write(
            `\r[SCAN]  base=${base.toString().padStart(6)}  ` +
            `avg=${avg.toString().padStart(6)}  ` +
            `peak=${peak.toString().padStart(7)}  ` +
            `ratio=${ratio.padStart(5)}×  thr=${thr}×  ` +
            bar.padEnd(40) + tag + '          '
        );

        this._scanPeak = 0;
        this._scanSum = 0;
        this._scanCount = 0;
        this._scanRatioMax = 0;
    }
}

function startRtlSdr(detector) {
    const args = ['-f', FREQ, '-s', SAMPLERATE, '-g', GAIN, '-d', DEVICE, '-'];

    log(`rtl_sdr ${args.join(' ')}`);

    const proc = spawn('rtl_sdr', args.map(String), { stdio: ['ignore', 'pipe', 'pipe'] });

    proc.stdout.on('data', chunk => detector.feed(chunk));

    proc.stderr.on('data', d => {
        const line = d.toString().trim();

        if (!line) return;

        if (SCAN) process.stdout.write('\n');

        dbg('[rtl_sdr]', line);
    });

    proc.on('error', err => {
        if (err.code === 'ENOENT') {
            console.error('\n[ERROR] rtl_sdr not found in PATH.');
            console.error('  Windows : https://github.com/rtlsdrblog/rtl-sdr-blog/releases');
            console.error('  Ubuntu  : sudo apt install rtl-sdr');
            console.error('  Arch    : sudo pacman -S rtl-sdr\n');
            process.exit(1);
        }
        
        log('rtl_sdr error:', err.message);
    });

    proc.on('close', code => {
        if (SCAN) console.log('');

        log(`rtl_sdr exited (code ${code})`);

        if (code !== 0 && code !== null) {
            log('Restarting in 2 s...');

            setTimeout(() => startRtlSdr(detector), 2000);
        }
    });

}

function startSimulation() {
    log('Simulation mode — 3 rings at 5 s intervals');

    let i = 0;

    const t = setInterval(() => {
        log(`[SIM] ring #${++i}`);

        ring();

        if (i >= 3) {
            clearInterval(t);
            setTimeout(() => process.exit(0), 4000);
        }
    }, 5000);
}

log('DoorbellWatcher starting');
log(`  Frequency  : ${(FREQ / 1e6).toFixed(3)} MHz`);
log(`  Samplerate : ${SAMPLERATE} Hz`);
log(`  Gain       : ${GAIN === '0' ? 'auto' : GAIN + ' dB'}`);
log(`  Device     : #${DEVICE}`);
log(`  Threshold  : ×${(THRESHOLD / 10).toFixed(1)}`);
log(`  Cooldown   : ${COOLDOWN_MS} ms`);
log(`  Sound      : ${opts.sound}`);
log(`  Tray       : ${opts.tray}`);
log('');

if (SIMULATE) startSimulation();

else {
    if (opts.tray) startTray();

    const detector = new IqDetector();

    startRtlSdr(detector);

    if (SCAN) {
        log('Calibration mode');
        log('  Press the doorbell button and watch the ratio column.');
        log('  Silence  → ratio ≈ 1.0×');
        log('  Doorbell → ratio spikes (10×, 30×, 100×...)');
        log(`  Current threshold = ×${(THRESHOLD / 10).toFixed(1)}  (-t ${THRESHOLD})`);
        log('  Pick a value between noise and signal, multiply by 10, pass as -t.');
        log('  Example: silence=1.0× signal=30× → use  -t 100');
        log('  Ctrl+C to exit.');
        log('');
    }

    else log(`Listening.  threshold=×${(THRESHOLD / 10).toFixed(1)}   Ctrl+C to stop.`);
}

process.on('SIGINT', () => {
    if (SCAN) console.log('');

    log('Exiting.');

    process.exit(0);
});

process.on('SIGTERM', () => {
    if (SCAN) console.log('');

    log('Exiting.');

    process.exit(0);
});
