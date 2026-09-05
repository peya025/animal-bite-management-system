import { useParams, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/config/routes';
import QueuePatientDetailModal from '../components/QueuePatientDetailModal';

export default function QueuePatientDetailPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();

  return (
    <QueuePatientDetailModal
      open={true}
      queueId={queueId ?? null}
      onClose={() => navigate(ROUTES.QUEUE.DASHBOARD)}
      onSaved={() => navigate(ROUTES.QUEUE.DASHBOARD)}
    />
  );
}
