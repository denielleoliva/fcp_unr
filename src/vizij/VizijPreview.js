import React, { useEffect, useMemo, useState } from 'react';
import { VizijRuntimeProvider, VizijRuntimeFace, useVizijRuntime } from '@vizij/runtime-react';
import { inputPath } from './rig';
function Face({ values }) {
  const { ready, loading, error, setInput } = useVizijRuntime();
  useEffect(() => {
    if (ready) Object.entries(values).forEach(([key, value]) => setInput(inputPath(key), { float: value }));
  }, [ready, values, setInput]);
  return <><div className="runtime-status" role="status">{error ? `Vizij error: ${error.message}` : ready ? 'Vizij runtime · ready' : loading ? 'Loading face…' : 'Starting Vizij…'}</div>{ready && <VizijRuntimeFace showSafeArea={false} style={{ width: '100%', height: '100%' }} />}</>;
}
export default function VizijPreview({ blob, values }) {
  const [failure, setFailure] = useState('');
  const assetBundle = useMemo(() => ({ namespace: 'drawing', faceId: 'drawing', glb: { kind: 'blob', blob } }), [blob]);
  if (failure) return <p role="alert">{failure}</p>;
  return <VizijRuntimeProvider assetBundle={assetBundle} autostart onStatusChange={s => { if (s.error) setFailure(s.error.message); }}><Face values={values} /></VizijRuntimeProvider>;
}
