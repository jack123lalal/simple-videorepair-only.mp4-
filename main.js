const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
//const ffmpegPath = require("ffmpeg-static");

//ffmpeg.setFfmpegPath(ffmpegPath);

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile("index.html");
}

app.whenReady().then(createWindow);

// 使用本地 ffmpeg
const ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', 'bin', 'ffmpeg.exe');
ffmpeg.setFfmpegPath(ffmpegPath);

// 选择文件（支持多选）
ipcMain.handle("select-videos", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    filters: [{ name: "视频文件", extensions: ["mp4", "mov", "mkv"] }],
    properties: ["openFile", "multiSelections"],
  });
  if (canceled) return [];
  return filePaths;
});

// 获取视频信息
ipcMain.handle("get-video-info", (event, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, info) => {
      if (err) reject(err.message);
      else resolve(info);
    });
  });
});

// 修复单个视频
ipcMain.handle("repair-video", (event, inputPath) => {
  const outputPath = inputPath.replace(/(\.\w+)$/, "_fixed$1");
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions("-c copy")
      .on("progress", (progress) => {
        event.sender.send("repair-progress", { inputPath, percent: progress.percent });
      })
      .on("end", () => resolve(outputPath))
      .on("error", (err) => reject(err.message))
      .save(outputPath);
  });
});
