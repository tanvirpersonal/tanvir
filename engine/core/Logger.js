/**
 * Logger — leveled, prefixed logging for engine modules.
 *
 *   const log = createLogger("Render");
 *   log.info("context created");      // [Render] context created
 *   Logger.level = "warn";            // global threshold
 *   Logger.level = "silent";          // e.g. in tests
 *
 * The sink defaults to `console` and can be swapped (Logger.sink = {...}) to
 * capture output in tests or route it into an editor console panel.
 */
export const LogLevel = Object.freeze({ debug: 10, info: 20, warn: 30, error: 40, silent: 100 });

export const Logger = {
    level: "info",
    sink: globalThis.console,
};

function enabled(level) {
    return (LogLevel[level] ?? 0) >= (LogLevel[Logger.level] ?? LogLevel.info);
}

export function createLogger(scope = "Engine") {
    const prefix = `[${scope}]`;
    const write = level => (...args) => {
        if (!enabled(level)) return;
        const fn = Logger.sink?.[level] ?? Logger.sink?.log;
        fn?.call(Logger.sink, prefix, ...args);
    };
    return Object.freeze({
        scope,
        debug: write("debug"),
        info: write("info"),
        warn: write("warn"),
        error: write("error"),
        child: sub => createLogger(`${scope}:${sub}`),
    });
}
