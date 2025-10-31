type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

function emit(level: LogLevel, ns: string, message: string, ctx?: LogContext) {
  const payload = ctx ? [`[${ns}] ${message}`, ctx] : [`[${ns}] ${message}`];
  switch (level) {
    case 'debug':
      // eslint-disable-next-line no-console
      console.debug.apply(console, payload as any);
      break;
    case 'info':
      // eslint-disable-next-line no-console
      console.info.apply(console, payload as any);
      break;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn.apply(console, payload as any);
      break;
    case 'error':
      // eslint-disable-next-line no-console
      console.error.apply(console, payload as any);
      break;
  }
}

export function logger(namespace: string) {
  return {
    debug: (message: string, ctx?: LogContext) => emit('debug', namespace, message, ctx),
    info: (message: string, ctx?: LogContext) => emit('info', namespace, message, ctx),
    warn: (message: string, ctx?: LogContext) => emit('warn', namespace, message, ctx),
    error: (message: string, ctx?: LogContext) => emit('error', namespace, message, ctx),
    timeStart: (label?: string) => ({ t0: performance.now(), label }),
    timeEnd: (timer: { t0: number; label?: string }, extra?: LogContext) => {
      const durationMs = Math.round(performance.now() - timer.t0);
      emit('debug', namespace, `time: ${timer.label ?? 'op'} ${durationMs}ms`, { durationMs, ...(extra || {}) });
      return durationMs;
    }
  };
}


