import { auth, admin, csrf } from '../middleware/security.js';
import { clusterEnabled } from '../../cluster/state.js';
import { clusterStatus, setClusterTarget } from '../../cluster/runtime.js';

export function registerClusterRoutes(app) {
  app.get('/api/cluster', auth, admin, async (req, res) => res.json(await clusterStatus()));

  app.post('/api/cluster', auth, admin, csrf, async (req, res) => {
    if (!clusterEnabled()) {
      return res.status(400).json({ error: 'เครื่องนี้ไม่ได้เปิดระบบสำรอง' });
    }

    res.json(await setClusterTarget(req.body.target, req.body.enabled !== false));
  });
}
