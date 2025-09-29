const { ipcRenderer } = require("electron");

const selectBtn = document.getElementById("selectBtn");
const repairBtn = document.getElementById("repairBtn");
const fileTable = document.getElementById("fileTable");
const logEl = document.getElementById("log");

let files = []; // { path, name, duration, codec, status, progress }

function log(msg) {
  logEl.textContent += msg + "\n";
  logEl.scrollTop = logEl.scrollHeight;
}

function renderTable() {
  fileTable.innerHTML = "";
  files.forEach((f, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${f.name}</td>
      <td>${f.codec || ""}</td>
      <td>${f.duration || ""}</td>
      <td>${f.status}</td>
      <td><progress value="${f.progress || 0}" max="100"></progress></td>
    `;
    fileTable.appendChild(tr);
  });
}

// 选择视频
selectBtn.onclick = async () => {
  const paths = await ipcRenderer.invoke("select-videos");
  if (!paths.length) return;
  files = paths.map((p) => ({
    path: p,
    name: p.split(/[\\/]/).pop(),
    status: "待处理",
    progress: 0,
  }));

  // 获取视频信息
  for (let f of files) {
    try {
      const info = await ipcRenderer.invoke("get-video-info", f.path);
      f.duration = info.format.duration.toFixed(2) + "s";
      f.codec = info.streams[0].codec_long_name;
    } catch (err) {
      f.status = "信息错误";
      log(`文件 ${f.name} 获取信息失败: ${err}`);
    }
  }

  renderTable();
  repairBtn.disabled = false;
};

// 开始批量修复
repairBtn.onclick = async () => {
  for (let f of files) {
    if (f.status === "信息错误") continue;
    f.status = "修复中";
    f.progress = 0;
    renderTable();

    // 接收进度事件
    const progressHandler = (_, data) => {
      if (data.inputPath === f.path) {
        f.progress = Math.min(data.percent || 0, 100);
        renderTable();
      }
    };
    ipcRenderer.on("repair-progress", progressHandler);

    try {
      const output = await ipcRenderer.invoke("repair-video", f.path);
      f.status = "完成";
      f.progress = 100;
      log(`文件 ${f.name} 修复完成: ${output}`);
    } catch (err) {
      f.status = "失败";
      log(`文件 ${f.name} 修复失败: ${err}`);
    }

    ipcRenderer.removeListener("repair-progress", progressHandler);
    renderTable();
  }

  alert("批量修复完成！");
};
