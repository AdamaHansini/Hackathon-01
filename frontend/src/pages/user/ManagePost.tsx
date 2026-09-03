import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../../api/postsApi';
import { Skeleton } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { toast } from '../../store/useToastStore';
import { AlertCircle, Handshake, ShieldCheck, RefreshCcw, X } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = [
  { label: 'Select Category', value: '' },
  { label: 'Electronics', value: 'Electronics' },
  { label: 'Documents', value: 'Documents' },
  { label: 'Wallet', value: 'Wallet' },
  { label: 'Keys', value: 'Keys' },
  { label: 'Bags', value: 'Bags' },
  { label: 'Jewelry', value: 'Jewelry' },
  { label: 'Clothing', value: 'Clothing' },
  { label: 'Pets', value: 'Pets' },
  { label: 'Other', value: 'Other' },
];

const VISIBILITY_OPTIONS = [
  { label: 'Public', value: 'PUBLIC' },
  { label: 'Private', value: 'PRIVATE' },
];

export const ManagePost: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [showEditModal, setShowEditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['manage-post', id],
    queryFn: () => postsApi.getPost(id!),
    enabled: !!id,
  });

  const { data: claimsData } = useQuery({
    queryKey: ['post-claims', id],
    queryFn: () => postsApi.getPostClaims(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data?.data?.post) {
    return (
      <div className="space-y-6">
        <ErrorState message={(error as any)?.message || 'Post not found'} onRetry={refetch} />
      </div>
    );
  }

  const post = data.data.post;
  const isLost = post.type === 'LOST';

  const openEditModal = () => {
    setEditForm({
      itemName: post.itemName || '',
      category: post.category || '',
      publicDescription: post.publicDescription || '',
      color: post.color || '',
      brand: post.brand || '',
      publicCharacteristics: (post.publicCharacteristics || []).join(', '),
      lostOrFoundDate: post.lostOrFoundDate
        ? format(new Date(post.lostOrFoundDate), 'yyyy-MM-dd')
        : '',
      lostOrFoundTime: post.lostOrFoundTime || '',
      locationName: post.locationName || '',
      city: post.city || '',
      visibility: post.visibility || 'PUBLIC',
    });
    setShowEditModal(true);
  };

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!editForm.itemName?.trim()) {
      toast.error('Item name is required');
      return;
    }
    if (!editForm.category) {
      toast.error('Category is required');
      return;
    }
    if (!editForm.publicDescription?.trim() || editForm.publicDescription.trim().length < 10) {
      toast.error('Public description must be at least 10 characters');
      return;
    }
    if (!editForm.lostOrFoundDate) {
      toast.error('Date is required');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        itemName: editForm.itemName.trim(),
        category: editForm.category,
        publicDescription: editForm.publicDescription.trim(),
        color: editForm.color?.trim() || undefined,
        brand: editForm.brand?.trim() || undefined,
        publicCharacteristics: editForm.publicCharacteristics
          ? editForm.publicCharacteristics.split(',').map((c: string) => c.trim()).filter(Boolean)
          : [],
        lostOrFoundDate: editForm.lostOrFoundDate,
        lostOrFoundTime: editForm.lostOrFoundTime || undefined,
        locationName: editForm.locationName?.trim() || undefined,
        city: editForm.city?.trim() || undefined,
        visibility: editForm.visibility,
      };

      await postsApi.updatePost(id!, payload);
      toast.success('Post updated successfully!');
      setShowEditModal(false);
      // Invalidate cache so the page re-fetches fresh data
      queryClient.invalidateQueries({ queryKey: ['manage-post', id] });
      queryClient.invalidateQueries({ queryKey: ['my-posts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update post');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                  isLost
                    ? 'border-error/20 bg-error/5 text-error'
                    : 'border-success/20 bg-success/5 text-success'
                }`}
              >
                {post.type}
              </span>
              <StatusBadge status={post.status} />
            </div>
            <h1 className="text-2xl font-bold text-dark-text">{post.itemName}</h1>
            <p className="text-sm text-muted-text mt-1">
              Reported on {format(new Date(post.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={openEditModal}>
              Edit Post
            </Button>
            <Link to={`/posts/${post._id}`}>
              <Button variant="outline" size="sm">
                View Public Page
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Post details */}
            <div className="bg-surface border border-taupe-border rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-dark-text">Post Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-text font-medium mb-1">Category</p>
                  <p className="text-dark-text">{post.category}</p>
                </div>
                {post.color && (
                  <div>
                    <p className="text-muted-text font-medium mb-1">Color</p>
                    <p className="text-dark-text">{post.color}</p>
                  </div>
                )}
                {post.brand && (
                  <div>
                    <p className="text-muted-text font-medium mb-1">Brand</p>
                    <p className="text-dark-text">{post.brand}</p>
                  </div>
                )}
                {post.city && (
                  <div>
                    <p className="text-muted-text font-medium mb-1">City</p>
                    <p className="text-dark-text capitalize">{post.city}</p>
                  </div>
                )}
                {post.locationName && (
                  <div className="sm:col-span-2">
                    <p className="text-muted-text font-medium mb-1">Location</p>
                    <p className="text-dark-text">{post.locationName}</p>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <p className="text-muted-text font-medium mb-1">Description</p>
                  <p className="text-dark-text">{post.publicDescription}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-taupe-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Post Status</h2>

              <div className="bg-light-beige rounded-lg p-4 flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shrink-0 border border-taupe-border">
                  {post.status === 'ACTIVE' && <RefreshCcw className="h-5 w-5 text-blue-600" />}
                  {post.status === 'MATCHED' && <Handshake className="h-5 w-5 text-warning" />}
                  {post.status === 'CLAIMED' && <AlertCircle className="h-5 w-5 text-indigo-600" />}
                  {post.status === 'VERIFIED' && <ShieldCheck className="h-5 w-5 text-success" />}
                </div>

                <div>
                  <h3 className="font-semibold text-dark-text mb-1">
                    {post.status === 'ACTIVE' && 'Your post is active'}
                    {post.status === 'MATCHED' && 'Potential matches found'}
                    {post.status === 'CLAIMED' && 'Someone has claimed this item'}
                    {post.status === 'VERIFIED' && 'Claim verified'}
                  </h3>
                  <p className="text-sm text-muted-text mb-3">
                    {post.status === 'ACTIVE' &&
                      'We are actively looking for matches. You can also review incoming claims manually.'}
                    {post.status === 'MATCHED' && 'Check your smart matches to review suggestions.'}
                    {post.status === 'CLAIMED' && 'Review the claims below and verify ownership.'}
                  </p>

                  {post.status === 'ACTIVE' && (
                    <Link to="/matches">
                      <Button size="sm">View Matches</Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-surface border border-taupe-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Verification Questions</h2>
              <p className="text-sm text-muted-text mb-4">
                {isLost
                  ? 'Add questions that only the true finder would know (e.g., "What color is the case?").'
                  : 'Add questions that only the true owner would know (e.g., "What is the lock screen wallpaper?").'}
              </p>

              <div className="bg-light-beige border border-dashed border-taupe-border rounded-lg p-8 flex flex-col items-center justify-center text-center">
                <ShieldCheck className="h-8 w-8 text-muted-text/50 mb-3" />
                <p className="text-sm font-medium text-dark-text mb-1">
                  No verification questions added
                </p>
                <p className="text-xs text-muted-text mb-4">
                  Adding questions helps prevent fraudulent claims.
                </p>
                <Button variant="secondary" size="sm">
                  Add Question
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-surface border border-taupe-border rounded-xl p-6">
              <h2 className="text-lg font-semibold text-dark-text mb-4">Incoming Claims</h2>

              {claimsData?.data?.items && claimsData.data.items.length > 0 ? (
                <div className="space-y-3">
                  {claimsData.data.items.map((claim: any) => (
                    <div
                      key={claim._id}
                      className="border border-taupe-border rounded-lg p-3 hover:bg-light-beige transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium text-dark-text">
                          Claim #{claim._id.substring(claim._id.length - 6)}
                        </span>
                        <StatusBadge status={claim.status} />
                      </div>
                      <Link to={`/claims/${claim._id}`}>
                        <Button variant="ghost" size="sm" className="w-full text-xs mt-2">
                          Review Claim
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-text text-sm">
                  No claims have been made on this item yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-surface rounded-2xl border border-taupe-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-taupe-border sticky top-0 bg-surface z-10">
              <div>
                <h2 className="text-xl font-bold text-dark-text">Edit Post</h2>
                <p className="text-sm text-muted-text mt-0.5">Update the details of your report</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-lg hover:bg-light-beige transition-colors text-muted-text hover:text-dark-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wider">
                  Basic Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Item Name"
                    value={editForm.itemName}
                    onChange={(e) => handleEditChange('itemName', e.target.value)}
                    placeholder="e.g. iPhone 13 Pro"
                  />
                  <Select
                    label="Category"
                    options={CATEGORIES}
                    value={editForm.category}
                    onChange={(e) => handleEditChange('category', e.target.value)}
                  />
                </div>

                <Textarea
                  label="Public Description"
                  value={editForm.publicDescription}
                  onChange={(e) => handleEditChange('publicDescription', e.target.value)}
                  rows={4}
                  placeholder="Describe the item publicly..."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Color"
                    value={editForm.color}
                    onChange={(e) => handleEditChange('color', e.target.value)}
                    placeholder="e.g. Black"
                  />
                  <Input
                    label="Brand"
                    value={editForm.brand}
                    onChange={(e) => handleEditChange('brand', e.target.value)}
                    placeholder="e.g. Apple"
                  />
                </div>

                <Input
                  label="Public Characteristics (comma-separated)"
                  value={editForm.publicCharacteristics}
                  onChange={(e) => handleEditChange('publicCharacteristics', e.target.value)}
                  placeholder="e.g. scratch on screen, red case"
                />
              </div>

              {/* When & Where */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wider">
                  When &amp; Where
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    type="date"
                    label={`Date ${post.type === 'LOST' ? 'Lost' : 'Found'}`}
                    value={editForm.lostOrFoundDate}
                    onChange={(e) => handleEditChange('lostOrFoundDate', e.target.value)}
                  />
                  <Input
                    type="time"
                    label={`Time ${post.type === 'LOST' ? 'Lost' : 'Found'}`}
                    value={editForm.lostOrFoundTime}
                    onChange={(e) => handleEditChange('lostOrFoundTime', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Location Name"
                    value={editForm.locationName}
                    onChange={(e) => handleEditChange('locationName', e.target.value)}
                    placeholder="e.g. Central Library"
                  />
                  <Input
                    label="City"
                    value={editForm.city}
                    onChange={(e) => handleEditChange('city', e.target.value)}
                    placeholder="e.g. Hyderabad"
                  />
                </div>
              </div>

              {/* Visibility */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wider">
                  Visibility
                </h3>
                <Select
                  label="Who can see this post?"
                  options={VISIBILITY_OPTIONS}
                  value={editForm.visibility}
                  onChange={(e) => handleEditChange('visibility', e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-taupe-border sticky bottom-0 bg-surface">
              <Button variant="ghost" onClick={() => setShowEditModal(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} isLoading={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
