import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { v4 as uuid } from "uuid";
import * as ThreeMF from "./3MFLoader";
import * as STL from "./STLLoader";
import * as API from "./api";

let win: BrowserWindow;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    // frame: false,
    transparent: false,
    webPreferences: {
      // <--- (1) Additional preferences
      nodeIntegration: true,
      preload: __dirname + "/preload.js", // <--- (2) Preload script
    },
  });

  win.loadURL("http://localhost:3000"); // <--- (3) Loading react

  // win.webContents.openDevTools();

  win.on("closed", () => {
    win = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (win === null) {
    createWindow();
  }
});

ipcMain.on("window:minimize", function (e) {
  win.minimize();
});

ipcMain.on("window:maximize", function (e) {
  win.maximize();
});

ipcMain.on("window:close", function (e) {
  win.close();
});

// Catch file:open
ipcMain.on("file:open", function (e) {
  const selectedPaths = dialog.showOpenDialogSync({
    filters: [
      { name: "3D Files", extensions: ["3mf", "stl"] },
      { name: "3MF Files", extensions: ["3mf"] },
      { name: "STL Files", extensions: ["stl"] },
    ],
    properties: ["openFile", "multiSelections"],
  });

  if (selectedPaths) {
    handleFileSelection(selectedPaths);
  }
});

function handleFileSelection(filePaths: string[]) {
  filePaths.forEach((filePath) => {
    var fileExtension = filePath.split(".").pop();

    if (fileExtension === "3mf") {
      var loader = new ThreeMF.ThreeMFLoader();
      loader.load(filePath, on3MFLoaded);
    } else if (fileExtension === "stl") {
      var stlLoader = new STL.STLLoader();
      stlLoader.load(filePath, onSTLLoaded);
    }
  });
}

function onSTLLoaded(stlMeshes: STL.STLMesh[]) {
  stlMeshes.forEach((stlMesh) => {
    var mesh = new API.Mesh();
    mesh.vertexArray = stlMesh.vertexArray;

    var item = new API.Item();
    item.uuid = uuid();
    item.name = stlMesh.name;
    item.mesh = mesh;

    win.webContents.send("item:add", item);
  });
}

function on3MFLoaded(packageData: ThreeMF.PackageData) {
  packageData.modelParts.forEach((modelPart) => {
    modelPart.build.forEach((modelItem) => {
      var item = new API.Item();
      item.uuid = uuid();
      item.name = "Item";
      item.transform = modelItem.transform;
      process3MFObject(item, modelPart.resources.objects, modelItem.objectId);
      win.webContents.send("item:add", item);
    });
  });
}

function process3MFObject(
  parentItem: API.Item,
  objects: { [key: string]: ThreeMF.ModelObject },
  objectId: string
) {
  var modelObject = objects[objectId];

  modelObject.components.forEach((component) => {
    var item = new API.Item();
    item.uuid = uuid();
    item.name = "Component";
    item.transform = component.transform;
    process3MFObject(item, objects, component.objectId);
    parentItem.subItems.push(item);
  });

  parentItem.mesh.vertexArray = modelObject.mesh.vertexArray;
  parentItem.mesh.triangleArray = modelObject.mesh.triangleArray;
}
