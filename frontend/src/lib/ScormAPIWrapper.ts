import axios from "axios";
import { resolveApiBaseUrl } from "./apiBaseUrl";

interface ScormData {
    [key: string]: string;
}

class ScormAPI {
    private data: ScormData = {};
    private initialized = false;
    private userId: number;
    private contentId: number;

    constructor(userId: number, contentId: number) {
        this.userId = userId;
        this.contentId = contentId;
    }

    // --- SCORM 1.2 Required Methods ---

    LMSInitialize() {
        if (this.initialized) return "true";
        this.initialized = true;
        console.log("✅ SCORM Initialized");
        return "true";
    }

    LMSSetValue(name: string, value: string) {
        if (!this.initialized) {
            console.warn("⚠️ SCORM not initialized");
            return "false";
        }
        console.log(`📥 SetValue: ${name} = ${value}`);
        this.data[name] = value;
        return "true";
    }

    LMSGetValue(name: string) {
        const value = this.data[name] || "";
        console.log(`📤 GetValue: ${name} = ${value}`);
        return value;
    }

    LMSCommit(baseUrl?: string) {
        if (!this.initialized) return "false";
        console.log("💾 Committing SCORM Data:", this.data);

        const resolvedBaseUrl =
            baseUrl ||
            resolveApiBaseUrl();
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        return axios
            .post(`${resolvedBaseUrl}/api/scorm/commit`, {
                userId: this.userId,
                contentId: this.contentId,
                data: this.data,
                attemptNo: 1,
            }, { headers })
            .then(() => {
                console.log("✅ SCORM data committed successfully");
                return "true";
            })
            .catch((error) => {
                console.error("❌ Failed to commit SCORM data:", error);
                return "false";
            });
    }

    LMSFinish() {
        console.log("🏁 SCORM Session Finished");
        this.LMSCommit();
        this.initialized = false;
        return "true";
    }

    LMSGetLastError() {
        return "0";
    }

    LMSGetErrorString() {
        return "No error";
    }

    LMSGetDiagnostic() {
        return "No diagnostic information available";
    }
}

export default ScormAPI;
