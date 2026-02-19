# Railway Deployment - Memory Monitor Verification

## Changes Made for Railway Deployment

1. **Updated Next.js config** - Added `'log'` to the excluded console methods so memory logs aren't stripped
2. **Added version tracking** - Created `memory-monitor-version.ts` with build timestamp
3. **Enhanced logging** - All memory logs now use `console.error()` or `console.warn()` which are never stripped
4. **Build verification script** - Added `.railway-build-verify.sh` to verify code is included

## How to Verify Memory Monitor is Working on Railway

### 1. Check Browser Console
After deployment, open your browser console (F12) and look for:
```
[MemoryMonitor] MODULE LOADED - memory-monitor.ts imported
[MemoryMonitor] Version: 1.0.0
[MemoryMonitor] Build time: [timestamp]
[MemoryMonitor Component] MODULE LOADED - Version: 1.0.0
```

### 2. Check for Memory Logs
You should see periodic logs like:
```
[Memory] Client: MemoryMonitor: Component mounted { heapUsed: X MB, ... }
[Memory] Periodic: Memory check { heapUsed: X MB, ... }
```

### 3. If Logs Don't Appear

#### Option A: Force Clear Railway Cache
1. In Railway dashboard, go to your service
2. Click "Settings" → "Clear Build Cache"
3. Redeploy

#### Option B: Add Environment Variable
In Railway dashboard → Variables, add:
```
ENABLE_MEMORY_LOGGING=true
```

#### Option C: Verify Build
Check Railway build logs for:
- `[MemoryMonitor] MODULE LOADED` messages
- No errors importing memory-monitor files
- Build completes successfully

### 4. Check Server Logs
Memory logs also appear in Railway server logs. Check:
- Railway Dashboard → Deployments → View Logs
- Look for `[Memory] Server:` prefixed logs

## Troubleshooting

### If you see "MODULE LOADED" but no memory stats:
- Browser might not support `performance.memory` API (Chrome/Edge only)
- Check if you're in production mode (memory API may be restricted)

### If you see nothing at all:
1. Verify the code was committed and pushed
2. Check Railway build logs for errors
3. Clear Railway build cache and redeploy
4. Verify `MemoryMonitor` component is in `src/app/layout.tsx`

### To Force Enable Logging:
Add to Railway environment variables:
```
ENABLE_MEMORY_LOGGING=true
MEMORY_LOG_INTERVAL_MS=30000
```

### Memory warning thresholds (optional)
To reduce log noise in production, you can raise when warnings are emitted:
```
MEMORY_RSS_WARNING_MB=900       # Warn when process RSS exceeds this (MB). Default: 900
MEMORY_DELTA_WARNING_MB=25     # Warn when heap grows by this much between checks (MB). Default: 25
MEMORY_EXTERNAL_WARNING_MB=60  # Warn when external memory (buffers/images) exceeds this (MB). Default: 60
```
Lower these values if you want earlier warnings for potential leaks.

## Expected Behavior

- **Development**: Logs every 30 seconds automatically
- **Production**: Logs only if `ENABLE_MEMORY_LOGGING=true` is set
- **High Memory**: Automatically logs warnings when memory > 500MB
- **Memory Growth**: Warns when memory grows > 5MB between checks
