export function playbackStatus(state) {
  if (!state?.connection) {
    return 'disconnected';
  }

  const status = state.player?.state?.status;

  if (status === 'paused' || status === 'autopaused') {
    return 'paused';
  }

  if (state.loadingNext || status === 'buffering') {
    return 'loading';
  }

  if (status === 'playing' && state.radio) {
    return 'radio';
  }

  if (status === 'playing' && state.current) {
    return 'music';
  }

  return 'standby';
}
