import axios from "axios";
import { resolveApiBaseUrl } from "./apiBaseUrl";

export interface ScormData { [key: string]: string }
export type ScormCommitEvent = "commit" | "suspend" | "terminate";

interface StudioAttemptOptions {
  attemptId?: number;
  scoIdentifier?: string;
  initialData?: ScormData;
  baseUrl?: string;
  onCommitError?: (error: unknown) => void;
}

class RuntimeDataModel {
  protected data: ScormData;
  protected initialized = false;
  protected lastError = "0";
  private pendingCommit: Promise<unknown> = Promise.resolve();

  constructor(protected userId: number, protected contentId: number, protected options: StudioAttemptOptions = {}) {
    this.data = { ...(options.initialData || {}) };
  }

  protected initialize() {
    if (this.initialized) return this.fail("103");
    this.initialized = true;
    this.lastError = "0";
    return "true";
  }

  protected getValue(name: string) {
    if (!this.initialized) return this.fail("123", "");
    this.lastError = "0";
    return this.data[name] || "";
  }

  protected setValue(name: string, value: string) {
    if (!this.initialized) return this.fail("132");
    this.data[name] = String(value);
    this.lastError = "0";
    return "true";
  }

  // SCORM calls are synchronous. Network persistence is queued in the
  // background, so Commit returns a SCORM boolean string immediately.
  protected commit(event: ScormCommitEvent = "commit") {
    if (!this.initialized) return this.fail("142");
    const baseUrl = this.options.baseUrl || resolveApiBaseUrl();
    const token = localStorage.getItem("token");
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const url = this.options.attemptId
      ? `${baseUrl}/api/studio/scorm/attempts/${this.options.attemptId}/commit`
      : `${baseUrl}/api/scorm/commit`;
    const payload = this.options.attemptId
      ? { sco_identifier: this.options.scoIdentifier, data: { ...this.data }, event }
      : { userId: this.userId, contentId: this.contentId, data: { ...this.data }, attemptNo: 1 };
    this.pendingCommit = this.pendingCommit
      .catch(() => undefined)
      .then(() => axios.post(url, payload, { headers }))
      .catch((error) => this.options.onCommitError?.(error));
    this.lastError = "0";
    return "true";
  }

  protected finish(event: ScormCommitEvent = "terminate") {
    if (!this.initialized) return this.fail("301");
    this.commit(event);
    this.initialized = false;
    return "true";
  }

  protected fail(code: string, value = "false") {
    this.lastError = code;
    return value;
  }

  protected errorString(code: string) { return code === "0" ? "No error" : "SCORM runtime error"; }
}

/** SCORM 1.2 browser API, installed by the player as window.API. */
class ScormAPI extends RuntimeDataModel {
  LMSInitialize(_parameter = "") { return this.initialize(); }
  LMSGetValue(name: string) { return this.getValue(name); }
  LMSSetValue(name: string, value: string) { return this.setValue(name, value); }
  LMSCommit(_parameter = "") { return this.commit("commit"); }
  LMSFinish(_parameter = "") {
    return this.finish(this.data["cmi.core.exit"] === "suspend" ? "suspend" : "terminate");
  }
  LMSGetLastError() { return this.lastError; }
  LMSGetErrorString(code: string) { return this.errorString(code); }
  LMSGetDiagnostic(code = this.lastError) { return this.errorString(code); }
}

/** SCORM 2004 browser API, installed by the player as window.API_1484_11. */
export class Scorm2004API extends RuntimeDataModel {
  Initialize(_parameter = "") { return this.initialize(); }
  GetValue(name: string) { return this.getValue(name); }
  SetValue(name: string, value: string) { return this.setValue(name, value); }
  Commit(_parameter = "") { return this.commit("commit"); }
  Terminate(_parameter = "") {
    return this.finish(this.data["cmi.exit"] === "suspend" ? "suspend" : "terminate");
  }
  GetLastError() { return this.lastError; }
  GetErrorString(code: string) { return this.errorString(code); }
  GetDiagnostic(code = this.lastError) { return this.errorString(code); }
}

export const createStudioScormApi = (
  edition: "1.2" | "2004", userId: number, contentId: number, options: StudioAttemptOptions,
) => edition === "1.2"
  ? { API: new ScormAPI(userId, contentId, options) }
  : { API_1484_11: new Scorm2004API(userId, contentId, options) };

export default ScormAPI;
