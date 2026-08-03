import { spawn, spawnSync } from 'node:child_process';
import { open, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const pailSupported =
    spawnSync('php', ['-r', "exit(function_exists('pcntl_fork') ? 0 : 1);"], {
        stdio: 'ignore',
    }).status === 0;

if (pailSupported) {
    runPail();
} else {
    followLaravelLogs();
}

function runPail() {
    const pail = spawn('php', ['artisan', 'pail', '--timeout=0'], {
        stdio: 'inherit',
    });

    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => pail.kill(signal));
    }

    pail.on('exit', (code, signal) => {
        process.exitCode = signal ? 0 : (code ?? 1);
    });
}

function followLaravelLogs() {
    const logDirectory = path.resolve('storage/logs');
    const positions = new Map();
    let reading = false;

    console.log(
        'Pail requires pcntl, which is unavailable in this PHP runtime. Following storage/logs/*.log instead.',
    );

    const readUpdates = async () => {
        if (reading) return;
        reading = true;

        try {
            const files = (await readdir(logDirectory)).filter((file) => file.endsWith('.log'));

            for (const file of files) {
                const logPath = path.join(logDirectory, file);
                const details = await stat(logPath);

                if (!positions.has(logPath)) {
                    positions.set(logPath, details.size);
                    continue;
                }

                const previousSize = positions.get(logPath);
                const start = details.size < previousSize ? 0 : previousSize;

                if (details.size === start) continue;

                const handle = await open(logPath, 'r');
                const buffer = Buffer.alloc(details.size - start);

                try {
                    await handle.read(buffer, 0, buffer.length, start);
                } finally {
                    await handle.close();
                }

                positions.set(logPath, details.size);
                process.stdout.write(buffer.toString('utf8'));
            }
        } catch (error) {
            if (error?.code !== 'ENOENT') {
                console.error(`Unable to follow Laravel logs: ${error.message}`);
            }
        } finally {
            reading = false;
        }
    };

    const interval = setInterval(readUpdates, 500);
    void readUpdates();

    for (const signal of ['SIGINT', 'SIGTERM']) {
        process.on(signal, () => {
            clearInterval(interval);
            process.exit(0);
        });
    }
}
