/** Microphone level meter via getUserMedia + AnalyserNode. Returns a stop function. */
export async function startLevelMeter(
  onLevel: (level: number) => void,
  deviceId?: string,
): Promise<() => void> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
  });
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  src.connect(analyser);
  const buf = new Float32Array(analyser.fftSize);
  let raf = 0;
  let last = 0;
  let smooth = 0;
  const loop = (t: number) => {
    raf = requestAnimationFrame(loop);
    if (t - last < 66) return; // ~15fps is plenty for three bars
    last = t;
    analyser.getFloatTimeDomainData(buf);
    let sum = 0;
    for (const v of buf) sum += v * v;
    const rms = Math.sqrt(sum / buf.length);
    const level = Math.min(1, rms * 6);
    smooth = smooth * 0.6 + level * 0.4;
    onLevel(smooth);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    stream.getTracks().forEach((t) => t.stop());
    void ctx.close();
  };
}

export async function listMicrophones(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  const all = await navigator.mediaDevices.enumerateDevices();
  return all.filter((d) => d.kind === "audioinput");
}
