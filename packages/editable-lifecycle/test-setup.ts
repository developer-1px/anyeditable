// React 19 act() environment flag — silences "not configured to support act(...)" warning
// when tests synchronously trigger setState outside fireEvent.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
