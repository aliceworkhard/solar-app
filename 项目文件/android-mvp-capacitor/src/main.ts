import "./styles.css";
import { App } from "./app";
import { DeviceController } from "./device/deviceController";

const mountPoint = document.querySelector<HTMLDivElement>("#app");
if (!mountPoint) {
  throw new Error("Mount point #app not found.");
}

const controller = new DeviceController();
const app = new App(mountPoint, controller);
app.start();

