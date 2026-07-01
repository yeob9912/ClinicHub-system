"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, X, Loader2 } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function getAuthHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...getAuthHeader(), ...(opts.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message ?? "Request failed");
  return json;
}

interface ActiveCall {
  _id: string;
  caller_id:    { _id: string; full_name: string; avatar_url?: string };
  recipient_id: { _id: string; full_name: string; avatar_url?: string };
  status: "ringing" | "accepted" | "rejected" | "ended" | "missed";
  type: "video" | "audio";
}

export default function CallOverlay() {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn]       = useState(true);
  const [responding, setResponding] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUserId  = typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  // ── Poll every 3 s for active/incoming call ─────────────────────────────────
  const poll = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;
      const res = await apiFetch("/calls/active");
      const call = res.data as ActiveCall | null;
      setActiveCall((prev) => {
        if (!call) return null;
        if (prev?._id === call._id && prev?.status === call.status) return prev;
        return call;
      });
    } catch {
      // silent — user may not be logged in
    }
  }, []);

  useEffect(() => {
    pollRef.current = setInterval(poll, 3000);
    poll();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  // ── Duration counter when call is accepted ──────────────────────────────────
  useEffect(() => {
    if (activeCall?.status === "accepted") {
      setCallDuration(0);
      durationRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
    } else {
      if (durationRef.current) clearInterval(durationRef.current);
    }
    return () => { if (durationRef.current) clearInterval(durationRef.current); };
  }, [activeCall?.status]);

  // ── Start camera when call accepted ─────────────────────────────────────────
  useEffect(() => {
    if (activeCall?.status === "accepted" && activeCall.type === "video") {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        })
        .catch(() => {});
    } else if (activeCall?.status !== "accepted") {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
        setLocalStream(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCall?.status]);

  const formatDuration = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const respond = async (action: "accept" | "reject") => {
    if (!activeCall) return;
    setResponding(true);
    try {
      await apiFetch(`/calls/${activeCall._id}/respond`, {
        method: "PATCH",
        body: JSON.stringify({ action }),
      });
      if (action === "reject") setActiveCall(null);
    } catch { /* silent */ } finally {
      setResponding(false);
    }
  };

  const endCall = async () => {
    if (!activeCall) return;
    try {
      await apiFetch(`/calls/${activeCall._id}/end`, { method: "PATCH" });
    } catch { /* silent */ }
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
    setActiveCall(null);
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => { t.enabled = !cameraOn; });
      setCameraOn((v) => !v);
    }
  };

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => { t.enabled = !micOn; });
      setMicOn((v) => !v);
    }
  };

  // Determine if this user is the recipient (show incoming UI)
  const isIncoming = activeCall?.recipient_id?._id === currentUserId || activeCall?.recipient_id === currentUserId as any;
  const isRinging  = activeCall?.status === "ringing";
  const isAccepted = activeCall?.status === "accepted";
  const callerName = activeCall
    ? isIncoming
      ? activeCall.caller_id?.full_name
      : activeCall.recipient_id?.full_name
    : "";

  if (!activeCall || (activeCall.status !== "ringing" && activeCall.status !== "accepted")) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="call-overlay"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", bounce: 0.25 }}
        className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md"
      >
        {/* ── Active Call UI ─────────────────────────────────────────── */}
        {isAccepted && (
          <div className="relative w-full max-w-2xl mx-4 rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl border border-white/10" style={{ height: "min(520px, 85vh)" }}>
            {/* Remote camera placeholder */}
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* When no remote stream yet, show avatar */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-full bg-[#24D2A6]/20 flex items-center justify-center text-[#24D2A6] text-4xl font-black border-4 border-[#24D2A6]/30">
                  {callerName?.charAt(0)}
                </div>
                <p className="text-white text-xl font-bold">{callerName}</p>
                <p className="text-white/50 text-sm font-mono">{formatDuration(callDuration)}</p>
              </div>
            </div>

            {/* Local camera PiP */}
            <div className="absolute top-4 right-4 w-32 h-24 rounded-2xl overflow-hidden bg-slate-700 border-2 border-white/20 shadow-xl">
              {cameraOn ? (
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                  <VideoOff size={24} className="text-slate-400" />
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4">
              <button onClick={toggleMic} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}>
                {micOn ? <Mic size={22} /> : <MicOff size={22} />}
              </button>
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-xl transition-all hover:scale-110">
                <PhoneOff size={26} />
              </button>
              <button onClick={toggleCamera} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-lg ${cameraOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-rose-500 text-white"}`}>
                {cameraOn ? <Video size={22} /> : <VideoOff size={22} />}
              </button>
            </div>
          </div>
        )}

        {/* ── Incoming Ringing UI ────────────────────────────────────── */}
        {isRinging && isIncoming && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-sm mx-4 shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-br from-[#24D2A6] to-teal-500 p-8 text-center">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-black mx-auto mb-4 border-4 border-white/30 shadow-inner">
                {callerName?.charAt(0)}
              </div>
              <p className="text-white/70 text-sm font-bold uppercase tracking-widest mb-1">Incoming Video Call</p>
              <h2 className="text-white text-2xl font-black">{callerName}</h2>
              {/* Pulsing ring animation */}
              <div className="flex justify-center mt-4 gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
                ))}
              </div>
            </div>
            <div className="p-6 flex gap-4">
              <button
                onClick={() => respond("reject")}
                disabled={responding}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-500 transition-all active:scale-95"
              >
                <div className="w-12 h-12 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg">
                  <PhoneOff size={22} />
                </div>
                <span className="text-xs font-black uppercase tracking-wider">Decline</span>
              </button>
              <button
                onClick={() => respond("accept")}
                disabled={responding}
                className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-[#24D2A6]/10 hover:bg-[#24D2A6]/20 text-[#24D2A6] transition-all active:scale-95"
              >
                {responding ? (
                  <div className="w-12 h-12 bg-[#24D2A6] rounded-full flex items-center justify-center text-white shadow-lg">
                    <Loader2 size={22} className="animate-spin" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-[#24D2A6] rounded-full flex items-center justify-center text-white shadow-lg shadow-[#24D2A6]/40">
                    <Phone size={22} />
                  </div>
                )}
                <span className="text-xs font-black uppercase tracking-wider">Accept</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Outgoing Ringing UI ────────────────────────────────────── */}
        {isRinging && !isIncoming && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white rounded-[2.5rem] w-full max-w-sm mx-4 shadow-2xl p-8 text-center"
          >
            <div className="w-24 h-24 rounded-full bg-[#24D2A6]/10 flex items-center justify-center text-[#24D2A6] text-4xl font-black mx-auto mb-4 border-4 border-[#24D2A6]/20 relative">
              {callerName?.charAt(0)}
              <span className="absolute inset-0 rounded-full border-4 border-[#24D2A6]/30 animate-ping" />
            </div>
            <p className="text-slate-400 text-sm font-bold mb-2">Calling…</p>
            <h2 className="text-slate-900 text-2xl font-black mb-8">{callerName}</h2>
            <button
              onClick={endCall}
              className="w-14 h-14 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center mx-auto shadow-xl transition-all hover:scale-110"
            >
              <PhoneOff size={24} />
            </button>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
