import React, { useEffect, useRef, useState } from "react";
import ScormAPI from "@/lib/ScormAPIWrapper";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { resolveApiBaseUrl } from "@/lib/apiBaseUrl";


interface Props {
    contentUrl: string;  // "8/1762712441564/res/index.html"
    contentId: number;
}

const ScormPlayer: React.FC<Props> = ({ contentUrl, contentId }) => {
    const { user } = useAuth();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [proxyUrl, setProxyUrl] = useState<string>("");
    const [isLandscape, setIsLandscape] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(orientation: landscape)");
        const updateOrientation = () => {
            setIsLandscape(mediaQuery.matches);
        };

        updateOrientation();
        mediaQuery.addEventListener("change", updateOrientation);
        window.addEventListener("resize", updateOrientation);

        return () => {
            mediaQuery.removeEventListener("change", updateOrientation);
            window.removeEventListener("resize", updateOrientation);
        };
    }, []);

    useEffect(() => {
        if (!user || !contentUrl) return;

        // âœ… Initialize SCORM API (must be global!)
        const api = new ScormAPI(user.id, contentId);
        const windowWithApi = window as Window & { API?: ScormAPI };
        windowWithApi.API = api;

        // âœ… Fix any double slashes in contentUrl
        const cleanPath = contentUrl.replace(/^\/+/, "");

        // âœ… Build proxy URL for backend
        const backendBase = resolveApiBaseUrl();

        const accessToken = localStorage.getItem("token");
        if (!accessToken) {
            setProxyUrl("");
            return;
        }

        const finalUrl = `${backendBase}/api/scorm/launch/${encodeURIComponent(accessToken)}/${cleanPath}`;

        setProxyUrl(finalUrl);

        return () => {
            api.LMSFinish();
            delete windowWithApi.API;
        };
    }, [user, contentUrl, contentId, isLandscape]);

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-50">
            <div className={`shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 md:hidden ${isLandscape ? "hidden" : ""}`}>
                For the best experience, rotate your device to landscape.
            </div>
            {proxyUrl ? (
                <div className="min-h-0 flex-1 overflow-hidden">
                    <iframe
                        ref={iframeRef}
                        src={proxyUrl}
                        title="SCORM Content"
                        className="h-full w-full border-none bg-white"
                        allow="fullscreen"
                    />
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center px-4">
                    <p className="text-sm text-slate-600 md:text-base">Loading SCORM content...</p>
                </div>
            )}
        </div>
    );
};

export default ScormPlayer;

