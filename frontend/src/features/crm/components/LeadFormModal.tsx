import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Briefcase, DollarSign, Globe, Mail, MessageCircle, Phone, Tag, User, Sparkles, FileText } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Modal } from '../../../components/ui/Modal';
import { leadFormSchema, type LeadFormData } from '../schemas/crmSchemas';
import { Lead } from '../types/crm';

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: LeadFormData) => Promise<void>;
  initialData?: Lead | null;
  isLoading?: boolean;
}

export function LeadFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isLoading = false,
}: LeadFormModalProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      whatsapp: '',
      job_title: '',
      website: '',
      source: 'Website',
      status: 'New',
      priority: 'Medium',
      industry: '',
      estimated_value: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        company: initialData.company || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        whatsapp: initialData.whatsapp || '',
        job_title: initialData.job_title || '',
        website: initialData.website || '',
        source: initialData.source || 'Website',
        status: initialData.status || 'New',
        priority: initialData.priority || 'Medium',
        industry: initialData.industry || '',
        estimated_value: initialData.estimated_value || 0,
        notes: initialData.notes || '',
      });
    } else {
      reset({
        name: '',
        company: '',
        email: '',
        phone: '',
        whatsapp: '',
        job_title: '',
        website: '',
        source: 'Website',
        status: 'New',
        priority: 'Medium',
        industry: '',
        estimated_value: 0,
        notes: '',
      });
    }
  }, [initialData, reset, isOpen]);

  const handleFormSubmit = async (data: LeadFormData) => {
    await onSubmit(data);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? 'Edit Lead Details' : 'Add New Lead'}
      size="lg"
      footer={
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="lead-form"
            loading={isLoading}
          >
            {isLoading ? 'Saving…' : initialData ? 'Update Lead' : 'Create Lead'}
          </Button>
        </div>
      }
    >
      <form
        id="lead-form"
        onSubmit={handleSubmit(handleFormSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '65vh', overflowY: 'auto', paddingRight: '4px' }}
      >
        <Input
          label="Lead Name"
          icon={<User size={14} />}
          required
          placeholder="e.g. John Doe / Acme Corp"
          {...register('name')}
          error={errors.name?.message}
        />

        <div className="form-row-2col">
          <Input
            label="Company"
            icon={<Building2 size={14} />}
            placeholder="Company name"
            {...register('company')}
            error={errors.company?.message}
          />
          <Input
            label="Job Title"
            icon={<Briefcase size={14} />}
            placeholder="e.g. Procurement Manager"
            {...register('job_title')}
            error={errors.job_title?.message}
          />
        </div>

        <div className="form-row-2col">
          <Input
            label="Email Address"
            icon={<Mail size={14} />}
            type="email"
            placeholder="john@example.com"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            label="Phone Number"
            icon={<Phone size={14} />}
            placeholder="+91 98765 43210"
            {...register('phone')}
            error={errors.phone?.message}
          />
        </div>

        <div className="form-row-2col">
          <Input
            label="WhatsApp Number"
            icon={<MessageCircle size={14} />}
            placeholder="+91 98765 43210"
            {...register('whatsapp')}
            error={errors.whatsapp?.message}
          />
          <Input
            label="Estimated Value (₹)"
            icon={<DollarSign size={14} />}
            type="number"
            placeholder="50000"
            {...register('estimated_value')}
            error={errors.estimated_value?.message}
          />
        </div>

        <div className="form-row-3col">
          <Select label="Lead Source" icon={<Globe size={14} />} {...register('source')}>
            <option value="Website">Website</option>
            <option value="Referral">Referral</option>
            <option value="Cold Call">Cold Call</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="Campaign">Campaign</option>
            <option value="Other">Other</option>
          </Select>

          <Select label="Pipeline Status" icon={<Sparkles size={14} />} {...register('status')}>
            <option value="New">New</option>
            <option value="Contacted">Contacted</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal Sent</option>
            <option value="Won">Won</option>
            <option value="Lost">Lost</option>
          </Select>

          <Select label="Priority" icon={<Tag size={14} />} {...register('priority')}>
            <option value="Low">Low Priority</option>
            <option value="Medium">Medium Priority</option>
            <option value="High">High Priority</option>
          </Select>
        </div>

        <div className="form-field">
          <label className="form-label">
            <FileText size={14} style={{ color: 'var(--muted)', marginRight: '4px' }} />
            Lead Notes & Details
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Add specific inquiry details or follow-up notes…"
            className="form-textarea"
          />
        </div>
      </form>
    </Modal>
  );
}

