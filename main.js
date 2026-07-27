const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

const isPackaged = app.isPackaged;
const baseDir = isPackaged ? process.resourcesPath : __dirname;
const MODEL_DIR = isPackaged
  ? path.join(app.getPath('userData'), 'model')
  : path.join(__dirname, 'model');
const PYTHON_SCRIPT = path.join(baseDir, 'generate.py');
const VENV_PYTHON = process.platform === 'win32'
  ? path.join(baseDir, 'venv', 'Scripts', 'python.exe')
  : path.join(baseDir, 'venv', 'bin', 'python3');
const OUTPUT_DIR = path.join(os.homedir(), 'Pictures', 'Foto');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

let mainWindow;
let currentProcess = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#151515ff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // allow local file:// image loading
    },
    show: true
  });

  const isDev = process.argv.includes('--dev');
  if (isDev) {
    mainWindow.loadURL('http://127.0.0.1:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (currentProcess) currentProcess.kill();
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── IPC: check python is ready ──────────────────────────────────────────────
ipcMain.handle('check-python-ready', async () => {
  try {
    if (process.platform === 'win32') {
      const sdcppPath = path.join(baseDir, 'venv', 'Lib', 'site-packages', 'stable_diffusion_cpp');
      if (fs.existsSync(sdcppPath)) {
        return { ready: true, output: 'ok' };
      }
    } else {
      const sitePackagesBase = path.join(baseDir, 'venv', 'lib');
      if (fs.existsSync(sitePackagesBase)) {
        const libDirs = fs.readdirSync(sitePackagesBase);
        for (const dir of libDirs) {
          const sdcppPath = path.join(sitePackagesBase, dir, 'site-packages', 'stable_diffusion_cpp');
          if (fs.existsSync(sdcppPath)) {
            return { ready: true, output: 'ok' };
          }
        }
      }
    }
    return { ready: false, output: 'stable_diffusion_cpp not found in venv' };
  } catch (e) {
    return { ready: false, output: e.message };
  }
});

// ── IPC: get system specs ──────────────────────────────────────────────────────
ipcMain.handle('get-system-specs', async () => {
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : '';
  const totalMem = os.totalmem();
  const ramGB = totalMem / (1024 * 1024 * 1024);

  // Check if it's Apple Silicon (M-series)
  const isMSeries = /Apple\s+M/i.test(cpuModel) || /VirtualApple/i.test(cpuModel);

  // Check if it's Intel i5 or higher (i5, i7, i9, Xeon)
  const isIntelI5OrHigher = /i5/i.test(cpuModel) || /i7/i.test(cpuModel) || /i9/i.test(cpuModel) || /Xeon/i.test(cpuModel);

  // Check if it's a high-end Pro, Max, or Ultra processor
  const isProMaxUltra = /Pro/i.test(cpuModel) || /Max/i.test(cpuModel) || /Ultra/i.test(cpuModel);

  return {
    cpuModel,
    ramGB,
    isMSeries,
    isIntelI5OrHigher,
    isProMaxUltra
  };
});

// ── IPC: generate image ──────────────────────────────────────────────────────
ipcMain.handle('generate-image', async (_event, params) => {
  if (currentProcess) {
    currentProcess.kill();
    currentProcess = null;
  }

  const pythonBin = fs.existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3';
  const timestamp = Date.now();
  const outputPath = path.join(OUTPUT_DIR, `foto_${timestamp}.png`);

  let modelFilename = 'juggernaut-xl-v9-Q4_K.gguf';
  if (params.model === 'heavy') {
    modelFilename = 'heavy.gguf';
  } else if (params.model === 'ultra') {
    modelFilename = 'ultra.gguf';
  } else if (params.model === 'general') {
    if (fs.existsSync(path.join(MODEL_DIR, 'general.gguf'))) {
      modelFilename = 'general.gguf';
    }
  }

  const args = [
    PYTHON_SCRIPT,
    '--model', path.join(MODEL_DIR, modelFilename),
    '--clip_l', path.join(MODEL_DIR, 'text-encoder.fp16.safetensors'),
    '--clip_g', path.join(MODEL_DIR, 'text-encoder2.fp16.safetensors'),
    '--vae', path.join(MODEL_DIR, 'vae-fp16.safetensors'),
    '--prompt', params.prompt || 'a beautiful photo',
    '--negative_prompt', params.negativePrompt || 'blurry, low quality, ugly',
    '--steps', String(params.steps || 20),
    '--cfg', String(params.cfg || 7.0),
    '--width', String(params.width || 1024),
    '--height', String(params.height || 1024),
    '--seed', String(params.seed || -1),
    '--sampler', params.sampler || 'dpm++2m',
    '--threads', String(params.threads || Math.max(1, os.cpus().length - 1)),
    '--output', outputPath
  ];

  return new Promise((resolve, reject) => {
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : '';
    const isMSeries = /Apple\s+M/i.test(cpuModel) || /VirtualApple/i.test(cpuModel);

    // Disable Metal GPU backend on Intel Mac with AMD GPU to prevent GGML_ASSERT crash
    const spawnEnv = { ...process.env };
    if (!isMSeries) {
      spawnEnv.GGML_NO_METAL = '1';
      spawnEnv.GGML_METAL_NDISABLE = '1';
      spawnEnv.SD_NO_METAL = '1';
    }
    currentProcess = spawn(pythonBin, args, { env: spawnEnv });

    let stderrBuf = '';

    currentProcess.stderr.on('data', (data) => {
      const line = data.toString().trim();
      stderrBuf += line + '\n';
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation-progress', { type: 'log', message: line });
      }
    });

    currentProcess.stdout.on('data', (data) => {
      const line = data.toString().trim();
      const progressMatch = line.match(/PROGRESS:(\d+)/);
      if (progressMatch && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('generation-progress', {
          type: 'progress',
          percent: parseInt(progressMatch[1])
        });
      }
    });

    currentProcess.on('close', (code, signal) => {
      currentProcess = null;
      console.log(`[Foto] Python exited code=${code} signal=${signal}`);
      if (stderrBuf) console.log('[Foto] Python stderr:\n' + stderrBuf.slice(-2000));
      if (code === 0 && fs.existsSync(outputPath)) {
        const imageData = fs.readFileSync(outputPath);
        const base64 = imageData.toString('base64');
        resolve({ success: true, base64, filePath: outputPath, timestamp });
      } else if (signal) {
        // killed by signal — could be crash or user cancel
        const msg = stderrBuf.slice(-500) || `Killed by signal ${signal}`;
        reject(new Error(`Python crashed: ${msg}`));
      } else if (code === null) {
        resolve({ success: false, cancelled: true });
      } else {
        const msg = stderrBuf.slice(-500) || `exit code ${code}`;
        reject(new Error(`Generation failed: ${msg}`));
      }
    });

    currentProcess.on('error', (err) => {
      currentProcess = null;
      reject(err);
    });
  });
});

// ── IPC: cancel ──────────────────────────────────────────────────────────────
ipcMain.handle('cancel-generation', () => {
  if (currentProcess) {
    currentProcess.kill('SIGTERM');
    currentProcess = null;
    return { cancelled: true };
  }
  return { cancelled: false };
});

// ── IPC: open output folder ───────────────────────────────────────────────────
ipcMain.handle('open-output-folder', () => {
  shell.openPath(OUTPUT_DIR);
});

// ── IPC: delete image ─────────────────────────────────────────────────────────
ipcMain.handle('delete-image', (_event, filePath) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// ── IPC: get all generated images ─────────────────────────────────────────────
ipcMain.handle('get-generated-images', () => {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) return [];
    const files = fs.readdirSync(OUTPUT_DIR)
      .filter(f => f.endsWith('.png') && f.startsWith('foto_'))
      .sort()
      .reverse()
      .slice(0, 100)
      .map(f => ({
        filePath: path.join(OUTPUT_DIR, f),
        timestamp: parseInt(f.replace('foto_', '').replace('.png', ''))
      }));
    return files;
  } catch {
    return [];
  }
});

// ── IPC: check models status ───────────────────────────────────────────────────
ipcMain.handle('check-models-status', async () => {
  const encodersFiles = [
    'text-encoder.fp16.safetensors',
    'text-encoder2.fp16.safetensors',
    'vae-fp16.safetensors'
  ];
  const presentCount = encodersFiles.filter(file => fs.existsSync(path.join(MODEL_DIR, file))).length;

  const status = {
    general: fs.existsSync(path.join(MODEL_DIR, 'general.gguf')) || fs.existsSync(path.join(MODEL_DIR, 'juggernaut-xl-v9-Q4_K.gguf')),
    heavy: fs.existsSync(path.join(MODEL_DIR, 'heavy.gguf')),
    ultra: fs.existsSync(path.join(MODEL_DIR, 'ultra.gguf')),
    encoders: {
      count: presentCount,
      installed: presentCount === 3,
      percent: Math.round((presentCount / 3) * 100)
    }
  };
  return status;
});

// ── IPC: download model ────────────────────────────────────────────────────────
ipcMain.handle('download-model', async (_event, { modelId, url }) => {
  const https = require('https');
  const http = require('http');

  // Ensure MODEL_DIR exists
  if (!fs.existsSync(MODEL_DIR)) {
    fs.mkdirSync(MODEL_DIR, { recursive: true });
  }

  // Helper to do download
  const startDownload = (downloadUrl, targetPath, onProgress) => {
    return new Promise((resolve, reject) => {
      const tempPath = targetPath + '.tmp';
      
      // Determine if we can resume
      let startBytes = 0;
      if (fs.existsSync(tempPath)) {
        try {
          const stat = fs.statSync(tempPath);
          startBytes = stat.size;
        } catch (e) {
          startBytes = 0;
        }
      }

      const options = {
        headers: {}
      };

      if (startBytes > 0) {
        options.headers['Range'] = `bytes=${startBytes}-`;
      }

      // Open in append mode if resuming, write mode if starting fresh
      const file = fs.createWriteStream(tempPath, { flags: startBytes > 0 ? 'a' : 'w' });
      const client = downloadUrl.startsWith('https') ? https : http;

      const req = client.get(downloadUrl, options, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirect: do NOT unlink tempPath to preserve partial downloads
          file.close();
          startDownload(response.headers.location, targetPath, onProgress).then(resolve).catch(reject);
          return;
        }

        const isRange = response.statusCode === 206;
        if (response.statusCode !== 200 && !isRange) {
          file.close();
          reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
          return;
        }

        // If we requested range but got 200, it means the server restarted the download from 0.
        // We should recreate the write stream in write mode to overwrite.
        let actualFile = file;
        let downloadedBytes = startBytes;
        if (startBytes > 0 && !isRange) {
          file.close();
          fs.writeFileSync(tempPath, ''); // truncate
          actualFile = fs.createWriteStream(tempPath, { flags: 'w' });
          downloadedBytes = 0;
        }

        let totalBytes = parseInt(response.headers['content-length'], 10);
        if (isRange && response.headers['content-range']) {
          // Content-Range format: "bytes 200-1000/1000"
          const match = response.headers['content-range'].match(/\/(\d+)/);
          if (match) {
            totalBytes = parseInt(match[1], 10);
          } else {
            totalBytes = totalBytes + downloadedBytes;
          }
        } else if (!isRange && totalBytes) {
          // totalBytes is already correct
        }

        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          if (totalBytes) {
            const progress = Math.round((downloadedBytes / totalBytes) * 100);
            if (onProgress) {
              onProgress(progress);
            } else if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download-progress', { modelId, progress, status: 'downloading' });
            }
          }
        });

        response.pipe(actualFile);

        actualFile.on('finish', () => {
          actualFile.close();
          try {
            fs.renameSync(tempPath, targetPath);
            resolve();
          } catch (renameErr) {
            reject(renameErr);
          }
        });
      });

      req.on('error', (err) => {
        file.close();
        reject(err);
      });
    });
  };

  if (modelId === 'encoders') {
    const filesToDownload = Array.isArray(url) ? url : [];
    try {
      mainWindow.webContents.send('download-progress', { modelId, progress: 0, status: 'downloading' });

      let completedFiles = 0;
      for (const item of filesToDownload) {
        const destPath = path.join(MODEL_DIR, item.filename);

        // If file already exists, skip it
        if (fs.existsSync(destPath)) {
          completedFiles++;
          const overallProgress = Math.round((completedFiles / filesToDownload.length) * 100);
          mainWindow.webContents.send('download-progress', { modelId, progress: overallProgress, status: 'downloading' });
          continue;
        }

        await startDownload(item.url, destPath, (fileProgress) => {
          const overallProgress = Math.round(((completedFiles * 100 + fileProgress) / (filesToDownload.length * 100)) * 100);
          mainWindow.webContents.send('download-progress', { modelId, progress: overallProgress, status: 'downloading' });
        });

        completedFiles++;
        const overallProgress = Math.round((completedFiles / filesToDownload.length) * 100);
        mainWindow.webContents.send('download-progress', { modelId, progress: overallProgress, status: 'downloading' });
      }

      mainWindow.webContents.send('download-progress', { modelId, progress: 100, status: 'completed' });
      return { success: true };
    } catch (error) {
      console.error(`[Foto] Download failed for encoders:`, error);
      mainWindow.webContents.send('download-progress', { modelId, status: 'error', error: error.message });
      return { success: false, error: error.message };
    }
  }

  const filename = `${modelId}.gguf`;
  const destPath = path.join(MODEL_DIR, filename);

  try {
    mainWindow.webContents.send('download-progress', { modelId, progress: 0, status: 'downloading' });
    await startDownload(url, destPath);
    mainWindow.webContents.send('download-progress', { modelId, progress: 100, status: 'completed' });
    return { success: true };
  } catch (error) {
    console.error(`[Foto] Download failed for ${modelId}:`, error);
    mainWindow.webContents.send('download-progress', { modelId, status: 'error', error: error.message });
    return { success: false, error: error.message };
  }
});

// ── IPC: delete model ─────────────────────────────────────────────────────────
ipcMain.handle('delete-model', (_event, modelId) => {
  try {
    if (modelId === 'encoders') {
      const files = ['text-encoder.fp16.safetensors', 'text-encoder2.fp16.safetensors', 'vae-fp16.safetensors'];
      for (const file of files) {
        const filePath = path.join(MODEL_DIR, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        const tmpPath = filePath + '.tmp';
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      }
      return { success: true };
    }

    const filename = `${modelId}.gguf`;
    const filePath = path.join(MODEL_DIR, filename);
    const tmpPath = filePath + '.tmp';
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    if (fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
    if (modelId === 'general') {
      const oldPath = path.join(MODEL_DIR, 'juggernaut-xl-v9-Q4_K.gguf');
      const oldTmpPath = oldPath + '.tmp';
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
      if (fs.existsSync(oldTmpPath)) {
        fs.unlinkSync(oldTmpPath);
      }
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

