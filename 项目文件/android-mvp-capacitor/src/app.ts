import { DeviceController } from "./device/deviceController";
import { spacedHex } from "./utils/hex";
import type { DeviceBrief, DeviceStatus, LogEntry } from "./types";

type ViewName = "home" | "control";

export class App {
  private readonly root: HTMLElement;
  private readonly controller: DeviceController;
  private devices: DeviceBrief[] = [];
  private status: DeviceStatus;
  private logs: LogEntry[] = [];
  private activeDeviceId = "";
  private view: ViewName = "home";
  private hiddenTapCount = 0;
  private debugVisible = false;

  constructor(root: HTMLElement, controller: DeviceController) {
    this.root = root;
    this.controller = controller;
    this.status = controller.getStatus();
    this.logs = controller.getLogs();
  }

  start(): void {
    this.render();
    this.controller.onStatusChange((status) => {
      this.status = status;
      this.refreshStatus();
    });
    this.controller.onLogChange((logs) => {
      this.logs = logs;
      this.refreshLogs();
    });
  }

  private render(): void {
    this.root.innerHTML = `
      <div class="shell">
        <header class="shell-header">
          <div class="brand" id="brandTrigger">
            <div class="brand-kicker">Solar BLE</div>
            <h1>MPPT Controller</h1>
          </div>
          <div class="conn-badge" id="connBadge">未连接</div>
        </header>

        <main>
          <section class="panel ${this.view === "home" ? "active" : ""}" id="homePanel">
            <div class="visual-strip">
              <img src="/assets/ui/01_device_home_page.png" alt="home reference" />
            </div>
            <div class="toolbar">
              <button class="btn icon" id="scanBtn" title="扫描设备">扫描</button>
              <button class="btn ghost" id="disconnectBtn" title="断开连接">断开</button>
              <button class="btn ghost" id="debugToggleBtn" title="调试日志">调试</button>
            </div>
            <div class="device-list" id="deviceList"></div>
            <div class="quick-grid">
              <div class="kv"><span>模式</span><strong id="modeValue">-</strong></div>
              <div class="kv"><span>功率</span><strong id="powerValue">-</strong></div>
              <div class="kv"><span>电池</span><strong id="batteryValue">-</strong></div>
              <div class="kv"><span>固件</span><strong id="fwValue">-</strong></div>
            </div>
            <button class="btn primary wide" id="enterControlBtn" disabled>进入控制页</button>
          </section>

          <section class="panel ${this.view === "control" ? "active" : ""}" id="controlPanel">
            <div class="visual-strip">
              <img src="/assets/ui/02_device_detail_control_page.png" alt="control reference" />
            </div>
            <div class="toolbar">
              <button class="btn ghost" id="backBtn">返回</button>
              <div class="chip">写入方式：<span id="writeTypeValue">-</span></div>
              <button class="btn ghost" id="debugToggleBtn2">调试</button>
            </div>

            <div class="control-stack">
              <div class="seg" id="modeSeg">
                <button data-mode="radar" class="seg-btn">雷达</button>
                <button data-mode="time" class="seg-btn">时控</button>
                <button data-mode="average" class="seg-btn">平均</button>
              </div>

              <div class="range-wrap">
                <label for="powerSlider">功率参数</label>
                <input id="powerSlider" type="range" min="0" max="100" value="30" />
                <div class="range-value"><span id="powerSliderValue">30%</span></div>
              </div>

              <div class="command-grid">
                <button class="btn" id="readStatusBtn">读取状态</button>
                <button class="btn" id="readVersionBtn">读取版本</button>
                <button class="btn" id="powerOnBtn">开机</button>
                <button class="btn" id="powerOffBtn">关机</button>
              </div>

              <div class="param-row">
                <input id="paramIdInput" type="number" value="1" min="0" max="255" />
                <input id="paramValueInput" type="number" value="30" min="0" max="100" />
                <button class="btn" id="setParamBtn">设置参数</button>
              </div>
              <div class="result" id="resultArea">等待操作</div>
            </div>
          </section>

          <section class="panel debug ${this.debugVisible ? "active" : ""}" id="debugPanel">
            <div class="toolbar">
              <div class="chip">调试控制台</div>
              <button class="btn ghost" id="debugCloseBtn">关闭</button>
            </div>
            <div class="uuid-row">
              <select id="uuidWriteSelect"></select>
              <select id="uuidNotifySelect"></select>
              <button class="btn" id="uuidApplyBtn">应用UUID</button>
            </div>
            <div class="raw-row">
              <input id="rawHexInput" type="text" placeholder="AA5502010000" />
              <select id="rawWriteType">
                <option value="write">write</option>
                <option value="writeNoResponse">writeNoResponse</option>
              </select>
              <label class="chip"><input id="rawWaitAck" type="checkbox" checked /> 等待BLE回包</label>
              <button class="btn" id="rawSendBtn">发送HEX</button>
            </div>
            <pre id="logArea"></pre>
          </section>
        </main>
      </div>
    `;

    this.bindEvents();
    this.refreshStatus();
    this.refreshDeviceList();
    this.refreshLogs();
    this.refreshUuidSelectors();
  }

  private bindEvents(): void {
    this.byId("scanBtn").addEventListener("click", () => {
      void this.scanDevices();
    });
    this.byId("disconnectBtn").addEventListener("click", () => {
      void this.disconnectDevice();
    });
    this.byId("debugToggleBtn").addEventListener("click", () => {
      this.debugVisible = !this.debugVisible;
      this.render();
    });
    this.byId("debugToggleBtn2").addEventListener("click", () => {
      this.debugVisible = !this.debugVisible;
      this.render();
    });
    this.byId("enterControlBtn").addEventListener("click", () => {
      this.view = "control";
      this.render();
    });
    this.byId("backBtn").addEventListener("click", () => {
      this.view = "home";
      this.render();
    });
    this.byId("readStatusBtn").addEventListener("click", () => void this.handleAction(() => this.controller.readStatus()));
    this.byId("readVersionBtn").addEventListener("click", () => void this.handleAction(() => this.controller.readVersion()));
    this.byId("powerOnBtn").addEventListener("click", () => void this.handleAction(() => this.controller.powerOn()));
    this.byId("powerOffBtn").addEventListener("click", () => void this.handleAction(() => this.controller.powerOff()));
    this.byId("setParamBtn").addEventListener("click", () => void this.handleSetParam());
    this.byId("brandTrigger").addEventListener("click", () => this.toggleDebugByTap());
    this.byId("debugCloseBtn").addEventListener("click", () => {
      this.debugVisible = false;
      this.render();
    });
    this.byId("uuidApplyBtn").addEventListener("click", () => {
      void this.handleApplyUuid();
    });
    this.byId("rawSendBtn").addEventListener("click", () => void this.handleRawSend());

    const slider = this.byId("powerSlider") as HTMLInputElement;
    const sliderValue = this.byId("powerSliderValue");
    slider.addEventListener("input", () => {
      sliderValue.textContent = `${slider.value}%`;
      (this.byId("paramValueInput") as HTMLInputElement).value = slider.value;
    });

    const modeButtons = this.root.querySelectorAll<HTMLButtonElement>("#modeSeg .seg-btn");
    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        modeButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      });
      if (button.dataset.mode === this.status.mode) {
        button.classList.add("active");
      }
    });
  }

  private async scanDevices(): Promise<void> {
    try {
      this.setResult("扫描中...");
      this.devices = await this.controller.scan();
      this.refreshDeviceList();
      this.setResult(`扫描完成：${this.devices.length} 台`);
    } catch (error) {
      this.setResult(`扫描失败：${this.errorMessage(error)}`);
    }
  }

  private async connectDevice(device: DeviceBrief): Promise<void> {
    try {
      this.activeDeviceId = device.deviceId;
      this.setResult(`连接 ${device.name}...`);
      await this.controller.connectAndPrepare(device.deviceId);
      this.setResult("连接成功并已订阅通知");
      this.refreshStatus();
      this.refreshUuidSelectors();
    } catch (error) {
      this.setResult(`连接失败：${this.errorMessage(error)}`);
    }
  }

  private async disconnectDevice(): Promise<void> {
    try {
      await this.controller.disconnect();
      this.setResult("已断开连接");
      this.refreshStatus();
      this.refreshUuidSelectors();
    } catch (error) {
      this.setResult(`断开失败：${this.errorMessage(error)}`);
    }
  }

  private async handleApplyUuid(): Promise<void> {
    const writeUUID = (this.byId("uuidWriteSelect") as HTMLSelectElement).value;
    const notifyUUID = (this.byId("uuidNotifySelect") as HTMLSelectElement).value;
    try {
      await this.controller.applyChannelSelection(writeUUID, notifyUUID);
      this.refreshStatus();
      this.refreshUuidSelectors();
      this.setResult(`UUID已应用 write=${writeUUID} notify=${notifyUUID}`);
    } catch (error) {
      this.setResult(`应用UUID失败：${this.errorMessage(error)}`);
    }
  }

  private async handleAction(action: () => Promise<string>): Promise<void> {
    try {
      this.setResult("执行中...");
      const message = await action();
      this.setResult(`成功：${message}`);
    } catch (error) {
      this.setResult(`失败：${this.errorMessage(error)}`);
    }
  }

  private async handleSetParam(): Promise<void> {
    const idEl = this.byId("paramIdInput") as HTMLInputElement;
    const valueEl = this.byId("paramValueInput") as HTMLInputElement;
    try {
      const message = await this.controller.setParam(idEl.value, Number(valueEl.value));
      this.setResult(`参数已设置：${message}`);
    } catch (error) {
      this.setResult(`参数设置失败：${this.errorMessage(error)}`);
    }
  }

  private async handleRawSend(): Promise<void> {
    const hexInput = this.byId("rawHexInput") as HTMLInputElement;
    const writeType = (this.byId("rawWriteType") as HTMLSelectElement).value as "write" | "writeNoResponse";
    const waitAck = (this.byId("rawWaitAck") as HTMLInputElement).checked;
    try {
      if (waitAck) {
        const rxHex = await this.controller.sendRawHexAndWait(hexInput.value, writeType, 2000);
        this.setResult(`RAW收发成功 TX=${spacedHex(hexInput.value)} RX=${spacedHex(rxHex)}`);
        return;
      }
      await this.controller.sendRawHex(hexInput.value, writeType);
      this.setResult(`RAW已发送 TX=${spacedHex(hexInput.value)}（未等待BLE回包）`);
    } catch (error) {
      this.setResult(`RAW发送失败：${this.errorMessage(error)}`);
    }
  }

  private refreshDeviceList(): void {
    const list = this.byId("deviceList");
    if (!this.devices.length) {
      list.innerHTML = `<div class="device-empty">暂无设备，先点击扫描</div>`;
      return;
    }
    list.innerHTML = this.devices
      .map(
        (device) => `
        <button class="device-item" data-device-id="${device.deviceId}">
          <div class="device-name">${device.name}</div>
          <div class="device-sub">RSSI ${device.rssi} dBm</div>
        </button>
      `
      )
      .join("");
    list.querySelectorAll<HTMLButtonElement>(".device-item").forEach((button) => {
      button.addEventListener("click", () => {
        const target = this.devices.find((item) => item.deviceId === button.dataset.deviceId);
        if (target) {
          void this.connectDevice(target);
        }
      });
    });
  }

  private refreshStatus(): void {
    if (!this.root.childElementCount) {
      return;
    }
    this.byId("connBadge").textContent = this.status.connected ? "已连接" : "未连接";
    this.byId("connBadge").classList.toggle("online", this.status.connected);
    this.byId("modeValue").textContent = this.status.mode;
    this.byId("powerValue").textContent = `${this.status.power}%`;
    this.byId("batteryValue").textContent = this.status.battery == null ? "-" : `${this.status.battery}%`;
    this.byId("fwValue").textContent = this.status.fwVersion || "-";
    this.byId("writeTypeValue").textContent = this.controller.getWriteType();
    const modeButtons = this.root.querySelectorAll<HTMLButtonElement>("#modeSeg .seg-btn");
    modeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === this.status.mode);
    });
    const enterControlBtn = this.byId("enterControlBtn") as HTMLButtonElement;
    enterControlBtn.disabled = !this.status.connected;
  }

  private refreshLogs(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const logArea = this.byId("logArea");
    const content = this.logs
      .slice(-120)
      .map((item) => {
        const time = new Date(item.time).toLocaleTimeString("zh-CN", { hour12: false });
        return `[${time}] [${item.level}] ${item.message}`;
      })
      .join("\n");
    logArea.textContent = content || "暂无日志";
    logArea.scrollTop = logArea.scrollHeight;
  }

  private refreshUuidSelectors(): void {
    if (!this.root.childElementCount) {
      return;
    }
    const writeSelect = this.byId("uuidWriteSelect") as HTMLSelectElement;
    const notifySelect = this.byId("uuidNotifySelect") as HTMLSelectElement;
    const applyBtn = this.byId("uuidApplyBtn") as HTMLButtonElement;
    const candidates = this.controller.getChannelCandidates();
    const selected = this.controller.getSelectedChannels();

    this.renderUuidOptions(writeSelect, candidates.writeUUIDs, selected.writeUUID);
    this.renderUuidOptions(notifySelect, candidates.notifyUUIDs, selected.notifyUUID);

    applyBtn.disabled = !this.status.connected || !candidates.writeUUIDs.length || !candidates.notifyUUIDs.length;
  }

  private renderUuidOptions(
    select: HTMLSelectElement,
    values: string[],
    selectedValue: string
  ): void {
    const normalizedSelected = selectedValue.toLowerCase();
    const options = values.length
      ? values
      : ["(请先连接设备并发现服务)"];
    select.innerHTML = options
      .map((item) => `<option value="${item}">${item}</option>`)
      .join("");
    if (values.length && values.includes(normalizedSelected)) {
      select.value = normalizedSelected;
      return;
    }
    select.value = options[0];
  }

  private setResult(message: string): void {
    if (!this.root.childElementCount) {
      return;
    }
    this.byId("resultArea").textContent = message;
  }

  private toggleDebugByTap(): void {
    this.hiddenTapCount += 1;
    if (this.hiddenTapCount < 5) {
      return;
    }
    this.hiddenTapCount = 0;
    this.debugVisible = !this.debugVisible;
    this.render();
  }

  private byId(id: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(`#${id}`);
    if (!element) {
      throw new Error(`Element #${id} not found.`);
    }
    return element;
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
