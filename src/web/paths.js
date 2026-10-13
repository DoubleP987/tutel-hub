import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const controlBasePath = (process.env.CONTROL_BASE_PATH || '').replace(/\/$/, '');
if (controlBasePath && !/^\/[a-zA-Z0-9_-]+$/.test(controlBasePath)) {
  throw new Error('CONTROL_BASE_PATH must be one safe path segment');
}
export const controlPath = (path) => controlBasePath + path;
export const panelHome = () => (controlBasePath ? controlPath('/') : '/admin');

export async function sendPanelHtml(res, publicPath, filename) {
  let html = await readFile(resolve(publicPath, filename), 'utf8');
  html = html.replace(/(src|href|action)="\/(?!\/)/g, `$1="${controlBasePath}/`);
  html = html.replace('<head>', `<head><script src="${controlPath('/panel-base.js')}"></script>`);
  res.type('html').send(html);
}
