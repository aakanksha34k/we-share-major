import { statusLabel, statusTone } from '../utils/borrowStatus';
import './StatusBadge.css';

// kind="request" for borrow requests, kind="item" for listings.
function StatusBadge({ status, kind = 'request' }) {
  return (
    <span className={`ws-badge ws-badge--${statusTone(status, kind)}`}>
      {statusLabel(status, kind)}
    </span>
  );
}

export default StatusBadge;
