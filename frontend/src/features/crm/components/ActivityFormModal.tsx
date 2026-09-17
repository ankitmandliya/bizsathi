import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import { activityFormSchema, type ActivityFormData } from '../schemas/crmSchemas';

interface ActivityFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ActivityFormData) => Promise<void>;
  isLoading?: boolean;
}

export function ActivityFormModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: ActivityFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: 'Note',
      subject: '',
      description: '',
      due_date: '',
      status: 'pending',
      priority: 'Medium',
    },
  });

  const handleFormSubmit = async (data: ActivityFormData) => {
    await onSubmit(data);
    reset();
    onClose();
  };

  const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Log CRM Activity"
      footer={
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="activity-form" loading={isLoading}>
            {isLoading ? 'Saving…' : 'Log Activity'}
          </Button>
        </div>
      }
    >
      <form
        id="activity-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <div style={twoCol}>
          <Select label="Activity Type" {...register('type')}>
            <option value="Call">Call</option>
            <option value="Meeting">Meeting</option>
            <option value="Email">Email</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Note">Note</option>
            <option value="Task">Task</option>
          </Select>

          <Select label="Priority" {...register('priority')}>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </Select>
        </div>

        <Input
          label="Subject"
          required
          placeholder="e.g. Discussed pricing proposal with client"
          {...register('subject')}
          error={errors.subject?.message}
        />

        <Input
          label="Due Date / Follow-up"
          type="date"
          {...register('due_date')}
          error={errors.due_date?.message}
        />

        <div className="form-field">
          <label className="form-label">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            placeholder="Detailed notes or discussion points…"
            className="form-textarea"
          />
        </div>
      </form>
    </Modal>
  );
}
