import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { tauriInvoke } from '@/lib/tauri';
import {
  Camera, CameraOff, Save, RotateCcw, FileImage, CheckCircle, ShieldAlert,
} from 'lucide-react';

type ScanState = 'idle' | 'scanning' | 'detected' | 'saving';

const REMARKS = [
  { code: 'package_ok', label: 'Package OK' },
  { code: 'damaged', label: 'Damaged' },
  { code: 'waybill_unclear', label: 'Waybill unclear' },
  { code: 'opened', label: 'Package opened' },
  { code: 'wrong_item', label: 'Wrong item' },
  { code: 'customer_refused', label: 'Customer refused' },
  { code: 'rts_label_missing', label: 'RTS label missing' },
  { code: 'supervisor_review', label: 'Supervisor review' },
  { code: 'other', label: 'Other' },
];

const COURIERS = ['J&T', 'J&T International', 'Flash', 'LBC', 'Other'];

function dataUrlToBase64(dataUrl: string): string {
  const idx = dataUrl.indexOf(',');
  return idx > -1 ? dataUrl.slice(idx + 1) : dataUrl;
}

export function RTSScanPage() {
  const { user } = useAuthStore();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [cameraOn, setCameraOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [waybill, setWaybill] = useState('');
  const [courier, setCourier] = useState('J&T');
  const [branch, setBranch] = useState('Main Warehouse');
  const [remarkCode, setRemarkCode] = useState('');
  const [remarkText, setRemarkText] = useState('');
  const [duplicate, setDuplicate] = useState<{ waybill: string; staff_name?: string; scanned_at?: string } | null>(null);
  const [lastScan, setLastScan] = useState<{ waybill: string; time: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [staffList, setStaffList] = useState<{ id: number; full_name: string }[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<number>(user?.id ?? 1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  async function loadStaff() {
    try {
      const users = await tauriInvoke<{ id: number; full_name: string; status: string }[]>('get_users');
      const active = users.filter((u) => u.status === 'active');
      setStaffList(active.length ? active : users);
      if (user && active.find((u) => u.id === user.id)) {
        setSelectedStaff(user.id);
      }
    } catch {
      if (user) setStaffList([{ id: user.id, full_name: user.full_name }]);
    }
  }

  const startCamera = useCallback(async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      setStream(s);
      setCameraOn(true);
    } catch (e) {
      showToast('Camera error: ' + String(e), 'error');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setCameraOn(false);
  }, [stream]);

  function capturePhoto() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || !v.videoWidth) return;
    const scale = Math.min(1, 1280 / v.videoWidth);
    c.width = Math.round(v.videoWidth * scale);
    c.height = Math.round(v.videoHeight * scale);
    c.getContext('2d')?.drawImage(v, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    setScanState('detected');
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
      setScanState('detected');
    };
    reader.readAsDataURL(file);
  }

  function showToast(message: string, type: 'success' | 'error' | 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave() {
    const wb = waybill.trim().toUpperCase();
    if (!wb) { showToast('Enter waybill number', 'error'); return; }
    if (!capturedImage) { showToast('Capture or upload a photo', 'error'); return; }

    setScanState('saving');
    try {
      const recordId = await tauriInvoke<number>('save_rts_record', {
        record: {
          waybill_number: wb,
          courier,
          staff_id: selectedStaff,
          branch,
          scan_method: cameraOn ? 'camera' : 'manual',
          duplicate_flag: false,
          remarks: '',
          remark_code: remarkCode,
          remark_text: remarkText.trim(),
        },
      });

      await tauriInvoke('add_rts_scan_log', {
        log: {
          waybill_number: wb,
          staff_id: selectedStaff,
          action: cameraOn ? 'scanned' : 'manual_scanned',
          device_info: navigator.userAgent,
          ip_address: '',
          location: branch,
        },
      });

      const base64 = dataUrlToBase64(capturedImage);
      const isVideo = capturedImage.startsWith('data:video');
      await tauriInvoke('upload_rts_photo', {
        payload: {
          rts_record_id: recordId,
          waybill_number: wb,
          photo_type: isVideo ? 'video_proof' : 'scan_proof',
          file_name: isVideo ? `${wb}_proof.webm` : `${wb}_proof.jpg`,
          mime_type: isVideo ? 'video/webm' : 'image/jpeg',
          base64_data: base64,
          duration_seconds: null,
          uploaded_by: selectedStaff,
        },
      });

      showToast(`Saved: ${wb}`, 'success');
      setLastScan({ waybill: wb, time: new Date().toLocaleTimeString() });
      resetForm();
    } catch (err) {
      showToast('Error: ' + String(err), 'error');
      setScanState('detected');
    }
  }

  async function checkWaybillDuplicate() {
    const wb = waybill.trim().toUpperCase();
    if (!wb) return;
    try {
      const dup = await tauriInvoke<{ waybill_number: string; staff_name?: string; scanned_at?: string } | null>('get_rts_record_by_waybill', { waybill: wb });
      if (dup) {
        setDuplicate({ waybill: dup.waybill_number, staff_name: dup.staff_name, scanned_at: dup.scanned_at });
      } else {
        setDuplicate(null);
      }
    } catch {
      setDuplicate(null);
    }
  }

  function resetForm() {
    setWaybill('');
    setCapturedImage(null);
    setScanState('idle');
    setDuplicate(null);
    setRemarkCode('');
    setRemarkText('');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">RTS Fast Scan</h2>
        <p className="text-muted-foreground">Scan waybills with camera proof and remark tagging.</p>
      </div>

      {/* Camera / Preview */}
      <div className="relative overflow-hidden rounded-xl border bg-black" style={{ aspectRatio: '4/3', maxHeight: 420 }}>
        {cameraOn ? (
          <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        ) : capturedImage ? (
          <img src={capturedImage} alt="Captured" className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full items-center justify-center text-white/70">
            <div className="text-center">
              <Camera size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Camera off — tap Start Camera</p>
            </div>
          </div>
        )}

        {/* Overlay controls */}
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-3">
          {cameraOn && scanState !== 'saving' && (
            <button onClick={capturePhoto} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90">
              <Camera size={16} className="inline mr-1" /> Capture
            </button>
          )}
          <div className="flex gap-2">
            {cameraOn ? (
              <button onClick={stopCamera} className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500">
                <CameraOff size={14} className="inline mr-1" /> Stop
              </button>
            ) : (
              <button onClick={startCamera} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                <Camera size={14} className="inline mr-1" /> Start Camera
              </button>
            )}
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Form Panel */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Waybill</label>
            <input
              type="text"
              value={waybill}
              onChange={(e) => setWaybill(e.target.value.toUpperCase())}
              onBlur={checkWaybillDuplicate}
              placeholder="WAYBILL NUMBER"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-lg font-bold uppercase tracking-wide outline-none focus:ring-2 focus:ring-ring"
            />
            {duplicate && (
              <div className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                <ShieldAlert size={12} />
                Already scanned by {duplicate.staff_name || 'unknown'} on {duplicate.scanned_at ? new Date(duplicate.scanned_at).toLocaleDateString() : 'unknown date'}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Courier</label>
            <select value={courier} onChange={(e) => setCourier(e.target.value)} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              {COURIERS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Branch</label>
            <input
              type="text" value={branch} onChange={(e) => setBranch(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-muted-foreground">Staff</label>
            <select value={selectedStaff} onChange={(e) => setSelectedStaff(Number(e.target.value))} className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring">
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        </div>

        {/* Remarks */}
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase text-muted-foreground">Remarks</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {REMARKS.map((r) => (
              <button
                key={r.code}
                onClick={() => setRemarkCode((prev) => (prev === r.code ? '' : r.code))}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  remarkCode === r.code
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground hover:bg-accent'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <textarea
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            placeholder="Optional custom note..."
            rows={2}
            className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={scanState === 'saving' || !waybill.trim()}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            <Save size={16} />
            {scanState === 'saving' ? 'Saving…' : 'Save Record'}
          </button>
          <button
            onClick={resetForm}
            className="flex items-center gap-2 rounded-md border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent">
            <FileImage size={16} /> Upload File
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      </div>

      {/* Last Scan */}
      {lastScan && (
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 text-sm shadow-sm">
          <CheckCircle size={16} className="text-emerald-600" />
          <span className="font-semibold">{lastScan.waybill}</span>
          <span className="text-muted-foreground">saved at {lastScan.time}</span>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-xl transition-transform ${
          toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
