import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Calendar, DollarSign, FileText, Globe, Percent, Target, User } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import { dealFormSchema, type DealFormData } from '../schemas/crmSchemas';
import { Deal, Lead, PipelineStage } from '../types/crm';

interface DealFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: DealFormData) => Promise<void>;
  stages: PipelineStage[];
  leads?: Lead[];
  initialData?: Deal | null;
  isLoading?: boolean;
}

export function DealFormModal({
  isOpen,
  onClose,
  onSubmit,
  stages,
  leads = [],
  initialData,
  isLoading = false,
}: DealFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: {
      title: '',
      value: 0,
      currency: 'INR',
      stage_id: stages[0]?.id || '',
      lead_id: '',
      probability: stages[0]?.probability || 0,
      expected_closing_date: '',
      notes: '',
    },
  });

  const selectedStageId = watch('stage_id');

  useEffect(() => {
    if (selectedStageId) {
      const match = stages.find((s) => s.id === selectedStageId);
      if (match) setValue('probability', match.probability);
    }
  }, [selectedStageId, stages, setValue]);

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        value: initialData.value || 0,
        currency: initialData.currency || 'INR',
        stage_id: initialData.stage_id || stages[0]?.id || '',
        lead_id: initialData.lead_id || '',
        probability: initialData.probability || 0,
        expected_closing_date: initialData.expected_closing_date
          ? initialData.expected_closing_date.split('T')[0]
          : '',
        notes: initialData.notes || '',
      });
    } else {
      reset({
        title: '',
        value: 0,
        currency: 'INR',
        stage_id: stages[0]?.id || '',
        lead_id: '',
        probability: stages[0]?.probability || 0,
        expected_closing_date: '',
        notes: '',
      });
    }
  }, [initialData, reset, stages, isOpen]);

  const handleFormSubmit = async (data: DealFormData) => {
    await onSubmit(data);
    onClose();
  };

  const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Deal Details' : 'Add New Deal'}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form="deal-form" loading={isLoading}>
            {isLoading ? 'Saving…' : initialData ? 'Update Deal' : 'Create Deal'}
          </Button>
        </div>
      }
    >
      <form
        id="deal-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}
      >
        <Input
          label="Deal Title"
          icon={<Briefcase size={14} />}
          required
          placeholder="e.g. Enterprise Software License"
          {...register('title')}
          error={errors.title?.message}
        />

        <div style={twoCol}>
          <Input
            label="Deal Value (₹)"
            icon={<DollarSign size={14} />}
            type="number"
            {...register('value')}
            error={errors.value?.message}
          />
          <Input
            label="Currency"
            icon={<Globe size={14} />}
            placeholder="INR"
            {...register('currency')}
            error={errors.currency?.message}
          />
        </div>

        <div style={twoCol}>
          <Select
            label="Pipeline Stage"
            icon={<Target size={14} />}
            required
            {...register('stage_id')}
            error={errors.stage_id?.message}
          >
            {stages.map((stg) => (
              <option key={stg.id} value={stg.id}>
                {stg.name} ({stg.probability}%)
              </option>
            ))}
          </Select>

          <Input
            label="Win Probability (%)"
            icon={<Percent size={14} />}
            type="number"
            {...register('probability')}
            error={errors.probability?.message}
          />
        </div>

        <div style={twoCol}>
          <Select label="Linked Lead" icon={<User size={14} />} {...register('lead_id')}>
            <option value="">— None / Select Lead —</option>
            {leads.map((ld) => (
              <option key={ld.id} value={ld.id}>
                {ld.name} {ld.company ? `(${ld.company})` : ''}
              </option>
            ))}
          </Select>

          <Input
            label="Expected Closing Date"
            icon={<Calendar size={14} />}
            type="date"
            {...register('expected_closing_date')}
            error={errors.expected_closing_date?.message}
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            <FileText size={14} style={{ color: 'var(--muted)', marginRight: '4px' }} />
            Deal Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Key deal requirements or notes…"
            className="form-textarea"
          />
        </div>
      </form>
    </Modal>
  );
}

