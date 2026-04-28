const { app, BrowserWindow, shell, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

let mainWindow;

// Attachments folder in app data
const getAttachmentsDir = () => {
  const dir = path.join(app.getPath("userData"), "attachments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: "#1a1714",
    icon: path.join(__dirname, "../build/icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC: Pick files via native dialog, copy to attachments folder
ipcMain.handle("pick-files", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      { name: "All Files", extensions: ["*"] },
      { name: "Documents", extensions: ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"] },
      { name: "Images", extensions: ["png", "jpg", "jpeg", "gif"] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return [];

  const attachments = [];
  const dir = getAttachmentsDir();

  for (const srcPath of result.filePaths) {
    const originalName = path.basename(srcPath);
    const timestamp = Date.now();
    const safeName = `${timestamp}_${originalName}`;
    const destPath = path.join(dir, safeName);

    try {
      fs.copyFileSync(srcPath, destPath);
      attachments.push({
        name: originalName,
        storedName: safeName,
        path: destPath,
        size: fs.statSync(destPath).size,
        addedDate: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Failed to copy attachment:", e);
    }
  }
  return attachments;
});

// IPC: Open a file with default app
ipcMain.handle("open-file", async (event, filePath) => {
  try {
    await shell.openPath(filePath);
    return true;
  } catch (e) {
    console.error("Failed to open file:", e);
    return false;
  }
});

// IPC: Get full path for a stored attachment
ipcMain.handle("get-attachment-path", (event, storedName) => {
  return path.join(getAttachmentsDir(), storedName);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
